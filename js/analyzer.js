/**
 * ResumeAI Pro — Client-Side Analyzer v2
 * Mirrors utils/analyzer.py logic for offline/fallback analysis.
 * Truly dynamic — no hardcoded scores.
 */

const WEAK_WORDS = new Set([
    'responsible', 'helped', 'worked', 'assisted', 'participated',
    'handled', 'utilized', 'used', 'did', 'made', 'got', 'went',
    'tried', 'various', 'several', 'some', 'many', 'good', 'nice',
    'great', 'stuff', 'things', 'etc', 'really', 'very', 'basically',
    'just', 'involved', 'duties', 'tasked'
]);

const ACTION_VERBS = new Set([
    'achieved', 'accelerated', 'accomplished', 'architected', 'automated',
    'boosted', 'built', 'championed', 'collaborated', 'consolidated',
    'created', 'decreased', 'delivered', 'designed', 'developed',
    'directed', 'eliminated', 'engineered', 'established', 'exceeded',
    'executed', 'expanded', 'generated', 'grew', 'implemented',
    'improved', 'increased', 'influenced', 'initiated', 'innovated',
    'launched', 'led', 'maximized', 'mentored', 'modernized',
    'negotiated', 'optimized', 'orchestrated', 'overhauled', 'pioneered',
    'produced', 'reduced', 'reengineered', 'resolved', 'revamped',
    'scaled', 'simplified', 'spearheaded', 'streamlined', 'strengthened',
    'surpassed', 'transformed', 'unified', 'upgraded'
]);

const ROLE_KEYWORDS = {
    'Software Engineer': ['python','javascript','react','node','typescript','api','sql','docker','aws','git','ci/cd','agile','microservices','kubernetes','rest','graphql','testing','database','cloud','devops','linux','algorithm','html','css','java','c++','go','mongodb','postgresql','redis','angular','vue'],
    'Data Scientist': ['machine learning','deep learning','python','tensorflow','pytorch','nlp','statistics','regression','classification','neural network','feature engineering','scikit-learn','pandas','numpy','sql','spark','a/b testing','hypothesis testing'],
    'Data Analyst': ['python','sql','pandas','numpy','tableau','excel','dashboard','statistics','etl','visualization','power bi','analytics','reporting','metrics','matplotlib','looker'],
    'Product Manager': ['roadmap','stakeholder','user research','metrics','kpi','jira','backlog','strategy','agile','scrum','sprint','prioritization','mvp','okr','a/b testing','go-to-market','revenue','retention'],
    'Designer': ['figma','sketch','prototype','ux','ui','wireframe','accessibility','design system','responsive','user testing','adobe','interaction','typography'],
    'DevOps Engineer': ['docker','kubernetes','aws','azure','gcp','terraform','ansible','jenkins','ci/cd','linux','bash','python','monitoring','prometheus','grafana','helm','nginx'],
    'Project Manager': ['project management','scrum','agile','risk management','budget','timeline','stakeholder','resource allocation','pmp','jira','milestone','cross-functional','leadership','planning'],
    'Generic': ['leadership','management','project','collaborated','delivered','optimized','communication','planning','initiative','results','team','strategy','problem-solving','analytical','budget','stakeholder','presentation'],
    'Marketing Specialist': ['seo','sem','ppc','content marketing','social media','google analytics','email marketing','conversion rate','brand strategy','copywriting','campaign','lead generation','crm','roi']
};

const REPLACEMENTS = {
    'responsible for': 'Spearheaded',
    'helped': 'Facilitated',
    'worked on': 'Delivered',
    'worked': 'Executed',
    'assisted': 'Partnered with',
    'participated': 'Contributed to',
    'handled': 'Managed',
    'utilized': 'Leveraged',
    'used': 'Employed',
    'did': 'Accomplished',
    'made': 'Developed',
    'got': 'Secured',
    'involved in': 'Drove',
    'duties included': 'Delivered',
    'tasked with': 'Championed',
};

