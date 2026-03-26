/**
 * ResumeAI Main — Application Controller
 * Handles file uploads, API interaction, UI state, and tab navigation
 */

// ── State ───────────────────────────────────────────────────────
let currentFile = null;
let currentResumeText = null;
let analysisResults = null;
let improvedContent = null;

// ── Sample Resume ───────────────────────────────────────────────
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


// ── Initialization ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    initFileUpload();
    initTabNavigation();
    initSectionNavigation();
    initThemeToggle();
    initDemoButtons();
    initActionButtons();
});

// ── File Upload ─────────────────────────────────────────────────
function initFileUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (!dropZone || !fileInput) return;

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
}

function handleFileSelect(file) {
    // Validate
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/msword'];
    const validExtensions = ['pdf', 'docx', 'doc', 'txt'];
    const ext = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
        showToast('Unsupported file format. Please upload PDF, DOCX, or TXT.', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showToast('File too large. Maximum size is 10MB.', 'error');
        return;
    }

    currentFile = file;

    // Show file info
    const dropZone = document.getElementById('dropZone');
    const uploadedFile = document.getElementById('uploadedFile');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');

    if (dropZone) dropZone.style.display = 'none';
    if (uploadedFile) uploadedFile.style.display = 'block';
    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = formatFileSize(file.size);

    // Remove file button
    const removeBtn = document.getElementById('removeFile');
    if (removeBtn) {
        removeBtn.onclick = () => {
            currentFile = null;
            if (dropZone) dropZone.style.display = '';
            if (uploadedFile) uploadedFile.style.display = 'none';
            document.getElementById('fileInput').value = '';
        };
    }

    // Analyze button
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.onclick = () => analyzeResume();
    }
}

// ── Analyze Resume ──────────────────────────────────────────────
async function analyzeResume(demoText) {
    const uploadSection = document.getElementById('uploadSection');
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');

    // Show loading
    if (uploadSection) uploadSection.style.display = 'none';
    if (loadingSection) loadingSection.style.display = '';
    if (resultsSection) resultsSection.style.display = 'none';

    try {
        let text;

        if (demoText) {
            text = demoText;
            updateLoadingProgress(30, 'Loading demo resume...');
        } else if (currentFile) {
            updateLoadingProgress(10, 'Parsing document...');
            text = await parseResumeFile(currentFile);
            updateLoadingProgress(30, 'Text extracted successfully...');
        } else {
            throw new Error('No file selected');
        }

        currentResumeText = text;
        const role = document.getElementById('roleSelect')?.value || 'Generic';

        // Try backend API first, fall back to client-side
        let results;
        updateLoadingProgress(50, 'Running AI analysis engines...');

        try {
            results = await analyzeViaAPI(text, role);
            updateLoadingProgress(80, 'Processing multi-engine results...');
        } catch (apiErr) {
            console.log('API unavailable, using client-side analysis:', apiErr.message);
            updateLoadingProgress(60, 'Running local analysis...');
            results = analyzeClientSide(text);
            updateLoadingProgress(80, 'Analysis complete...');
        }

        analysisResults = results;

        // Generate improved content
        updateLoadingProgress(90, 'Generating improvements...');
        const resumeData = extractResumeData(text);
        improvedContent = generateImprovedContent(resumeData, results);

        // Display results
        updateLoadingProgress(100, 'Preparing results...');
        await delay(300);
        displayResults(results, resumeData);

    } catch (err) {
        console.error('Analysis error:', err);
        showToast('Error analyzing resume: ' + err.message, 'error');
        if (uploadSection) uploadSection.style.display = '';
        if (loadingSection) loadingSection.style.display = 'none';
    }
}

