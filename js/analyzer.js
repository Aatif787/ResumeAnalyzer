/**
 * ResumeAI Analyzer — Client-side scoring algorithms
 * 6-category weighted scoring system with suggestion generation
 */

// ── Main Analysis Function ──────────────────────────────────────
function analyzeResumeQuality(resumeData) {
    const scores = {
        content: analyzeContent(resumeData),
        formatting: analyzeFormatting(resumeData),
        keywords: analyzeKeywords(resumeData),
        experience: analyzeExperience(resumeData),
        skills: analyzeSkills(resumeData),
        education: analyzeEducation(resumeData)
    };

    // Weighted overall score
    const weights = {
        content: 0.25,
        formatting: 0.15,
        keywords: 0.20,
        experience: 0.20,
        skills: 0.10,
        education: 0.10
    };

    let overall = 0;
    for (const [key, weight] of Object.entries(weights)) {
        overall += scores[key] * weight;
    }
    overall = Math.round(overall);

    const suggestions = generateSuggestions(scores, resumeData);
    const strengths = identifyStrengths(scores, resumeData);
    const weaknesses = identifyWeaknesses(scores, resumeData);

    return {
        overall,
        scores,
        suggestions,
        strengths,
        weaknesses,
        rating: getScoreRating(overall)
    };
}

// ── Content Quality (0-100) ─────────────────────────────────────
function analyzeContent(data) {
    let score = 0;

    // Summary present
    if (data.summary) score += 20;

    // Word count (300-800 ideal)
    if (data.wordCount >= 300 && data.wordCount <= 800) score += 25;
    else if (data.wordCount >= 200 && data.wordCount <= 1000) score += 15;
    else if (data.wordCount >= 100) score += 5;

    // Quantifiable achievements
    const numbers = (data.rawText.match(/\d+[%$KkMm+]/g) || []).length;
    if (numbers >= 5) score += 25;
    else if (numbers >= 3) score += 18;
    else if (numbers >= 1) score += 8;

    // Action verbs
    const actionVerbs = ['achieved', 'developed', 'implemented', 'managed', 'led', 'created',
        'improved', 'increased', 'decreased', 'designed', 'coordinated', 'analyzed',
        'executed', 'delivered', 'optimized', 'built', 'architected', 'launched'];
    const lower = data.rawText.toLowerCase();
    const verbCount = actionVerbs.filter(v => lower.includes(v)).length;
    if (verbCount >= 5) score += 15;
    else if (verbCount >= 3) score += 10;
    else if (verbCount >= 1) score += 5;

    // Content relevance (not empty filler)
    if (data.wordCount > 50) score += 15;

    return Math.min(100, score);
}

// ── Formatting (0-100) ──────────────────────────────────────────
function analyzeFormatting(data) {
    let score = 0;
    const contact = data.contact || {};

    // Contact info
    if (contact.email) score += 10;
    if (contact.phone) score += 8;
    if (contact.linkedin) score += 7;

    // Sections present
    if (data.summary) score += 8;
    if (data.experience) score += 10;
    if (data.education) score += 6;
    if (data.skills) score += 6;

    // Bullet points
    const bullets = (data.rawText.match(/^[\s]*[\-•*▪►]/gm) || []).length;
    if (bullets >= 5) score += 20;
    else if (bullets >= 3) score += 12;
    else if (bullets >= 1) score += 5;

    // Appropriate length
    if (data.wordCount >= 250 && data.wordCount <= 900) score += 15;
    else if (data.wordCount >= 150) score += 8;

    // Has clear section structure
    const sectionHeaders = (data.rawText.match(/^[A-Z][A-Z\s&]+$/gm) || []).length;
    if (sectionHeaders >= 3) score += 10;
    else if (sectionHeaders >= 1) score += 5;

    return Math.min(100, score);
}