// ── Section Detection ───────────────────────────────────────────
function detectSections(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const patterns = {
        summary: /^(?:professional\s+)?(?:summary|profile|objective|about\s*me|career\s+summary|personal\s+statement)$/i,
        experience: /^(?:work\s+)?(?:experience|employment|professional\s+experience|work\s+history|career\s+history)$/i,
        education: /^(?:education|academic|qualifications|degrees|academic\s+background)$/i,
        skills: /^(?:skills|technical\s+skills|core\s+competencies|technologies|proficiencies|expertise)$/i,
        projects: /^(?:projects|personal\s+projects|key\s+projects|portfolio)$/i,
        certifications: /^(?:certifications|certificates|licenses|credentials|professional\s+development)$/i,
    };
    const found = {};
    for (const line of lines) {
        const clean = line.trim().replace(/:$/, '').trim();
        for (const [sec, pat] of Object.entries(patterns)) {
            if (pat.test(clean)) found[sec] = true;
        }
    }
    return found;
}

function extractSectionTexts(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const sectionPatterns = {
        summary: /^(?:professional\s+)?(?:summary|profile|objective|about\s*me|career\s+summary)/i,
        experience: /^(?:work\s+)?(?:experience|employment|professional\s+experience|work\s+history)/i,
        education: /^(?:education|academic|qualifications|degrees)/i,
        skills: /^(?:skills|technical\s+skills|core\s+competencies|technologies)/i,
        projects: /^(?:projects|personal\s+projects|key\s+projects)/i,
    };
    const texts = {};
    let current = null, currentLines = [];

    for (const line of lines) {
        const clean = line.trim().replace(/:$/, '').trim();
        let foundSec = null;
        for (const [sec, pat] of Object.entries(sectionPatterns)) {
            if (pat.test(clean)) { foundSec = sec; break; }
        }
        if (foundSec) {
            if (current && currentLines.length) texts[current] = currentLines.join('\n');
            current = foundSec; currentLines = [];
        } else if (current) {
            currentLines.push(line);
        }
    }
    if (current && currentLines.length) texts[current] = currentLines.join('\n');
    return texts;
}

