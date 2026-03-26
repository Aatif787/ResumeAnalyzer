/**
 * ResumeAI Rewriter — Content improvement and display module
 * Generates improved content, renders rewriter sections, and draws charts
 */

// ── Content Generation ─────────────────────────────────────────
function generateImprovedContent(data, analysis) {
    const result = {
        summary: improveSummary(data),
        experience: improveExperience(data),
        skills: improveSkills(data),
        education: improveEducation(data),
        fullResume: ''
    };

    // Build full improved resume text
    const parts = [];
    if (result.summary.improved) parts.push('PROFESSIONAL SUMMARY\n' + result.summary.improved);
    if (result.experience.improved) parts.push('EXPERIENCE\n' + result.experience.improved);
    if (result.skills.improved) parts.push('SKILLS\n' + result.skills.improved);
    if (result.education.improved) parts.push('EDUCATION\n' + result.education.improved);
    result.fullResume = parts.join('\n\n---\n\n');

    return result;
}

// ── Summary Improvement ─────────────────────────────────────────
function improveSummary(data) {
    const original = data.summary || 'No professional summary found.';
    let improved = original;
    const changes = [];

    if (!data.summary) {
        improved = `Results-driven professional with proven expertise in delivering impactful solutions. Demonstrated track record of driving efficiency, leading cross-functional initiatives, and exceeding organizational targets.`;
        changes.push('Generated a professional summary from scratch');
    } else {
        // Remove first person
        improved = improved.replace(/\bI am\b/gi, '');
        improved = improved.replace(/\bI have\b/gi, 'Possessing');
        improved = improved.replace(/\bmy\b/gi, '');
        if (improved !== original) changes.push('Removed first-person pronouns');

        // Add power phrases
        if (!/proven|demonstrated|track record/i.test(improved)) {
            improved = improved.replace(/\.$/, ' with a proven track record of delivering measurable results.');
            changes.push('Added impact-oriented closing statement');
        }
    }

    return { original, improved, changes };
}

// ── Experience Improvement ───────────────────────────────────────
function improveExperience(data) {
    const exp = data.experience;
    const original = exp ? exp.text : 'No experience section found.';
    let improved = original;
    const changes = [];

    if (!exp) {
        improved = `• Spearheaded [Project/Initiative], resulting in [X]% improvement in [Metric]\n• Collaborated with cross-functional teams to deliver [Outcome] on time and under budget\n• Optimized [Process] leading to $[Amount] in annual cost savings\n• Mentored [X] team members, increasing team productivity by [Y]%`;
        changes.push('Generated experience template with metric placeholders');
    } else {
        // Replace weak verbs
        const replacements = {
            'Responsible for': 'Spearheaded',
            'Helped with': 'Facilitated',
            'Worked on': 'Delivered',
            'Assisted in': 'Contributed to',
            'Was involved in': 'Drove',
            'Participated in': 'Engaged in',
            'Handled': 'Managed',
            'Used': 'Leveraged'
        };

        for (const [weak, strong] of Object.entries(replacements)) {
            const regex = new RegExp(weak, 'gi');
            if (regex.test(improved)) {
                improved = improved.replace(regex, strong);
                changes.push(`Replaced "${weak}" with "${strong}"`);
            }
        }

        // Add metrics suggestion markers
        if (!/\d+%/.test(improved)) {
            changes.push('Add quantifiable percentages to show impact');
        }
        if (!/\$[\d,]+/.test(improved)) {
            changes.push('Include dollar amounts where applicable');
        }
    }

    return { original, improved, changes };
}

// ── Skills Improvement ───────────────────────────────────────────
function improveSkills(data) {
    const sk = data.skills;
    const original = sk ? sk.text : 'No skills section found.';
    let improved = original;
    const changes = [];

    if (!sk) {
        improved = `Technical Skills: [Programming Languages], [Frameworks], [Databases]\nTools & Platforms: [Cloud Services], [DevOps Tools], [Version Control]\nSoft Skills: Leadership, Communication, Problem-Solving, Strategic Planning`;
        changes.push('Generated organized skills template');
    } else if (!sk.isOrganized) {
        // Try to organize skills
        improved = `Technical: ${sk.skills.slice(0, Math.ceil(sk.skills.length / 2)).join(', ')}\nProfessional: ${sk.skills.slice(Math.ceil(sk.skills.length / 2)).join(', ')}`;
        changes.push('Organized skills into categories');
    }

    if (sk && sk.count < 10) {
        changes.push('Consider adding more relevant skills (aim for 10-15)');
    }

    return { original, improved, changes };
}

