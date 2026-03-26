/**
 * ResumeAI Pro — Main Controller v2
 * Handles everything: file upload, API calls, tab nav, and all UI rendering.
 */

let currentFile = null;
let currentText = null;
let analysisData = null;

// ── Sample Resume ────────────────────────────────────────────────
const SAMPLE_RESUME = `John Mitchell
john.mitchell@email.com | (555) 123-4567 | linkedin.com/in/johnmitchell | github.com/jmitchell

PROFESSIONAL SUMMARY
Results-driven Full Stack Software Engineer with 5+ years of experience designing and deploying scalable web applications. Proficient in JavaScript, Python, React, Node.js, and cloud technologies. Delivered mission-critical features that increased user engagement by 35% and reduced system downtime by 40%.

WORK EXPERIENCE

Senior Software Engineer — TechCorp Inc., San Francisco, CA
January 2022 – Present
• Architected and deployed a microservices-based platform on AWS using Docker and Kubernetes, serving 2M+ daily active users
• Led a team of 6 engineers to rebuild the frontend in React/TypeScript, reducing page load time by 55%
• Implemented CI/CD pipeline with GitHub Actions, cutting deployment time from 2 hours to 15 minutes
• Optimized PostgreSQL queries, reducing average API response time from 800ms to 120ms
• Mentored 4 junior developers through structured code reviews and pair programming sessions

Software Developer — DataFlow Solutions, Austin, TX
June 2019 – December 2021
• Developed RESTful APIs serving 500K+ daily requests with 99.9% uptime using Node.js and Express
• Built real-time data visualization dashboard using React and D3.js, adopted by 200+ enterprise clients
• Reduced cloud infrastructure costs by 30% ($150K annually) through optimization of AWS resources
• Collaborated with product team to design and ship 12 new features over 8 sprint cycles

Junior Developer — StartupXYZ, Remote
August 2018 – May 2019
• Built responsive web applications using HTML5, CSS3, and JavaScript
• Contributed to open-source projects with 500+ GitHub stars
• Participated in agile development with daily standups and bi-weekly sprints

EDUCATION
Bachelor of Science in Computer Science
University of Texas at Austin — Graduated May 2018 | GPA: 3.7/4.0
Relevant Coursework: Data Structures, Algorithms, Machine Learning, Database Systems

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, SQL, HTML5, CSS3
Frameworks: React, Node.js, Express, Next.js, Django
Databases: PostgreSQL, MongoDB, Redis
Cloud & DevOps: AWS, Docker, Kubernetes, Terraform, GitHub Actions, CI/CD
Tools: Git, Jira, Figma, Postman, VS Code

CERTIFICATIONS
• AWS Certified Solutions Architect – Associate (2023)
• Google Professional Cloud Developer (2022)`;

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initFileUpload();
    initTabs();
    initNavigation();
    initActions();
});

// ══════════════════════════════════════════════════════════════════
// FILE UPLOAD
// ══════════════════════════════════════════════════════════════════
function initFileUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    if (!dropZone || !fileInput) return;

    fileInput.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', () => startAnalysis());
}

function handleFile(file) {
    const validExt = ['pdf', 'docx', 'doc', 'txt'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validExt.includes(ext)) return showToast('Unsupported format. Use PDF, DOCX, or TXT.', 'error');
    if (file.size > 10 * 1024 * 1024) return showToast('File too large (max 10MB).', 'error');

    currentFile = file;
    document.getElementById('dropZone').style.display = 'none';
    const uf = document.getElementById('uploadedFile');
    uf.style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatSize(file.size);

    document.getElementById('removeFile').onclick = () => {
        currentFile = null;
        document.getElementById('dropZone').style.display = '';
        uf.style.display = 'none';
        document.getElementById('fileInput').value = '';
    };
}

// ══════════════════════════════════════════════════════════════════
// ANALYSIS PIPELINE
// ══════════════════════════════════════════════════════════════════
async function startAnalysis(demoText) {
    show('loadingSection'); hide('uploadSection'); hide('resultsSection'); hide('heroSection'); hide('featuresSection');

    try {
        let text;
        if (demoText) {
            text = demoText;
            updateLoading(1, 'Loading demo resume...');
        } else if (currentFile) {
            updateLoading(1, 'Parsing document...');
            text = await parseFile(currentFile);
            updateLoading(2, 'Text extracted...');
        } else {
            return showToast('Please upload a resume first.', 'error') || (show('uploadSection'), hide('loadingSection'));
        }

        currentText = text;
        const role = document.getElementById('roleSelect')?.value || 'Generic';
        const jd = document.getElementById('jobDescInput')?.value || '';

        updateLoading(2, 'Running AI analysis...');

        // Try API first, fallback to client-side
        let results;
        try {
            results = await analyzeViaAPI(text, role, jd);
            updateLoading(4, 'Processing results...');
        } catch (err) {
            console.log('API unavailable, using client-side:', err.message);
            updateLoading(3, 'Running local analysis...');
            results = analyzeResumeFull(text, role, jd);
            updateLoading(4, 'Analysis complete...');
        }

        analysisData = results;
        updateLoading(5, 'Rendering dashboard...');
        await delay(300);

        renderResults(results);
        hide('loadingSection'); show('resultsSection');

    } catch (err) {
        console.error('Analysis error:', err);
        showToast('Error: ' + err.message, 'error');
        hide('loadingSection'); show('uploadSection'); show('heroSection'); show('featuresSection');
    }
}