// ── Main Analyze Function ────────────────────────────────────────
function analyzeResumeFull(text, role, jd) {
    role = (role && role !== 'Auto-Detect') ? role : 'Generic';
    const lines = text.split('\n').filter(l => l.trim());
    const words = text.match(/\b[A-Za-z][A-Za-z'-]*\b/g) || [];
    const wordCount = words.length;
    const bulletLines = lines.filter(l => /^[\s]*[-•*▪►◦]\s/.test(l) || /^\d+[.)]\s/.test(l));
    const sections = detectSections(text);
    const sectionTexts = extractSectionTexts(text);

    // Scores
    const contentScore = scoreContent(text, words, bulletLines, sectionTexts);
    const atsResult = analyzeATS(text, role);
    const formattingScore = scoreFormatting(text, lines, bulletLines, sections, wordCount, sectionTexts);
    const experienceScore = scoreExperience(sections, sectionTexts, words);
    const skillsScore = scoreSkills(sections, sectionTexts, role, text);
    const educationScore = scoreEducation(sections, sectionTexts);
    const readabilityScore = calcReadability(text, words, lines, bulletLines);

    const categories = {
        'Content Quality': contentScore,
        'ATS Keywords': atsResult.score,
        'Formatting': formattingScore,
        'Experience Impact': experienceScore,
        'Skills Coverage': skillsScore,
        'Education': educationScore
    };

    const weights = { 'Content Quality': 0.25, 'ATS Keywords': 0.20, 'Formatting': 0.15, 'Experience Impact': 0.20, 'Skills Coverage': 0.10, 'Education': 0.10 };
    let overallScore = 0;
    for (const [k, w] of Object.entries(weights)) overallScore += (categories[k] || 0) * w;
    overallScore = Math.min(100, Math.max(0, Math.round(overallScore)));

    // Weak sections
    const weakSections = detectWeakSections(sections, sectionTexts, atsResult, text, words);

    // Feedback
    const feedback = generateFeedback(text, words, atsResult, sections, wordCount);

    // Improvements
    const improvements = generateImprovements(sectionTexts);

    // JD Match
    const jdMatch = jd ? analyzeJDMatch(text, jd) : null;

    // Improved resume
    const improvedResume = generateImprovedResume(sectionTexts);

    return {
        overall_score: overallScore,
        ats_score: atsResult.score,
        readability_score: readabilityScore,
        categories,
        weak_sections: weakSections,
        ats_details: atsResult,
        feedback,
        improvements,
        jd_match: jdMatch,
        improved_resume: improvedResume,
        stats: {
            word_count: wordCount,
            bullet_count: bulletLines.length,
            section_count: Object.keys(sections).length,
            action_verb_count: words.filter(w => ACTION_VERBS.has(w.toLowerCase())).length,
            weak_word_count: words.filter(w => WEAK_WORDS.has(w.toLowerCase())).length,
            metric_count: (text.match(/\d+[%$KkMm+]/g) || []).length,
        }
    };
}

// ── Content Score ─────────────────────────────────────────────────
function scoreContent(text, words, bulletLines, sectionTexts) {
    let score = 0;
    const avCount = words.filter(w => ACTION_VERBS.has(w.toLowerCase())).length;
    const bulletCount = Math.max(bulletLines.length, 1);
    const avRatio = avCount / bulletCount;
    if (avRatio >= 0.6) score += 25; else if (avRatio >= 0.3) score += 15; else if (avCount >= 2) score += 8;

    const metrics = (text.match(/\d+[%$KkMm+]|\$[\d,.]+[KkMm]?/g) || []);
    if (metrics.length >= 8) score += 25; else if (metrics.length >= 4) score += 18; else if (metrics.length >= 2) score += 10; else if (metrics.length >= 1) score += 4;

    const wwCount = words.filter(w => WEAK_WORDS.has(w.toLowerCase())).length;
    if (wwCount === 0) score += 20; else if (wwCount <= 2) score += 14; else if (wwCount <= 4) score += 6;

    if (sectionTexts.summary) {
        const sw = sectionTexts.summary.split(/\s+/).length;
        if (sw >= 20 && sw <= 80) score += 10; else if (sw > 0) score += 4;
        if (/\d/.test(sectionTexts.summary)) score += 5;
    }

    const fp = (text.match(/\b(?:I|me|my|myself)\b/g) || []).length;
    if (fp === 0) score += 15; else if (fp <= 2) score += 8; else if (fp <= 5) score += 3;

    return Math.min(100, Math.max(0, score));
}

// ── ATS Score ─────────────────────────────────────────────────────
function analyzeATS(text, role) {
    const target = ROLE_KEYWORDS[role] || ROLE_KEYWORDS['Generic'];
    const lower = text.toLowerCase();
    const found = target.filter(kw => lower.includes(kw.toLowerCase()));
    const missing = target.filter(kw => !lower.includes(kw.toLowerCase()));
    const ratio = found.length / Math.max(target.length, 1);
    return {
        score: Math.min(100, Math.max(0, Math.round(ratio * 100))),
        found, missing,
        total_target: target.length,
        found_count: found.length,
        role
    };
}

// ── Formatting Score ─────────────────────────────────────────────
function scoreFormatting(text, lines, bulletLines, sections, wordCount, sectionTexts) {
    let score = 0;
    if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) score += 12;
    if (/[\+]?[\d\s().-]{10,}/.test(text)) score += 8;
    if (/linkedin\.com\/in\//i.test(text)) score += 8;

    const essential = ['experience', 'education', 'skills'];
    score += essential.filter(s => sections[s]).length * 7;
    score = Math.min(score, 48);

    if (bulletLines.length >= 8) score += 20; else if (bulletLines.length >= 4) score += 14; else if (bulletLines.length >= 1) score += 6;

    if (wordCount >= 300 && wordCount <= 800) score += 15;
    else if (wordCount >= 200 && wordCount <= 1000) score += 10;
    else if (wordCount >= 100) score += 4;

    if (sectionTexts.experience) {
        const expBullets = (sectionTexts.experience.match(/^[\s]*[-•*▪►]\s/gm) || []).length;
        if (expBullets >= 3) score += 9; else if (expBullets >= 1) score += 4;
    }
    return Math.min(100, Math.max(0, score));
}

// ── Experience Score ─────────────────────────────────────────────
function scoreExperience(sections, sectionTexts, words) {
    if (!sections.experience && !sectionTexts.experience) return 5;
    let score = 15;
    const et = sectionTexts.experience || '';
    if (!et) return 15;

    const dates = (et.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s,]+\d{4}/gi) || []);
    const present = (et.match(/\b(?:Present|Current|Now)\b/gi) || []);
    const total = dates.length + present.length;
    if (total >= 4) score += 20; else if (total >= 2) score += 12; else if (total >= 1) score += 5;

    const expBullets = et.split('\n').filter(l => /^[\s]*[-•*▪►]\s/.test(l));
    if (expBullets.length >= 8) score += 20; else if (expBullets.length >= 4) score += 12; else if (expBullets.length >= 1) score += 5;

    const expMetrics = (et.match(/\d+[%$KkMm+]|\$[\d,.]+/g) || []);
    if (expMetrics.length >= 5) score += 20; else if (expMetrics.length >= 2) score += 12; else if (expMetrics.length >= 1) score += 5;

    const expWords = (et.match(/\b\w+\b/g) || []).map(w => w.toLowerCase());
    const expAction = expWords.filter(w => ACTION_VERBS.has(w)).length;
    if (expAction >= 6) score += 15; else if (expAction >= 3) score += 10; else if (expAction >= 1) score += 4;

    const impactPhrases = ['resulting in', 'leading to', 'which led', 'saving', 'revenue', 'reduced', 'increased', 'improved', 'grew'];
    const impactCount = impactPhrases.filter(p => et.toLowerCase().includes(p)).length;
    if (impactCount >= 3) score += 10; else if (impactCount >= 1) score += 5;

    return Math.min(100, Math.max(0, score));
}