// ── Education Improvement ────────────────────────────────────────
function improveEducation(data) {
    const edu = data.education;
    const original = edu ? edu.text : 'No education section found.';
    let improved = original;
    const changes = [];

    if (!edu) {
        improved = `[Degree Name] in [Major]\n[University Name], [City, State]\nGraduated: [Month Year] | GPA: [X.XX/4.00]\nRelevant Coursework: [Course 1], [Course 2], [Course 3]`;
        changes.push('Generated education template');
    } else {
        if (!edu.hasDegree) changes.push('Add specific degree name (B.S., M.S., etc.)');
        if (!edu.hasGraduationDate) changes.push('Include graduation date');
        if (!edu.hasGPA) changes.push('Consider adding GPA if above 3.5');
    }

    return { original, improved, changes };
}

// ── Display Functions ────────────────────────────────────────────

// Draw Score Gauge (Doughnut Chart)
function drawScoreGauge(canvasId, score) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if any
    if (canvas._chart) canvas._chart.destroy();

    const color = score >= 80 ? '#00e676' : score >= 60 ? '#00e5ff' : score >= 40 ? '#ffab40' : '#ff5252';

    canvas._chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [score, 100 - score],
                backgroundColor: [color, 'rgba(255,255,255,0.04)'],
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '78%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            animation: {
                animateRotate: true,
                duration: 1200,
                easing: 'easeOutCubic'
            }
        }
    });
}

// Draw Category Bar Chart
function drawCategoryChart(canvasId, breakdown) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (canvas._chart) canvas._chart.destroy();

    const labels = Object.keys(breakdown);
    const data = Object.values(breakdown);
    const colors = ['#7c4dff', '#00e5ff', '#ff4081', '#ffab40', '#00e676', '#536dfe'];

    canvas._chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Your Score',
                data,
                backgroundColor: colors.slice(0, labels.length).map(c => c + '80'),
                borderColor: colors.slice(0, labels.length),
                borderWidth: 1,
                borderRadius: 6,
                maxBarThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'x',
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#9fa8da', font: { size: 11 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9fa8da', font: { size: 11 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17,19,40,0.95)',
                    titleColor: '#e8eaf6',
                    bodyColor: '#9fa8da',
                    borderColor: 'rgba(124,77,255,0.3)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12
                }
            },
            animation: { duration: 1000, easing: 'easeOutCubic' }
        }
    });
}

// Draw Comparison Radar Chart
function drawComparisonChart(canvasId, scores) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (canvas._chart) canvas._chart.destroy();

    const labels = Object.keys(scores);
    const yourData = Object.values(scores);
    // Simulated industry average
    const avgData = labels.map(() => 55 + Math.floor(Math.random() * 15));

    canvas._chart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Your Resume',
                    data: yourData,
                    borderColor: '#7c4dff',
                    backgroundColor: 'rgba(124, 77, 255, 0.15)',
                    borderWidth: 2,
                    pointBackgroundColor: '#7c4dff',
                    pointRadius: 4
                },
                {
                    label: 'Industry Average',
                    data: avgData,
                    borderColor: '#00e5ff',
                    backgroundColor: 'rgba(0, 229, 255, 0.08)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointBackgroundColor: '#00e5ff',
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    angleLines: { color: 'rgba(255,255,255,0.05)' },
                    pointLabels: { color: '#9fa8da', font: { size: 11 } },
                    ticks: { display: false }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#9fa8da',
                        font: { size: 11 },
                        usePointStyle: true,
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17,19,40,0.95)',
                    titleColor: '#e8eaf6',
                    bodyColor: '#9fa8da',
                    borderColor: 'rgba(124,77,255,0.3)',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            animation: { duration: 1200, easing: 'easeOutCubic' }
        }
    });
}