async function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'txt') return await file.text();

    if (ext === 'pdf' && typeof pdfjsLib !== 'undefined') {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
        }
        return text;
    }

    if ((ext === 'docx' || ext === 'doc') && typeof mammoth !== 'undefined') {
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        return result.value;
    }

    return await file.text();
}

async function analyzeViaAPI(text, role, jd) {
    const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, role, jd })
    });
    if (!res.ok) throw new Error('API ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
}

// ══════════════════════════════════════════════════════════════════
// RENDER RESULTS
// ══════════════════════════════════════════════════════════════════
function renderResults(r) {
    // Scores
    animateScore('overallScore', r.overall_score, 'overallGauge', 160, 'overallLabel');
    animateScore('atsScore', r.ats_score, 'atsGauge', 120, 'atsLabel');
    animateScore('readabilityScore', r.readability_score, 'readabilityGauge', 120, 'readabilityLabel');

    // Weak sections
    renderWeakSections(r.weak_sections || []);

    // Category bars
    renderCategoryBars(r.categories || {});

    // Keywords
    renderKeywords(r.ats_details || {});

    // Feedback
    renderFeedback(r.feedback || {});

    // Improvements tab
    renderImprovements(r.improvements || {});

    // Job Match tab
    renderJobMatch(r.jd_match);

    // Download tab
    renderDownload(r.improved_resume || '');
}

function animateScore(elId, value, canvasId, size, labelId) {
    const el = document.getElementById(elId);
    if (el) animateNumber(el, 0, value, 1200);

    const canvas = document.getElementById(canvasId);
    if (canvas) drawGauge(canvas, value, size);

    const label = document.getElementById(labelId);
    if (label) {
        const { text, color } = getScoreLabel(value);
        label.textContent = text;
        label.style.color = color;
    }
}

function getScoreLabel(score) {
    if (score >= 85) return { text: 'Excellent', color: '#4edea3' };
    if (score >= 70) return { text: 'Good', color: '#6ffbbe' };
    if (score >= 55) return { text: 'Average', color: '#f59e0b' };
    if (score >= 40) return { text: 'Needs Work', color: '#ff9800' };
    return { text: 'Poor', color: '#ff6b6b' };
}

