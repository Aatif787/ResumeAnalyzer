/**
 * ResumeAI Parser — Client-side file parsing module
 * Supports PDF (PDF.js), DOCX (Mammoth.js), and TXT
 */

// ── Parse Resume File ──────────────────────────────────────────
async function parseResumeFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
        return await parsePDF(file);
    } else if (ext === 'docx' || ext === 'doc') {
        return await parseDOCX(file);
    } else if (ext === 'txt') {
        return await parseTXT(file);
    } else {
        throw new Error(`Unsupported file format: .${ext}`);
    }
}

// ── PDF Parsing ────────────────────────────────────────────────
async function parsePDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const typedArray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
                let fullText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }

                resolve(fullText.trim());
            } catch (err) {
                reject(new Error('Failed to parse PDF: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// ── DOCX Parsing ────────────────────────────────────────────────
async function parseDOCX(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const result = await mammoth.extractRawText({
                    arrayBuffer: e.target.result
                });
                resolve(result.value.trim());
            } catch (err) {
                reject(new Error('Failed to parse DOCX: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// ── TXT Parsing ─────────────────────────────────────────────────
async function parseTXT(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result.trim());
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file, 'UTF-8');
    });
}

// ── Data Extraction ─────────────────────────────────────────────
function extractResumeData(text) {
    return {
        rawText: text,
        contact: extractContact(text),
        summary: extractSection(text, /(?:professional\s+)?(?:summary|profile|objective|about\s*me)/i),
        experience: extractExperience(text),
        education: extractEducation(text),
        skills: extractSkills(text),
        keywords: extractKeywords(text),
        wordCount: text.split(/\s+/).filter(w => w).length,
        length: text.length
    };
}

function extractContact(text) {
    return {
        email: (text.match(/[\w.-]+@[\w.-]+\.\w+/) || [null])[0],
        phone: (text.match(/[\+]?[\d\s\(\)\-\.]{10,}/) || [null])[0],
        linkedin: (text.match(/linkedin\.com\/in\/[\w-]+/) || [null])[0],
        website: (text.match(/https?:\/\/(?!linkedin)[^\s]+/) || [null])[0]
    };
}

function extractSection(text, headerPattern) {
    const lines = text.split('\n');
    let capturing = false;
    let content = [];

    for (const line of lines) {
        if (headerPattern.test(line.trim())) {
            capturing = true;
            continue;
        }
        if (capturing) {
            // Stop at next section header
            if (/^(?:experience|education|skills|projects|certifications|awards|work|employment)/i.test(line.trim()) && content.length > 0) {
                break;
            }
            if (line.trim()) content.push(line.trim());
        }
    }
    return content.length > 0 ? content.join('\n') : null;
}

function extractExperience(text) {
    const section = extractSection(text, /(?:work\s+)?(?:experience|employment|professional\s+experience|work\s+history)/i);
    if (!section) return null;

    const lines = section.split('\n');
    const bulletLines = lines.filter(l => /^[\-•*▪►]/.test(l.trim()));

    return {
        text: section,
        numberOfJobs: (section.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s,]+\d{4}/gi) || []).length / 2 || 1,
        hasBulletPoints: bulletLines.length > 0,
        hasMetrics: /\d+[%$]|\$[\d,]+/.test(section)
    };
}

function extractEducation(text) {
    const section = extractSection(text, /education|academic|qualifications|degrees/i);
    if (!section) return null;

    return {
        text: section,
        hasDegree: /(?:bachelor|master|phd|associate|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|mba|doctorate)/i.test(section),
        hasGPA: /gpa|grade\s*point/i.test(section),
        hasGraduationDate: /\b(?:19|20)\d{2}\b/.test(section)
    };
}

function extractSkills(text) {
    const section = extractSection(text, /skills|technical\s+skills|core\s+competencies|technologies|proficiencies/i);
    if (!section) return null;

    // Extract individual skills
    const skillsList = section
        .replace(/[•\-*▪►]/g, ',')
        .split(/[,\n|;]/)
        .map(s => s.trim())
        .filter(s => s.length > 1 && s.length < 50);

    return {
        text: section,
        skills: skillsList,
        count: skillsList.length,
        isOrganized: /(?:technical|programming|soft\s+skills|languages|frameworks|tools|databases)/i.test(section)
    };
}

function extractKeywords(text) {
    const techKeywords = [
        'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node', 'typescript',
        'html', 'css', 'sql', 'nosql', 'mongodb', 'postgresql', 'aws', 'azure', 'gcp',
        'docker', 'kubernetes', 'git', 'ci/cd', 'rest', 'api', 'graphql', 'agile', 'scrum',
        'machine learning', 'ai', 'deep learning', 'tensorflow', 'data science'
    ];

    const profKeywords = [
        'leadership', 'management', 'communication', 'teamwork', 'problem-solving',
        'analytical', 'strategic', 'planning', 'collaboration', 'innovation',
        'presentation', 'negotiation', 'mentoring', 'budget', 'stakeholder'
    ];

    const lower = text.toLowerCase();
    const foundTech = techKeywords.filter(kw => lower.includes(kw));
    const foundProf = profKeywords.filter(kw => lower.includes(kw));
    const all = [...foundTech, ...foundProf];

    return {
        keywords: all,
        count: all.length,
        hasTechnical: foundTech.length > 0,
        hasProfessional: foundProf.length > 0
    };
}