// ── Render Rewriter Sections ─────────────────────────────────────
function renderRewriterSections(improvedContent) {
    const container = document.getElementById('rewriterSections');
    if (!container) return;

    const sections = [
        { key: 'summary', title: 'Professional Summary', icon: 'fa-user-tie' },
        { key: 'experience', title: 'Work Experience', icon: 'fa-briefcase' },
        { key: 'skills', title: 'Skills', icon: 'fa-tools' },
        { key: 'education', title: 'Education', icon: 'fa-graduation-cap' }
    ];

    container.innerHTML = sections.map(section => {
        const data = improvedContent[section.key];
        if (!data) return '';

        return `
            <div class="rewriter-section" data-section="${section.key}">
                <div class="rewriter-section-header" onclick="toggleRewriterSection(this)">
                    <h4><i class="fas ${section.icon}"></i> ${section.title}</h4>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="rewriter-section-body">
                    <h5 style="color: var(--accent-red); font-size: 0.8rem; margin-bottom: 8px;">ORIGINAL</h5>
                    <div class="original-text">${escapeHtml(data.original)}</div>

                    <h5 style="color: var(--accent-green); font-size: 0.8rem; margin-bottom: 8px;">IMPROVED</h5>
                    <div class="improved-text">${escapeHtml(data.improved)}</div>

                    ${data.changes.length > 0 ? `
                        <h5 style="color: var(--accent-secondary); font-size: 0.8rem; margin: 12px 0 8px;">IMPROVEMENTS MADE</h5>
                        <ul class="changes-list">
                            ${data.changes.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
                        </ul>
                    ` : ''}

                    <div style="margin-top: 16px; display: flex; gap: 8px;">
                        <button class="btn btn-secondary" onclick="copyToClipboard('${escapeHtml(data.improved)}')">
                            <i class="fas fa-copy"></i> Copy Improved
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleRewriterSection(header) {
    const section = header.parentElement;
    section.classList.toggle('open');
    const icon = header.querySelector('.fa-chevron-down, .fa-chevron-up');
    if (icon) {
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
    }
}

// ── Render Suggestions ───────────────────────────────────────────
function renderSuggestions(suggestions) {
    const container = document.getElementById('suggestionsContainer');
    if (!container) return;

    container.innerHTML = suggestions.map(s => `
        <div class="suggestion-card ${s.priority}">
            <div class="suggestion-icon" style="color: ${s.iconColor}">
                <i class="fas ${s.icon}"></i>
            </div>
            <div class="suggestion-content">
                <h4>${escapeHtml(s.title)}</h4>
                <p>${escapeHtml(s.description)}</p>
                ${s.tips ? `
                    <ul class="suggestion-tips">
                        ${s.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// ── Render Score Breakdown ───────────────────────────────────────
function renderBreakdown(scores) {
    const container = document.getElementById('breakdownItems');
    if (!container) return;

    const categories = [
        { key: 'content', label: 'Content Quality', color: '#7c4dff' },
        { key: 'formatting', label: 'Format & Structure', color: '#00e5ff' },
        { key: 'keywords', label: 'ATS Keywords', color: '#ff4081' },
        { key: 'experience', label: 'Work Experience', color: '#ffab40' },
        { key: 'skills', label: 'Skills Section', color: '#00e676' },
        { key: 'education', label: 'Education Details', color: '#536dfe' }
    ];

    container.innerHTML = categories.map(cat => {
        const score = scores[cat.key] || 0;
        return `
            <div class="breakdown-item">
                <span class="breakdown-label">${cat.label}</span>
                <div class="breakdown-bar-bg">
                    <div class="breakdown-bar" style="width: 0; background: ${cat.color};" data-target="${score}"></div>
                </div>
                <span class="breakdown-value" style="color: ${cat.color}">${score}</span>
            </div>
        `;
    }).join('');

    // Animate bars after render
    setTimeout(() => {
        container.querySelectorAll('.breakdown-bar').forEach(bar => {
            bar.style.width = bar.dataset.target + '%';
        });
    }, 100);
}

// ── Render Detailed Report ───────────────────────────────────────
function renderDetailedReport(analysisResults) {
    const container = document.getElementById('detailedReport');
    if (!container) return;

    const { strengths, weaknesses } = analysisResults;

    container.innerHTML = `
        <div class="report-section">
            <h4><i class="fas fa-check-circle" style="color: var(--accent-green)"></i> Strengths</h4>
            <ul>
                ${(strengths || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
            </ul>
        </div>
        <div class="report-section">
            <h4><i class="fas fa-exclamation-triangle" style="color: var(--accent-amber)"></i> Areas for Improvement</h4>
            <ul>
                ${(weaknesses || []).map(w => `<li>${escapeHtml(w)}</li>`).join('')}
            </ul>
        </div>
        <div class="report-section">
            <h4><i class="fas fa-info-circle" style="color: var(--accent-secondary)"></i> Resume Metrics</h4>
            <ul>
                <li>Word Count: ${analysisResults.wordCount || 'N/A'}</li>
                <li>Overall Score: ${analysisResults.overall || 'N/A'}/100</li>
                <li>Rating: ${analysisResults.rating?.text || 'N/A'}</li>
            </ul>
        </div>
    `;
}

// ── Utilities ────────────────────────────────────────────────────
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard!', 'success');
    });
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}