// ── Skills Score ─────────────────────────────────────────────────
function scoreSkills(sections, sectionTexts, role, text) {
    if (!sections.skills && !sectionTexts.skills) return 5;
    let score = 15;
    const st = sectionTexts.skills || '';
    if (!st) return 15;

    const items = st.split(/[,\n|•\-*▪►;]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 60);
    if (items.length >= 15) score += 30; else if (items.length >= 10) score += 22; else if (items.length >= 5) score += 12; else if (items.length >= 1) score += 5;

    if (/(?:languages|frameworks|tools|databases|platforms|technical|programming):/i.test(st)) score += 15;
    else if (items.length >= 5) score += 5;

    const roleKws = ROLE_KEYWORDS[role] || ROLE_KEYWORDS['Generic'];
    const lower = st.toLowerCase();
    const matched = roleKws.filter(kw => lower.includes(kw.toLowerCase())).length;
    const ratio = matched / Math.max(roleKws.length, 1);
    if (ratio >= 0.3) score += 25; else if (ratio >= 0.15) score += 15; else if (matched >= 2) score += 8;

    const techIndicators = ['python', 'java', 'sql', 'aws', 'react', 'docker', 'git', 'linux', 'api'];
    const softIndicators = ['leadership', 'communication', 'teamwork', 'management', 'problem-solving'];
    const hasTech = techIndicators.some(t => lower.includes(t));
    const hasSoft = softIndicators.some(s => lower.includes(s));
    if (hasTech && hasSoft) score += 15; else if (hasTech || hasSoft) score += 8;

    return Math.min(100, Math.max(0, score));
}

