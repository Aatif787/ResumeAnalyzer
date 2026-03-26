/**
 * ResumeAI Pro — Main Controller v3
 * Handles upload, analysis, all tabs, gauges, FAANG, S/W panel, downloads.
 */

let currentFile = null, currentText = null, analysisData = null;

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
document.addEventListener('DOMContentLoaded', () => { initUpload(); initTabs(); initNav(); initActions(); });

function initUpload() {
    const dz = document.getElementById('dropZone'), fi = document.getElementById('fileInput');
    if (!dz || !fi) return;
    fi.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
    document.getElementById('analyzeBtn')?.addEventListener('click', () => startAnalysis());
}

function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf','docx','doc','txt'].includes(ext)) return toast('Unsupported format.','error');
    if (file.size > 10*1024*1024) return toast('File too large.','error');
    currentFile = file;
    document.getElementById('dropZone').style.display = 'none';
    const uf = document.getElementById('uploadedFile'); uf.style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = fmtSize(file.size);
    document.getElementById('removeFile').onclick = () => { currentFile = null; document.getElementById('dropZone').style.display = ''; uf.style.display = 'none'; document.getElementById('fileInput').value = ''; };
}

// ── Analysis Pipeline ────────────────────────────────────────────
async function startAnalysis(demoText) {
    show('loadingSection'); hide('uploadSection'); hide('resultsSection'); hide('heroSection'); hide('featuresSection');
    try {
        let text;
        if (demoText) { text = demoText; setLoad(1, 'Loading demo...'); }
        else if (currentFile) { setLoad(1, 'Parsing document...'); text = await parseFile(currentFile); setLoad(2, 'Text extracted...'); }
        else { toast('Please upload a resume.','error'); show('uploadSection'); hide('loadingSection'); show('heroSection'); show('featuresSection'); return; }
        currentText = text;
        const role = document.getElementById('roleSelect')?.value || 'Generic';
        const jd = document.getElementById('jobDescInput')?.value || '';
        setLoad(3, 'Running analysis...');
        let r;
        try { r = await apiAnalyze(text, role, jd); setLoad(5, 'Processing...'); }
        catch(e) { console.log('API unavailable:', e.message); setLoad(4, 'Local analysis...'); r = analyzeResumeFull(text, role, jd); setLoad(6, 'Complete...'); }
        analysisData = r;
        setLoad(7, 'Rendering...'); await delay(250);
        renderAll(r); hide('loadingSection'); show('resultsSection');
    } catch(e) { console.error(e); toast('Error: '+e.message,'error'); hide('loadingSection'); show('uploadSection'); show('heroSection'); show('featuresSection'); }
}

async function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'txt') return await file.text();
    if (ext === 'pdf' && typeof pdfjsLib !== 'undefined') {
        const buf = await file.arrayBuffer(), pdf = await pdfjsLib.getDocument({data:buf}).promise;
        let t = ''; for (let i=1;i<=pdf.numPages;i++) { const p = await pdf.getPage(i), c = await p.getTextContent(); t += c.items.map(x=>x.str).join(' ')+'\n'; } return t;
    }
    if ((ext==='docx'||ext==='doc') && typeof mammoth !== 'undefined') {
        const buf = await file.arrayBuffer(), r = await mammoth.extractRawText({arrayBuffer:buf}); return r.value;
    }
    return await file.text();
}

async function apiAnalyze(text, role, jd) {
    const r = await fetch('/api/analyze', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text,role,jd})});
    if (!r.ok) throw new Error('API '+r.status); const d = await r.json(); if (d.error) throw new Error(d.error); return d;
}

// ── Render All ───────────────────────────────────────────────────
function renderAll(r) {
    animScore('overallScore', r.overall_score, 'overallGauge', 160, 'overallLabel');
    animScore('atsScore', r.ats_score, 'atsGauge', 120, 'atsLabel');
    animScore('readabilityScore', r.readability_score, 'readabilityGauge', 120, 'readabilityLabel');
    renderSW(r.strengths || [], r.weaknesses || []);
    renderWeak(r.weak_sections || []);
    renderCatBars(r.categories || {});
    renderKeywords(r.ats_details || {});
    renderFeedback(r.feedback || {});
    renderImprovements(r.improvements || {});
    renderFAANG(r.faang || {});
    renderJobMatch(r.jd_match);
    renderDownload(r.improved_resume || '');
}

function animScore(elId, val, canvasId, size, labelId) {
    const el = document.getElementById(elId); if (el) animNum(el, 0, val, 1000);
    const cv = document.getElementById(canvasId); if (cv) drawGauge(cv, val, size);
    const lb = document.getElementById(labelId); if (lb) { const {text,color} = scoreLabel(val); lb.textContent = text; lb.style.color = color; }
}