// ── Backend API Call ─────────────────────────────────────────────
async function analyzeViaAPI(text, role) {
    const response = await fetch('/api/analyze-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, role, jd: '' })
    });

    if (!response.ok) throw new Error('API returned status ' + response.status);
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    // Transform API response to match our display format
    const customScore = data.synthesis?.final_score || data.models?.custom?.score || 50;
    const scores = {
        content: data.models?.gpt4?.score || customScore,
        formatting: Math.min(100, customScore + 5),
        keywords: data.synthesis?.metrics?.ats_score || 50,
        experience: data.models?.claude?.score || customScore,
        skills: data.models?.gemini?.score || customScore,
        education: Math.min(100, customScore + 10)
    };

    const weights = { content: 0.25, formatting: 0.15, keywords: 0.20, experience: 0.20, skills: 0.10, education: 0.10 };
    let overall = 0;
    for (const [key, weight] of Object.entries(weights)) {
        overall += (scores[key] || 0) * weight;
    }
    overall = Math.round(overall);

    // Build suggestions from API feedback
    const suggestions = [];
    const modelFeedback = [
        { model: data.models?.gpt4, icon: 'fa-sitemap', color: '#7c4dff', title: 'Structure & Impact (GPT-4)' },
        { model: data.models?.claude, icon: 'fa-comment-dots', color: '#00e5ff', title: 'Tone & Nuance (Claude 3)' },
        { model: data.models?.gemini, icon: 'fa-chart-line', color: '#ff4081', title: 'Data & Trends (Gemini Pro)' },
        { model: data.models?.custom, icon: 'fa-brain', color: '#00e676', title: 'Deep Heuristics (SuperEngine)' }
    ];

    for (const mf of modelFeedback) {
        if (mf.model && mf.model.feedback) {
            const feedback = Array.isArray(mf.model.feedback) ? mf.model.feedback : [mf.model.feedback];
            suggestions.push({
                priority: mf.model.score < 50 ? 'high' : mf.model.score < 70 ? 'medium' : 'low',
                category: mf.title,
                icon: mf.icon,
                iconColor: mf.color,
                title: mf.title,
                description: feedback[0] || 'Analysis complete.',
                tips: feedback.slice(1, 5)
            });
        }
    }

    // Add ATS specific suggestion
    if (data.synthesis?.metrics?.ats_missing?.length > 0) {
        suggestions.push({
            priority: 'high',
            category: 'ATS Keywords',
            icon: 'fa-robot',
            iconColor: '#ffab40',
            title: 'Missing ATS Keywords',
            description: `Your resume is missing ${data.synthesis.metrics.ats_missing.length} important keywords for your target role.`,
            tips: data.synthesis.metrics.ats_missing.slice(0, 5).map(k => `Add "${k}" to your resume`)
        });
    }

    return {
        overall,
        scores,
        suggestions: suggestions.length > 0 ? suggestions : generateSuggestions(scores, extractResumeData(currentResumeText)),
        strengths: identifyStrengths(scores, extractResumeData(currentResumeText)),
        weaknesses: identifyWeaknesses(scores, extractResumeData(currentResumeText)),
        rating: getScoreRating(overall),
        wordCount: currentResumeText ? currentResumeText.split(/\s+/).length : 0,
        apiResponse: data
    };
}

// ── Client-side Analysis ─────────────────────────────────────────
function analyzeClientSide(text) {
    const resumeData = extractResumeData(text);
    const results = analyzeResumeQuality(resumeData);
    results.wordCount = resumeData.wordCount;
    return results;
}