// ── Education Score ──────────────────────────────────────────────
function scoreEducation(sections, sectionTexts) {
    if (!sections.education && !sectionTexts.education) return 5;
    let score = 25;
    const et = sectionTexts.education || '';
    if (!et) return 25;

    if (/(?:bachelor|master|phd|associate|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|mba|doctorate|diploma|degree)/i.test(et)) score += 25;
    if (/(?:university|college|institute|school|academy)/i.test(et)) score += 15;
    if (/\b(?:19|20)\d{2}\b/.test(et)) score += 15;
    if (/(?:gpa|grade|cgpa)[\s:]*[\d.]+/i.test(et)) score += 10;
    if (/(?:coursework|honors|dean|magna|summa|cum laude|scholarship)/i.test(et)) score += 10;

    return Math.min(100, Math.max(0, score));
}

// ── Readability ──────────────────────────────────────────────────
function calcReadability(text, words, lines, bulletLines) {
    if (words.length === 0) return 30;
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 8);
    const avgWps = words.length / Math.max(sentences.length, 1);
    let score = 0;

    if (avgWps >= 12 && avgWps <= 22) score += 35;
    else if (avgWps >= 8 && avgWps <= 30) score += 20;
    else score += 5;

    const bulletRatio = bulletLines.length / Math.max(lines.length, 1);
    if (bulletRatio >= 0.3) score += 25; else if (bulletRatio >= 0.15) score += 15; else if (bulletLines.length >= 1) score += 5;

    const longLines = lines.filter(l => l.split(/\s+/).length > 40);
    if (longLines.length === 0) score += 20; else if (longLines.length <= 2) score += 12;

    function syllables(w) { const m = w.toLowerCase().match(/[aeiouy]+/g); let c = m ? m.length : 1; if (w.endsWith('e') && c > 1) c--; return Math.max(1, c); }
    const totalSyl = words.reduce((sum, w) => sum + syllables(w), 0);
    const avgSyl = totalSyl / Math.max(words.length, 1);
    if (avgSyl <= 1.8) score += 20; else if (avgSyl <= 2.2) score += 12; else score += 4;

    return Math.min(100, Math.max(0, score));
}

// ── Weak Section Detection ───────────────────────────────────────
function detectWeakSections(sections, sectionTexts, atsResult, text, words) {
    const weak = [];

    if (!sections.summary) {
        weak.push({ section: 'Summary', severity: 'critical', reason: 'No professional summary detected. Recruiters spend 6 seconds scanning — a strong summary is essential.' });
    } else if (sectionTexts.summary) {
        const wc = sectionTexts.summary.split(/\s+/).length;
        if (wc < 15) weak.push({ section: 'Summary', severity: 'warning', reason: `Summary is too short (${wc} words). Expand to 2-3 sentences highlighting your key value.` });
        if (!/\d/.test(sectionTexts.summary)) weak.push({ section: 'Summary', severity: 'warning', reason: 'Summary lacks quantifiable metrics. Add numbers to show impact.' });
    }

    if (!sections.experience) {
        weak.push({ section: 'Experience', severity: 'critical', reason: 'No work experience section found. This is the most critical section for most roles.' });
    } else if (sectionTexts.experience) {
        const et = sectionTexts.experience;
        const bullets = et.split('\n').filter(l => /^[\s]*[-•*▪►]\s/.test(l));
        const metrics = (et.match(/\d+[%$KkMm+]|\$[\d,.]+/g) || []);
        const weakW = (et.match(/\b\w+\b/g) || []).filter(w => WEAK_WORDS.has(w.toLowerCase()));
        if (bullets.length < 3) weak.push({ section: 'Experience', severity: 'warning', reason: `Only ${bullets.length} bullet point(s). Use 3-5 achievement-oriented bullets per role.` });
        if (metrics.length < 2) weak.push({ section: 'Experience', severity: 'warning', reason: `Only ${metrics.length} metric(s). Quantify your impact with numbers and percentages.` });
        if (weakW.length >= 3) weak.push({ section: 'Experience', severity: 'warning', reason: `Weak words found: ${[...new Set(weakW)].slice(0,3).join(', ')}. Replace with action verbs.` });
    }

    if (!sections.skills) {
        weak.push({ section: 'Skills', severity: 'critical', reason: 'No skills section found. ATS systems heavily rely on keyword matching.' });
    } else if (atsResult.score < 40) {
        weak.push({ section: 'Skills', severity: 'critical', reason: `ATS keyword match is only ${atsResult.score}% for ${atsResult.role}. Missing ${atsResult.missing.length} key terms.` });
    } else if (atsResult.score < 65) {
        weak.push({ section: 'Skills', severity: 'warning', reason: `ATS keyword match is ${atsResult.score}%. Add more role-specific keywords.` });
    }

    if (!sections.education) {
        weak.push({ section: 'Education', severity: 'warning', reason: 'No education section found. Include your highest degree and institution.' });
    }

    if (!weak.length) {
        weak.push({ section: 'All Sections', severity: 'good', reason: 'All sections are well-structured. Focus on fine-tuning keywords and metrics.' });
    }

    return weak;
}