function scoreLabel(s) {
    if (s>=85) return {text:'Excellent',color:'#7d8f69'};
    if (s>=70) return {text:'Strong',color:'#7d8f69'};
    if (s>=55) return {text:'Average',color:'#c4956a'};
    if (s>=40) return {text:'Needs Work',color:'#d4a574'};
    return {text:'Poor',color:'#c75c5c'};
}

function drawGauge(cv, val, size) {
    const ctx = cv.getContext('2d'), cx=size/2, cy=size/2, r=size/2-10;
    ctx.clearRect(0,0,size,size);
    ctx.beginPath(); ctx.arc(cx,cy,r,0.75*Math.PI,2.25*Math.PI);
    ctx.strokeStyle='#22222d'; ctx.lineWidth=size>140?10:7; ctx.lineCap='round'; ctx.stroke();
    const pct=Math.min(val,100)/100, end=0.75*Math.PI+pct*1.5*Math.PI, {color}=scoreLabel(val);
    ctx.beginPath(); ctx.arc(cx,cy,r,0.75*Math.PI,end);
    ctx.strokeStyle=color; ctx.lineWidth=size>140?10:7; ctx.lineCap='round'; ctx.stroke();
}

function renderSW(strengths, weaknesses) {
    const sl = document.getElementById('strengthsList'), wl = document.getElementById('weaknessesList');
    if (sl) sl.innerHTML = strengths.map(s => `<li>${esc(s)}</li>`).join('');
    if (wl) wl.innerHTML = weaknesses.map(w => `<li>${esc(w)}</li>`).join('');
}

function renderWeak(sections) {
    const l = document.getElementById('weakSectionsList'); if (!l) return;
    l.innerHTML = sections.map(s => `<div class="weak-item"><span class="severity-badge severity-${s.severity}">${s.severity}</span><div class="weak-item-content"><h5>${s.section}</h5><p>${s.reason}</p></div></div>`).join('');
}

function renderCatBars(cats) {
    const c = document.getElementById('categoryBars'); if (!c) return;
    c.innerHTML = Object.entries(cats).map(([n,v]) => {
        const {color} = scoreLabel(v);
        return `<div class="cat-bar-item"><span class="cat-bar-label">${n}</span><div class="cat-bar-track"><div class="cat-bar-fill" style="background:${color}" data-w="${v}%"></div></div><span class="cat-bar-value" style="color:${color}">${v}</span></div>`;
    }).join('');
    setTimeout(() => c.querySelectorAll('.cat-bar-fill').forEach(b => b.style.width = b.dataset.w), 80);
}

function renderKeywords(ats) {
    const ch = document.getElementById('keywordChips'), st = document.getElementById('keywordsSubtitle');
    if (st) st.textContent = `${ats.found_count||0}/${ats.total_target||0} keywords matched for ${ats.role||'Generic'}`;
    if (!ch) return;
    let h = ''; if (ats.found) h += ats.found.slice(0,10).map(k=>`<span class="keyword-chip found">${k}</span>`).join('');
    if (ats.missing) h += ats.missing.slice(0,12).map(k=>`<span class="keyword-chip">${k}</span>`).join('');
    ch.innerHTML = h;
}

function renderFeedback(fb) {
    const c = document.getElementById('feedbackSections'); if (!c) return;
    c.innerHTML = Object.entries(fb).map(([t,items]) => `<div class="feedback-block"><h5>${t}</h5><ul>${items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></div>`).join('');
}