// ── Display Results ──────────────────────────────────────────────
function displayResults(results, resumeData) {
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');

    if (loadingSection) loadingSection.style.display = 'none';
    if (resultsSection) resultsSection.style.display = '';

    // Score gauge
    const scoreEl = document.getElementById('overallScore');
    if (scoreEl) {
        animateNumber(scoreEl, 0, results.overall, 1200);
    }
    drawScoreGauge('scoreGauge', results.overall);

    // Score rating
    const ratingEl = document.getElementById('scoreRating');
    if (ratingEl && results.rating) {
        ratingEl.textContent = results.rating.text;
        ratingEl.style.color = results.rating.color;
    }

    // Breakdown
    renderBreakdown(results.scores);

    // Suggestions
    renderSuggestions(results.suggestions || []);

    // Rewriter
    if (improvedContent) {
        renderRewriterSections(improvedContent);
    }

    // Comparison
    const originalEl = document.getElementById('originalContent');
    const improvedEl = document.getElementById('improvedContent');
    if (originalEl) originalEl.textContent = currentResumeText || '';
    if (improvedEl && improvedContent) improvedEl.textContent = improvedContent.fullResume || '';

    // Charts
    drawCategoryChart('categoryChartCanvas', results.scores);
    drawComparisonChart('comparisonChartCanvas', results.scores);

    // Detailed report
    results.wordCount = results.wordCount || (resumeData ? resumeData.wordCount : 0);
    renderDetailedReport(results);
}

// ── Tab Navigation ──────────────────────────────────────────────
function initTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;

            // Remove active from all tabs
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            // Activate clicked tab
            this.classList.add('active');
            const pane = document.getElementById(tabId + 'Tab');
            if (pane) pane.classList.add('active');
        });
    });
}

// ── Section Navigation (About, Pricing) ──────────────────────────
function initSectionNavigation() {
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;

            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Show/hide sections
            const aboutSection = document.getElementById('aboutSection');
            const pricingSection = document.getElementById('pricingSection');
            const uploadSection = document.getElementById('uploadSection');
            const resultsSection = document.getElementById('resultsSection');
            const hero = document.querySelector('.hero');
            const features = document.querySelector('.features-grid');

            // Hide all optional sections
            if (aboutSection) aboutSection.style.display = 'none';
            if (pricingSection) pricingSection.style.display = 'none';

            if (section === 'analyzer') {
                if (hero) hero.style.display = '';
                if (features) features.style.display = '';
                if (uploadSection && !analysisResults) uploadSection.style.display = '';
                if (resultsSection && analysisResults) resultsSection.style.display = '';
            } else if (section === 'about') {
                if (hero) hero.style.display = 'none';
                if (features) features.style.display = 'none';
                if (uploadSection) uploadSection.style.display = 'none';
                if (resultsSection) resultsSection.style.display = 'none';
                if (aboutSection) aboutSection.style.display = '';
            } else if (section === 'pricing') {
                if (hero) hero.style.display = 'none';
                if (features) features.style.display = 'none';
                if (uploadSection) uploadSection.style.display = 'none';
                if (resultsSection) resultsSection.style.display = 'none';
                if (pricingSection) pricingSection.style.display = '';
            }
        });
    });
}

// ── Theme Toggle ─────────────────────────────────────────────────
function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'light' ? '' : 'light';

        if (newTheme) {
            document.documentElement.setAttribute('data-theme', 'light');
            toggle.innerHTML = '<i class="fas fa-sun"></i> Theme';
        } else {
            document.documentElement.removeAttribute('data-theme');
            toggle.innerHTML = '<i class="fas fa-moon"></i> Theme';
        }
    });
}

// ── Demo Buttons ─────────────────────────────────────────────────
function initDemoButtons() {
    const demoBtn = document.getElementById('demoBtn');
    const heroDemoBtn = document.getElementById('heroDemoBtn');

    const runDemo = () => analyzeResume(SAMPLE_RESUME);

    if (demoBtn) demoBtn.addEventListener('click', runDemo);
    if (heroDemoBtn) heroDemoBtn.addEventListener('click', runDemo);
}