// ── Keywords & ATS (0-100) ──────────────────────────────────────
function analyzeKeywords(data) {
    let score = 0;
    const kw = data.keywords || {};

    // Total keywords
    if (kw.count >= 15) score += 40;
    else if (kw.count >= 10) score += 30;
    else if (kw.count >= 5) score += 15;
    else if (kw.count >= 1) score += 5;

    // Technical keywords
    if (kw.hasTechnical) score += 30;

    // Professional keywords
    if (kw.hasProfessional) score += 30;

    return Math.min(100, score);
}

// ── Work Experience (0-100) ─────────────────────────────────────
function analyzeExperience(data) {
    let score = 0;
    const exp = data.experience;

    if (!exp) return 10;

    score += 20; // Section present

    if (exp.numberOfJobs >= 3) score += 25;
    else if (exp.numberOfJobs >= 2) score += 15;
    else score += 8;

    if (exp.hasBulletPoints) score += 25;
    if (exp.hasMetrics) score += 30;

    return Math.min(100, score);
}

// ── Skills (0-100) ──────────────────────────────────────────────
function analyzeSkills(data) {
    let score = 0;
    const sk = data.skills;

    if (!sk) return 10;

    score += 20; // Section present

    if (sk.count >= 10) score += 40;
    else if (sk.count >= 5) score += 25;
    else if (sk.count >= 1) score += 10;

    if (sk.isOrganized) score += 20;

    // Relevance (at least some known keywords)
    if (sk.count > 0) score += 20;

    return Math.min(100, score);
}

// ── Education (0-100) ───────────────────────────────────────────
function analyzeEducation(data) {
    let score = 0;
    const edu = data.education;

    if (!edu) return 10;

    score += 30; // Section present
    if (edu.hasDegree) score += 35;
    if (edu.hasGraduationDate) score += 20;
    if (edu.hasGPA) score += 15;

    return Math.min(100, score);
}

// ── Suggestion Generation ───────────────────────────────────────
function generateSuggestions(scores, data) {
    const suggestions = [];

    // Content suggestions
    if (scores.content < 50) {
        suggestions.push({
            priority: 'high', category: 'Content Quality',
            icon: 'fa-pen-fancy', iconColor: '#ff4081',
            title: 'Strengthen Your Content',
            description: 'Your resume content needs significant improvement. Focus on adding quantifiable achievements and action verbs.',
            tips: [
                'Start each bullet with a strong action verb',
                'Include numbers: percentages, dollar amounts, team sizes',
                'Focus on results, not just responsibilities',
                'Use the STAR method: Situation, Task, Action, Result'
            ]
        });
    }

    if (!data.summary) {
        suggestions.push({
            priority: 'high', category: 'Professional Summary',
            icon: 'fa-user-tie', iconColor: '#7c4dff',
            title: 'Add a Professional Summary',
            description: 'A strong 2-3 sentence summary at the top captures recruiter attention in the first 6 seconds.',
            tips: [
                'Mention your years of experience and specialization',
                'Highlight 2-3 key achievements with metrics',
                'Tailor it to the target role'
            ]
        });
    }

    // ATS suggestions
    if (scores.keywords < 60) {
        suggestions.push({
            priority: 'high', category: 'ATS Optimization',
            icon: 'fa-robot', iconColor: '#00e5ff',
            title: 'Improve ATS Keyword Coverage',
            description: 'Many applicant tracking systems may filter out your resume due to missing industry keywords.',
            tips: [
                'Mirror keywords from the job description',
                'Include both spelled-out and abbreviated forms (e.g., "CI/CD")',
                'Add a dedicated "Technical Skills" section',
                'Use standard section headers like "Experience" and "Education"'
            ]
        });
    }

    // Experience suggestions
    if (scores.experience < 60) {
        suggestions.push({
            priority: 'medium', category: 'Work Experience',
            icon: 'fa-briefcase', iconColor: '#ffab40',
            title: 'Enhance Experience Descriptions',
            description: 'Your experience section could better demonstrate your impact and growth.',
            tips: [
                'Add 3-5 bullet points per role',
                'Quantify your impact with numbers',
                'Show career progression',
                'Include scope: team size, budget, users impacted'
            ]
        });
    }

    // Formatting suggestions
    if (scores.formatting < 60) {
        suggestions.push({
            priority: 'medium', category: 'Formatting',
            icon: 'fa-file-lines', iconColor: '#9fa8da',
            title: 'Improve Resume Formatting',
            description: 'Clean formatting improves both readability and ATS parsing.',
            tips: [
                'Ensure contact info (email, phone, LinkedIn) is complete',
                'Use bullet points for all experience entries',
                'Keep resume to 1-2 pages',
                'Use clear section headers'
            ]
        });
    }

    // Skills suggestions
    if (scores.skills < 60) {
        suggestions.push({
            priority: 'medium', category: 'Skills Section',
            icon: 'fa-tools', iconColor: '#00e676',
            title: 'Expand Your Skills Section',
            description: 'A well-organized skills section helps recruiters and ATS quickly assess your fit.',
            tips: [
                'List 10-15 relevant skills',
                'Organize by category (Languages, Frameworks, Tools)',
                'Include proficiency levels for key skills',
                'Remove outdated or irrelevant skills'
            ]
        });
    }

    // Education suggestions
    if (scores.education < 60) {
        suggestions.push({
            priority: 'low', category: 'Education',
            icon: 'fa-graduation-cap', iconColor: '#536dfe',
            title: 'Complete Education Details',
            description: 'Ensure your education section has all relevant information.',
            tips: [
                'Include degree name, institution, and graduation date',
                'Add GPA if above 3.5',
                'List relevant coursework for entry-level positions',
                'Include honors and academic achievements'
            ]
        });
    }

    // General positive feedback
    if (scores.content >= 70 && scores.keywords >= 70) {
        suggestions.push({
            priority: 'low', category: 'Optimization',
            icon: 'fa-star', iconColor: '#ffd740',
            title: 'Fine-Tune for Maximum Impact',
            description: 'Your resume is already strong. Here are some advanced optimizations.',
            tips: [
                'Tailor your summary for each specific application',
                'Add industry-specific certifications',
                'Include links to portfolio, GitHub, or publications',
                'Get a second pair of eyes for proofreading'
            ]
        });
    }

    return suggestions;
}