function renderImprovements(imp) {
    const c = document.getElementById('improvementSections'); if (!c) return;
    if (!Object.keys(imp).length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><h4>All sections look good!</h4></div>'; return; }
    c.innerHTML = Object.entries(imp).map(([sec,d]) => `
        <div class="improvement-block">
            <div class="improvement-header" onclick="this.parentElement.classList.toggle('open')">
                <h5><i class="fas fa-pen-nib"></i> ${sec.charAt(0).toUpperCase()+sec.slice(1)}</h5>
                <i class="fas fa-chevron-down improvement-chevron"></i>
            </div>
            <div class="improvement-body">
                <p class="text-box-label text-box-label-original">Original</p>
                <div class="text-box text-box-original">${esc(d.original)}</div>
                <p class="text-box-label text-box-label-improved">Improved</p>
                <div class="text-box text-box-improved">${esc(d.improved)}</div>
                ${d.changes.length?`<ul class="changes-summary">${d.changes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
            </div>
        </div>`).join('');
}

function renderFAANG(faang) {
    const c = document.getElementById('faangContent'); if (!c) return;

    if (faang._note) {
        c.innerHTML = `<div class="faang-block"><h5><i class="fas fa-check-circle"></i> Already Strong</h5><p style="color:var(--text-secondary);font-size:0.85rem">${esc(faang._note)}</p></div>`;
        return;
    }

    const sectionNames = { summary: 'Summary', experience: 'Experience', projects: 'Projects' };
    let html = '';
    for (const [sec, items] of Object.entries(faang)) {
        if (sec === '_note') continue;
        html += `<div class="faang-block"><h5><i class="fas fa-building"></i> ${sectionNames[sec] || sec}</h5>`;
        html += items.map(item => `
            <div class="faang-item">
                <div class="faang-before">${esc(item.before)}</div>
                <div class="faang-after">${item.verb ? `<span class="faang-verb">${item.verb}</span>` : ''}${esc(item.after)}</div>
            </div>
        `).join('');
        html += '</div>';
    }
    c.innerHTML = html || '<div class="empty-state"><i class="fas fa-building"></i><h4>No FAANG optimizations needed</h4><p>Your resume already uses strong action verbs.</p></div>';
}

function renderJobMatch(jd) {
    const c = document.getElementById('jobMatchContent'); if (!c) return;
    if (!jd) { c.innerHTML = '<div class="empty-state"><i class="fas fa-bullseye"></i><h4>No Job Description Provided</h4><p>Paste a job description in the upload form and re-analyze.</p></div>'; return; }
    const {color} = scoreLabel(jd.score);
    c.innerHTML = `<div class="job-match-grid"><div class="match-score-panel"><canvas id="matchGauge" width="160" height="160"></canvas><h4>Match Score</h4><p class="score-label" style="color:${color}">${jd.score}/100</p><p style="font-size:0.78rem;color:var(--text-muted);margin-top:6px">${jd.total_keywords} keywords analyzed</p></div>
    <div class="match-details-panel"><div class="match-section"><h5>Missing Keywords</h5><div class="keyword-chips">${jd.missing.slice(0,12).map(k=>`<span class="keyword-chip">${k}</span>`).join('')}</div></div>
    <div class="match-section"><h5>Matched Keywords</h5><div class="keyword-chips">${jd.found.slice(0,12).map(k=>`<span class="keyword-chip found">${k}</span>`).join('')}</div></div>
    ${jd.suggestions.length?`<div class="match-section"><h5>Suggestions</h5><ul style="list-style:none">${jd.suggestions.map(s=>`<li style="font-size:0.82rem;color:var(--text-secondary);padding:3px 0">→ ${esc(s)}</li>`).join('')}</ul></div>`:''}</div></div>`;
    setTimeout(() => { const mc = document.getElementById('matchGauge'); if (mc) drawGauge(mc, jd.score, 160); }, 80);
}

function renderDownload(text) { const p = document.getElementById('resumePreview'); if (p) p.textContent = text || 'No improved resume generated.'; }

// ── Tabs ─────────────────────────────────────────────────────────
function initTabs() {
    document.addEventListener('click', e => {
        const btn = e.target.closest('.tab-btn'); if (!btn) return;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const pane = document.getElementById(btn.dataset.tab + 'Tab'); if (pane) pane.classList.add('active');
    });
}

// ── Navigation ───────────────────────────────────────────────────
function initNav() {
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault(); const sec = link.dataset.section;
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active')); link.classList.add('active');
            hide('aboutSection'); hide('pricingSection');
            if (sec==='analyzer') { show('heroSection'); show('featuresSection'); if (analysisData) show('resultsSection'); else show('uploadSection'); }
            else if (sec==='about') { hide('heroSection'); hide('featuresSection'); hide('uploadSection'); hide('resultsSection'); show('aboutSection'); }
            else if (sec==='pricing') { hide('heroSection'); hide('featuresSection'); hide('uploadSection'); hide('resultsSection'); show('pricingSection'); }
        });
    });
    document.getElementById('logoLink')?.addEventListener('click', e => {
        e.preventDefault(); document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
        document.querySelector('.nav-link[data-section="analyzer"]')?.classList.add('active');
        hide('aboutSection'); hide('pricingSection'); show('heroSection'); show('featuresSection');
        if (analysisData) show('resultsSection'); else show('uploadSection');
    });
}

// ── Actions ──────────────────────────────────────────────────────
function initActions() {
    document.getElementById('heroDemoBtn')?.addEventListener('click', () => startAnalysis(SAMPLE_RESUME));
    document.getElementById('heroCtaBtn')?.addEventListener('click', e => { e.preventDefault(); document.getElementById('uploadSection')?.scrollIntoView({behavior:'smooth'}); });
    document.getElementById('analyzeNewBtn')?.addEventListener('click', () => {
        analysisData = null; currentFile = null; currentText = null;
        hide('resultsSection'); show('heroSection'); show('featuresSection'); show('uploadSection');
        document.getElementById('dropZone').style.display = '';
        document.getElementById('uploadedFile').style.display = 'none';
        document.getElementById('fileInput').value = '';
        document.getElementById('jobDescInput').value = '';
    });
    document.getElementById('downloadTxtBtn')?.addEventListener('click', () => {
        if (!analysisData?.improved_resume) return toast('No improved resume.','error');
        dlFile(analysisData.improved_resume, 'improved_resume.txt', 'text/plain');
        toast('Downloaded!','success');
    });
    document.getElementById('exportPdfBtn')?.addEventListener('click', () => {
        if (!analysisData) return toast('No analysis.','error');
        exportPDF(analysisData);
    });
}

function exportPDF(r) {
    try {
        if (!jspdf?.jsPDF) return toast('PDF library not loaded.','error');
        const doc = new jspdf.jsPDF(); let y = 20;
        doc.setFontSize(20); doc.setTextColor(196,149,106); doc.text('ResumeAI Pro — Analysis Report', 20, y); y += 14;
        doc.setFontSize(11); doc.setTextColor(60,60,60);
        doc.text(`Resume Score: ${r.overall_score}/100`, 20, y); y += 7;
        doc.text(`ATS Score: ${r.ats_score}/100`, 20, y); y += 7;
        doc.text(`Readability: ${r.readability_score}/100`, 20, y); y += 12;

        doc.setFontSize(13); doc.setTextColor(0); doc.text('Strengths', 20, y); y += 7;
        doc.setFontSize(10); doc.setTextColor(60,60,60);
        for (const s of (r.strengths||[])) { const ls = doc.splitTextToSize(`✓ ${s}`, 170); for (const l of ls) { doc.text(l, 20, y); y += 5; } if (y>270){doc.addPage();y=20;} }
        y += 5;
        doc.setFontSize(13); doc.setTextColor(0); doc.text('Weaknesses', 20, y); y += 7;
        doc.setFontSize(10); doc.setTextColor(60,60,60);
        for (const w of (r.weaknesses||[])) { const ls = doc.splitTextToSize(`! ${w}`, 170); for (const l of ls) { doc.text(l, 20, y); y += 5; } if (y>270){doc.addPage();y=20;} }
        y += 5;
        doc.setFontSize(13); doc.setTextColor(0); doc.text('Category Breakdown', 20, y); y += 7;
        doc.setFontSize(10); doc.setTextColor(60,60,60);
        for (const [k,v] of Object.entries(r.categories||{})) { doc.text(`  ${k}: ${v}/100`, 20, y); y += 6; }
        y += 5;
        doc.setFontSize(13); doc.setTextColor(0); doc.text('Weak Sections', 20, y); y += 7;
        doc.setFontSize(9); doc.setTextColor(60,60,60);
        for (const w of (r.weak_sections||[])) { const t=`[${w.severity.toUpperCase()}] ${w.section}: ${w.reason}`; const ls=doc.splitTextToSize(t,170); for(const l of ls){doc.text(l,20,y);y+=5;} y+=2; if(y>270){doc.addPage();y=20;} }

        doc.save('resume_analysis_report.pdf');
        toast('PDF exported!','success');
    } catch(e) { toast('PDF error: '+e.message,'error'); }
}

// ── Loading ──────────────────────────────────────────────────────
function setLoad(step, text) {
    const l = document.getElementById('loadingText'); if (l) l.textContent = text;
    const b = document.getElementById('loadingBar'); if (b) b.style.width = (step/7*100)+'%';
    for (let i=1;i<=7;i++) { const e=document.getElementById('step'+i); if(e){e.classList.remove('active','done');if(i<step)e.classList.add('done');else if(i===step)e.classList.add('active');} }
}

// ── Utilities ────────────────────────────────────────────────────
function show(id) { const e=document.getElementById(id); if(e) e.style.display=''; }
function hide(id) { const e=document.getElementById(id); if(e) e.style.display='none'; }
function animNum(el,from,to,dur) { const st=performance.now(); function tick(n){const p=Math.min((n-st)/dur,1);el.textContent=Math.round(from+(to-from)*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(tick);} requestAnimationFrame(tick); }
function fmtSize(b) { if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'; }
function delay(ms) { return new Promise(r=>setTimeout(r,ms)); }
function esc(s) { const d=document.createElement('div');d.textContent=s;return d.innerHTML; }
function dlFile(c,n,t) { const b=new Blob([c],{type:t}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=n;a.click();URL.revokeObjectURL(u); }
function toast(msg,type='success') { document.querySelector('.toast')?.remove(); const t=document.createElement('div');t.className=`toast ${type}`;t.innerHTML=`<i class="fas fa-${type==='success'?'check-circle':'exclamation-circle'}"></i> ${esc(msg)}`;document.body.appendChild(t);setTimeout(()=>t.remove(),4000); }