// ── Feedback ─────────────────────────────────────────────────────
function generateFeedback(text, words, atsResult, sections, wordCount) {
    const fb = {};
    const av = words.filter(w => ACTION_VERBS.has(w.toLowerCase())).length;
    const ww = words.filter(w => WEAK_WORDS.has(w.toLowerCase())).length;
    const metrics = (text.match(/\d+[%$KkMm+]|\$[\d,.]+/g) || []).length;
    const fp = (text.match(/\b(?:I|me|my|myself)\b/g) || []).length;

    const content = [];
    if (av >= 5) content.push(`✅ Strong action verb usage (${av} found)`);
    else if (av >= 2) content.push(`⚠️ Moderate action verb usage (${av}). Aim for 5+.`);
    else content.push(`❌ Very few action verbs (${av}). Start bullets with power verbs.`);

    if (ww === 0) content.push('✅ No weak/filler words detected');
    else { const list = [...new Set(words.filter(w => WEAK_WORDS.has(w.toLowerCase())))].slice(0,5); content.push(`⚠️ ${ww} weak word(s): ${list.join(', ')}`); }

    if (metrics >= 5) content.push(`✅ Excellent metric density (${metrics} quantifiable achievements)`);
    else if (metrics >= 2) content.push(`⚠️ ${metrics} metric(s). Aim for 5+.`);
    else content.push(`❌ Only ${metrics} metric(s). Add percentages, dollar amounts.`);

    if (fp > 3) content.push(`⚠️ ${fp} first-person pronouns. Remove "I", "me", "my".`);
    fb['Content Quality'] = content;

    const afb = [`Role: ${atsResult.role}`, `Keywords found: ${atsResult.found_count}/${atsResult.total_target}`];
    if (atsResult.missing.length) afb.push(`Top missing: ${atsResult.missing.slice(0,6).join(', ')}`);
    if (atsResult.score >= 70) afb.push('✅ Good ATS coverage');
    else if (atsResult.score >= 40) afb.push('⚠️ Moderate ATS coverage. Add more keywords.');
    else afb.push('❌ Low ATS coverage. Resume may be filtered out.');
    fb['ATS Keywords'] = afb;

    const ffb = [];
    if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) ffb.push('✅ Email found');
    else ffb.push('❌ No email — include a professional email');
    if (/linkedin/i.test(text)) ffb.push('✅ LinkedIn included');
    else ffb.push('⚠️ No LinkedIn URL');
    if (wordCount >= 300 && wordCount <= 800) ffb.push(`✅ Good length (${wordCount} words)`);
    else if (wordCount < 200) ffb.push(`⚠️ Too short (${wordCount} words)`);
    else if (wordCount > 1000) ffb.push(`⚠️ Too long (${wordCount} words)`);
    else ffb.push(`ℹ️ ${wordCount} words`);
    ffb.push(`Sections: ${Object.keys(sections).join(', ')}`);
    fb['Formatting'] = ffb;

    return fb;
}