// ── Strengths & Weaknesses ──────────────────────────────────────
function identifyStrengths(scores, data) {
    const strengths = [];
    if (scores.content >= 70) strengths.push('Strong content quality with clear achievements');
    if (scores.formatting >= 70) strengths.push('Well-organized formatting and structure');
    if (scores.keywords >= 70) strengths.push('Good keyword coverage for ATS systems');
    if (scores.experience >= 70) strengths.push('Detailed and impactful experience descriptions');
    if (scores.skills >= 70) strengths.push('Comprehensive skills section');
    if (scores.education >= 70) strengths.push('Complete education information');
    if (data.contact?.linkedin) strengths.push('LinkedIn profile included');
    if (data.contact?.email && data.contact?.phone) strengths.push('Complete contact information');
    return strengths.length > 0 ? strengths : ['Resume has been submitted for analysis'];
}

function identifyWeaknesses(scores, data) {
    const weaknesses = [];
    if (scores.content < 50) weaknesses.push('Content lacks quantifiable achievements and action verbs');
    if (scores.formatting < 50) weaknesses.push('Formatting and organization need improvement');
    if (scores.keywords < 50) weaknesses.push('Low keyword density may cause ATS rejection');
    if (scores.experience < 50) weaknesses.push('Experience descriptions lack detail and metrics');
    if (scores.skills < 50) weaknesses.push('Skills section is insufficient or missing');
    if (scores.education < 50) weaknesses.push('Education information is incomplete');
    if (!data.summary) weaknesses.push('Missing professional summary section');
    return weaknesses;
}

// ── Utilities ───────────────────────────────────────────────────
function getScoreRating(score) {
    if (score >= 85) return { text: '⭐ Excellent Resume', color: '#00e676' };
    if (score >= 70) return { text: '👍 Good Resume', color: '#00e5ff' };
    if (score >= 50) return { text: '⚠️ Needs Improvement', color: '#ffab40' };
    return { text: '🔴 Requires Major Revision', color: '#ff5252' };
}