function drawGauge(canvas, value, size) {
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2, r = (size / 2) - 10;
    ctx.clearRect(0, 0, size, size);

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.strokeStyle = '#2d3449';
    ctx.lineWidth = size > 140 ? 12 : 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Fill
    const pct = Math.min(value, 100) / 100;
    const endAngle = 0.75 * Math.PI + pct * 1.5 * Math.PI;
    const { color } = getScoreLabel(value);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0.75 * Math.PI, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = size > 140 ? 12 : 8;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function renderWeakSections(sections) {
    const list = document.getElementById('weakSectionsList');
    if (!list) return;
    list.innerHTML = sections.map(s => `
        <div class="weak-item">
            <span class="severity-badge severity-${s.severity}">${s.severity}</span>
            <div class="weak-item-content">
                <h5>${s.section}</h5>
                <p>${s.reason}</p>
            </div>
        </div>
    `).join('');
}

function renderCategoryBars(categories) {
    const container = document.getElementById('categoryBars');
    if (!container) return;

    container.innerHTML = Object.entries(categories).map(([name, value]) => {
        const { color } = getScoreLabel(value);
        return `
        <div class="cat-bar-item">
            <span class="cat-bar-label">${name}</span>
            <div class="cat-bar-track"><div class="cat-bar-fill" style="background:${color}" data-width="${value}%"></div></div>
            <span class="cat-bar-value" style="color:${color}">${value}</span>
        </div>`;
    }).join('');

    // Animate bars
    setTimeout(() => {
        container.querySelectorAll('.cat-bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 100);
}

function renderKeywords(ats) {
    const chips = document.getElementById('keywordChips');
    const subtitle = document.getElementById('keywordsSubtitle');
    if (!chips) return;

    if (subtitle) subtitle.textContent = `${ats.found_count || 0}/${ats.total_target || 0} keywords matched for ${ats.role || 'Generic'}`;

    let html = '';
    if (ats.found) html += ats.found.slice(0, 10).map(k => `<span class="keyword-chip found">${k}</span>`).join('');
    if (ats.missing) html += ats.missing.slice(0, 12).map(k => `<span class="keyword-chip">${k}</span>`).join('');
    chips.innerHTML = html;
}

function renderFeedback(feedback) {
    const container = document.getElementById('feedbackSections');
    if (!container) return;

    container.innerHTML = Object.entries(feedback).map(([title, items]) => `
        <div class="feedback-block">
            <h5>${title}</h5>
            <ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
        </div>
    `).join('');
}

function renderImprovements(improvements) {
    const container = document.getElementById('improvementSections');
    if (!container) return;

    if (!Object.keys(improvements).length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><h4>All sections look good!</h4><p>No major improvements needed.</p></div>';
        return;
    }

    container.innerHTML = Object.entries(improvements).map(([sec, data]) => `
        <div class="improvement-block">
            <div class="improvement-header" onclick="this.parentElement.classList.toggle('open')">
                <h5><i class="fas fa-file-pen"></i> ${sec.charAt(0).toUpperCase() + sec.slice(1)}</h5>
                <i class="fas fa-chevron-down improvement-chevron"></i>
            </div>
            <div class="improvement-body">
                <p class="text-box-label text-box-label-original">Original</p>
                <div class="text-box text-box-original">${escapeHtml(data.original)}</div>
                <p class="text-box-label text-box-label-improved">Improved</p>
                <div class="text-box text-box-improved">${escapeHtml(data.improved)}</div>
                ${data.changes.length ? `<ul class="changes-summary">${data.changes.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>` : ''}
            </div>
        </div>
    `).join('');
}

function renderJobMatch(jdMatch) {
    const container = document.getElementById('jobMatchContent');
    if (!container) return;

    if (!jdMatch) {
        container.innerHTML = `<div class="empty-state" id="noJdState"><i class="fas fa-bullseye"></i><h4>No Job Description Provided</h4><p>Paste a job description in the upload form and re-analyze to get your match score.</p></div>`;
        return;
    }

    const { color } = getScoreLabel(jdMatch.score);
    container.innerHTML = `
        <div class="job-match-grid">
            <div class="match-score-panel">
                <canvas id="matchGauge" width="160" height="160"></canvas>
                <h4>Job Match Score</h4>
                <p class="score-label" style="color:${color}">${jdMatch.score}/100</p>
                <p style="font-size:0.82rem;color:var(--on-surface-variant);margin-top:8px">${jdMatch.total_keywords} keywords analyzed</p>
            </div>
            <div class="match-details-panel">
                <div class="match-section">
                    <h5>Missing Keywords</h5>
                    <div class="keyword-chips">${jdMatch.missing.slice(0,12).map(k => `<span class="keyword-chip">${k}</span>`).join('')}</div>
                </div>
                <div class="match-section">
                    <h5>Matched Keywords</h5>
                    <div class="keyword-chips">${jdMatch.found.slice(0,12).map(k => `<span class="keyword-chip found">${k}</span>`).join('')}</div>
                </div>
                ${jdMatch.suggestions.length ? `<div class="match-section"><h5>Suggestions</h5><ul class="feedback-block" style="background:none;padding:0">${jdMatch.suggestions.map(s => `<li style="padding:4px 0 4px 16px;position:relative;font-size:0.84rem;color:var(--on-surface-variant)"><span style="position:absolute;left:0">→</span> ${escapeHtml(s)}</li>`).join('')}</ul></div>` : ''}
            </div>
        </div>
    `;

    setTimeout(() => {
        const matchCanvas = document.getElementById('matchGauge');
        if (matchCanvas) drawGauge(matchCanvas, jdMatch.score, 160);
    }, 100);
}

function renderDownload(improvedResume) {
    const preview = document.getElementById('resumePreview');
    if (preview) preview.textContent = improvedResume || 'No improved resume generated.';
}

// ══════════════════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════════════════
function initTabs() {
    document.addEventListener('click', e => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const pane = document.getElementById(tab + 'Tab');
        if (pane) pane.classList.add('active');
    });
}

// ══════════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════════
function initNavigation() {
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const sec = link.dataset.section;
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            hide('aboutSection'); hide('pricingSection');

            if (sec === 'analyzer') {
                show('heroSection'); show('featuresSection');
                if (analysisData) show('resultsSection'); else show('uploadSection');
            } else if (sec === 'about') {
                hide('heroSection'); hide('featuresSection'); hide('uploadSection'); hide('resultsSection');
                show('aboutSection');
            } else if (sec === 'pricing') {
                hide('heroSection'); hide('featuresSection'); hide('uploadSection'); hide('resultsSection');
                show('pricingSection');
            }
        });
    });

    // Logo click -> home
    const logo = document.getElementById('logoLink');
    if (logo) logo.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector('.nav-link[data-section="analyzer"]')?.classList.add('active');
        hide('aboutSection'); hide('pricingSection');
        show('heroSection'); show('featuresSection');
        if (analysisData) show('resultsSection'); else show('uploadSection');
    });
}