// ── Improvements ─────────────────────────────────────────────────
function generateImprovements(sectionTexts) {
    const improvements = {};
    for (const sec of ['summary', 'experience', 'skills', 'education', 'projects']) {
        const original = sectionTexts[sec];
        if (!original) continue;
        const { improved, changes } = improveSection(sec, original);
        improvements[sec] = { original: original.trim(), improved: improved.trim(), changes };
    }
    return improvements;
}

function improveSection(name, text) {
    let improved = text;
    const changes = [];

    for (const [weak, strong] of Object.entries(REPLACEMENTS)) {
        const re = new RegExp('\\b' + weak.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
        if (re.test(improved)) {
            improved = improved.replace(re, strong);
            changes.push(`Replaced "${weak}" with "${strong}"`);
        }
    }

    // Capitalize bullet starts for experience
    if (name === 'experience') {
        const lines = improved.split('\n');
        improved = lines.map(l => {
            const m = l.match(/^([\s]*[-•*▪►]\s+)([a-z])(.*)/);
            if (m) { if (!changes.includes('Capitalized bullet starts')) changes.push('Capitalized bullet starts'); return m[1] + m[2].toUpperCase() + m[3]; }
            return l;
        }).join('\n');
    }

    if (!changes.length) changes.push('Section looks good — minor formatting applied');
    return { improved, changes };
}

// ── Full Improved Resume ─────────────────────────────────────────
function generateImprovedResume(sectionTexts) {
    const parts = [];
    for (const sec of ['summary', 'experience', 'education', 'skills', 'projects', 'certifications']) {
        const original = sectionTexts[sec];
        if (!original) continue;
        const { improved } = improveSection(sec, original);
        parts.push(`${sec.toUpperCase()}\n${improved}`);
    }
    return parts.length ? parts.join('\n\n') : '';
}

// ── JD Match ─────────────────────────────────────────────────────
function analyzeJDMatch(text, jd) {
    const stopWords = new Set(['the','and','for','with','that','this','are','was','will','can','has','have','had','not','but','from','they','been','its','you','your','our','who','which','their','about','into','more','other','than','then','also','each','how','all','would','there','when','make','like','such','through','over','after','before','should','could','must','work','working','ability','strong','including','using','used','looking','role','position','team','experience','years','join','company','what','best','well','get','use']);

    const jdWords = jd.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const keywords = new Set(jdWords.filter(w => !stopWords.has(w)));

    // Add bigrams
    const bigramMatches = jd.toLowerCase().match(/\b([a-z]+ [a-z]+)\b/g) || [];
    for (const bg of bigramMatches) {
        const ws = bg.split(' ');
        if (ws.every(w => !stopWords.has(w)) && bg.length > 6) keywords.add(bg);
    }

    const lower = text.toLowerCase();
    const found = [...keywords].filter(kw => lower.includes(kw));
    const missing = [...keywords].filter(kw => !lower.includes(kw)).sort((a,b) => b.length - a.length);

    const score = Math.min(100, Math.max(0, Math.round(found.length / Math.max(keywords.size, 1) * 100)));

    const suggestions = [];
    if (missing.length) suggestions.push(`Add ${Math.min(missing.length, 10)} missing keywords from the job description`);
    if (score < 50) suggestions.push('Resume needs significant alignment with this job description');
    if (score >= 70) suggestions.push('Good alignment! Fine-tune remaining keywords.');

    return { score, found: found.slice(0,20), missing: missing.slice(0,15), total_keywords: keywords.size, suggestions };
}