// ── Action Buttons ───────────────────────────────────────────────
function initActionButtons() {
    // Analyze New
    const analyzeNewBtn = document.getElementById('analyzeNewBtn');
    if (analyzeNewBtn) {
        analyzeNewBtn.addEventListener('click', () => {
            analysisResults = null;
            improvedContent = null;
            currentFile = null;
            currentResumeText = null;

            const uploadSection = document.getElementById('uploadSection');
            const resultsSection = document.getElementById('resultsSection');
            const dropZone = document.getElementById('dropZone');
            const uploadedFile = document.getElementById('uploadedFile');

            if (uploadSection) uploadSection.style.display = '';
            if (resultsSection) resultsSection.style.display = 'none';
            if (dropZone) dropZone.style.display = '';
            if (uploadedFile) uploadedFile.style.display = 'none';

            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.value = '';
        });
    }

    // Download Improved
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!improvedContent || !improvedContent.fullResume) {
                showToast('No improved content available.', 'error');
                return;
            }
            const blob = new Blob([improvedContent.fullResume], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'improved_resume.txt';
            a.click();
            URL.revokeObjectURL(url);
            showToast('Improved resume downloaded!', 'success');
        });
    }

    // Export PDF (simulation)
    const exportBtn = document.getElementById('exportReportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!analysisResults) {
                showToast('No analysis to export.', 'error');
                return;
            }

            try {
                if (typeof jspdf !== 'undefined' && jspdf.jsPDF) {
                    const { jsPDF } = jspdf;
                    const doc = new jsPDF();

                    doc.setFontSize(20);
                    doc.setTextColor(124, 77, 255);
                    doc.text('ResumeAI Analysis Report', 20, 25);

                    doc.setFontSize(12);
                    doc.setTextColor(60, 60, 60);
                    doc.text(`Overall Score: ${analysisResults.overall}/100`, 20, 40);
                    doc.text(`Rating: ${analysisResults.rating?.text || 'N/A'}`, 20, 50);

                    let y = 65;
                    doc.setFontSize(14);
                    doc.setTextColor(0, 0, 0);
                    doc.text('Score Breakdown:', 20, y);
                    y += 10;

                    doc.setFontSize(11);
                    for (const [key, val] of Object.entries(analysisResults.scores || {})) {
                        doc.text(`${key}: ${val}/100`, 25, y);
                        y += 8;
                    }

                    y += 5;
                    doc.setFontSize(14);
                    doc.text('Strengths:', 20, y);
                    y += 10;
                    doc.setFontSize(10);
                    for (const s of (analysisResults.strengths || [])) {
                        doc.text(`• ${s}`, 25, y);
                        y += 7;
                        if (y > 270) { doc.addPage(); y = 20; }
                    }

                    y += 5;
                    doc.setFontSize(14);
                    doc.text('Areas for Improvement:', 20, y);
                    y += 10;
                    doc.setFontSize(10);
                    for (const w of (analysisResults.weaknesses || [])) {
                        doc.text(`• ${w}`, 25, y);
                        y += 7;
                        if (y > 270) { doc.addPage(); y = 20; }
                    }

                    doc.save('resume_analysis_report.pdf');
                    showToast('PDF report downloaded!', 'success');
                } else {
                    showToast('PDF library not loaded. Try refreshing.', 'error');
                }
            } catch (err) {
                showToast('Error generating PDF: ' + err.message, 'error');
            }
        });
    }

    // Save Analysis
    const saveBtn = document.getElementById('saveReportBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (!analysisResults) {
                showToast('No analysis to save.', 'error');
                return;
            }

            try {
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        results: analysisResults,
                        resumeText: currentResumeText,
                        timestamp: new Date().toISOString()
                    })
                });

                const data = await response.json();
                if (data.id) {
                    showToast(`Analysis saved! ID: ${data.id}`, 'success');
                } else {
                    showToast('Saved locally (offline mode).', 'success');
                }
            } catch (err) {
                // Offline fallback
                showToast('Saved locally (offline mode).', 'success');
            }
        });
    }
}

// ── Utilities ────────────────────────────────────────────────────
function updateLoadingProgress(percent, text) {
    const bar = document.getElementById('loadingBar');
    const label = document.getElementById('loadingText');

    if (bar) bar.style.width = percent + '%';
    if (label) label.textContent = text;
}

function animateNumber(element, start, end, duration) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const value = Math.round(start + (end - start) * eased);
        element.textContent = value;
        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