// ══════════════════════════════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════════════════════════════
function initActions() {
    // Demo buttons
    document.getElementById('heroDemoBtn')?.addEventListener('click', () => startAnalysis(SAMPLE_RESUME));

    // Hero CTA
    document.getElementById('heroCtaBtn')?.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('uploadSection')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Analyze new
    document.getElementById('analyzeNewBtn')?.addEventListener('click', () => {
        analysisData = null; currentFile = null; currentText = null;
        hide('resultsSection'); show('heroSection'); show('featuresSection'); show('uploadSection');
        document.getElementById('dropZone').style.display = '';
        document.getElementById('uploadedFile').style.display = 'none';
        document.getElementById('fileInput').value = '';
        document.getElementById('jobDescInput').value = '';
    });

    // Download TXT
    document.getElementById('downloadTxtBtn')?.addEventListener('click', () => {
        if (!analysisData?.improved_resume) return showToast('No improved resume.', 'error');
        downloadFile(analysisData.improved_resume, 'improved_resume.txt', 'text/plain');
        showToast('Improved resume downloaded!', 'success');
    });

    // Export PDF
    document.getElementById('exportPdfBtn')?.addEventListener('click', () => {
        if (!analysisData) return showToast('No analysis to export.', 'error');
        exportPDF(analysisData);
    });
}

function exportPDF(r) {
    try {
        if (typeof jspdf === 'undefined' || !jspdf.jsPDF) return showToast('PDF library not loaded.', 'error');
        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        let y = 20;

        doc.setFontSize(22); doc.setTextColor(99, 102, 241);
        doc.text('ResumeAI Pro — Analysis Report', 20, y); y += 15;

        doc.setFontSize(12); doc.setTextColor(60, 60, 60);
        doc.text(`Overall Score: ${r.overall_score}/100`, 20, y); y += 8;
        doc.text(`ATS Score: ${r.ats_score}/100`, 20, y); y += 8;
        doc.text(`Readability: ${r.readability_score}/100`, 20, y); y += 12;

        doc.setFontSize(14); doc.setTextColor(0);
        doc.text('Category Breakdown', 20, y); y += 8;
        doc.setFontSize(11); doc.setTextColor(60, 60, 60);
        for (const [k, v] of Object.entries(r.categories || {})) {
            doc.text(`  ${k}: ${v}/100`, 20, y); y += 7;
        }
        y += 5;

        doc.setFontSize(14); doc.setTextColor(0);
        doc.text('Weak Sections', 20, y); y += 8;
        doc.setFontSize(10); doc.setTextColor(60, 60, 60);
        for (const ws of (r.weak_sections || [])) {
            const txt = `[${ws.severity.toUpperCase()}] ${ws.section}: ${ws.reason}`;
            const lines = doc.splitTextToSize(txt, 170);
            for (const line of lines) { doc.text(line, 20, y); y += 6; }
            y += 2;
            if (y > 270) { doc.addPage(); y = 20; }
        }

        y += 5;
        doc.setFontSize(14); doc.setTextColor(0);
        doc.text('Feedback', 20, y); y += 8;
        doc.setFontSize(10);
        for (const [cat, items] of Object.entries(r.feedback || {})) {
            doc.setTextColor(0); doc.text(cat, 20, y); y += 6;
            doc.setTextColor(60, 60, 60);
            for (const item of items) {
                const lines = doc.splitTextToSize(`  ${item}`, 170);
                for (const line of lines) { doc.text(line, 20, y); y += 5; }
                if (y > 270) { doc.addPage(); y = 20; }
            }
            y += 3;
        }

        doc.save('resume_analysis_report.pdf');
        showToast('PDF report downloaded!', 'success');
    } catch (err) {
        showToast('PDF error: ' + err.message, 'error');
    }
}

// ══════════════════════════════════════════════════════════════════
// LOADING
// ══════════════════════════════════════════════════════════════════
function updateLoading(step, text) {
    const label = document.getElementById('loadingText');
    if (label) label.textContent = text;

    const bar = document.getElementById('loadingBar');
    if (bar) bar.style.width = (step / 5 * 100) + '%';

    for (let i = 1; i <= 5; i++) {
        const el = document.getElementById('step' + i);
        if (el) {
            el.classList.remove('active', 'done');
            if (i < step) el.classList.add('done');
            else if (i === step) el.classList.add('active');
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════
function show(id) { const el = document.getElementById(id); if (el) el.style.display = ''; }
function hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

function animateNumber(el, from, to, duration) {
    const start = performance.now();
    function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (to - from) * ease);
        if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${escapeHtml(message)}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
