/**
 * ResumeAI Pro — Full 7-Step Analyzer v3
 * Steps: Score → Strengths/Weaknesses → ATS → JD Match → Improve → FAANG → Generate
 */

const WEAK_WORDS = new Set(['responsible','helped','worked','assisted','participated','handled','utilized','used','did','made','got','went','tried','various','several','some','many','good','nice','great','stuff','things','etc','really','very','basically','just','involved','duties','tasked']);

const ACTION_VERBS = new Set(['achieved','accelerated','accomplished','architected','automated','boosted','built','championed','collaborated','consolidated','created','decreased','delivered','designed','developed','directed','eliminated','engineered','established','exceeded','executed','expanded','generated','grew','implemented','improved','increased','influenced','initiated','innovated','launched','led','maximized','mentored','modernized','negotiated','optimized','orchestrated','overhauled','pioneered','produced','reduced','reengineered','resolved','revamped','scaled','simplified','spearheaded','streamlined','strengthened','surpassed','transformed','unified','upgraded']);

const FAANG_VERBS = ['Built','Developed','Engineered','Designed','Implemented','Optimized','Architected','Scaled','Launched','Delivered','Spearheaded','Pioneered','Automated','Streamlined','Transformed'];

const ROLE_KEYWORDS = {
    'Software Engineer': ['python','javascript','react','node','typescript','api','sql','docker','aws','git','ci/cd','agile','microservices','kubernetes','rest','graphql','testing','database','cloud','devops','linux','algorithm','html','css','java','c++','go','mongodb','postgresql','redis','angular','vue'],
    'Data Scientist': ['machine learning','deep learning','python','tensorflow','pytorch','nlp','statistics','regression','classification','neural network','feature engineering','scikit-learn','pandas','numpy','sql','spark','a/b testing','hypothesis testing'],
    'Data Analyst': ['python','sql','pandas','numpy','tableau','excel','dashboard','statistics','etl','visualization','power bi','analytics','reporting','metrics','matplotlib','looker'],
    'Product Manager': ['roadmap','stakeholder','user research','metrics','kpi','jira','backlog','strategy','agile','scrum','sprint','prioritization','mvp','okr','a/b testing','go-to-market','revenue','retention'],
    'Designer': ['figma','sketch','prototype','ux','ui','wireframe','accessibility','design system','responsive','user testing','adobe','interaction','typography'],
    'DevOps Engineer': ['docker','kubernetes','aws','azure','gcp','terraform','ansible','jenkins','ci/cd','linux','bash','python','monitoring','prometheus','grafana','helm','nginx'],
    'Project Manager': ['project management','scrum','agile','risk management','budget','timeline','stakeholder','resource allocation','pmp','jira','milestone','cross-functional','leadership','planning'],
    'Marketing Specialist': ['seo','sem','ppc','content marketing','social media','google analytics','email marketing','conversion rate','brand strategy','copywriting','campaign','lead generation','crm','roi'],
    'Generic': ['leadership','management','project','collaborated','delivered','optimized','communication','planning','initiative','results','team','strategy','problem-solving','analytical','budget','stakeholder','presentation']
};

const REPLACEMENTS = {'responsible for':'Spearheaded','helped':'Facilitated','worked on':'Delivered','worked':'Executed','assisted':'Partnered with','participated':'Contributed to','handled':'Managed','utilized':'Leveraged','used':'Employed','did':'Accomplished','made':'Developed','got':'Secured','involved in':'Drove','duties included':'Delivered','tasked with':'Championed'};

// ── Section Detection ────────────────────────────────────────────
function detectSections(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const pats = {
        summary: /^(?:professional\s+)?(?:summary|profile|objective|about\s*me|career\s+summary|personal\s+statement)$/i,
        experience: /^(?:work\s+)?(?:experience|employment|professional\s+experience|work\s+history|career\s+history)$/i,
        education: /^(?:education|academic|qualifications|degrees|academic\s+background)$/i,
        skills: /^(?:skills|technical\s+skills|core\s+competencies|technologies|proficiencies|expertise)$/i,
        projects: /^(?:projects|personal\s+projects|key\s+projects|portfolio)$/i,
        certifications: /^(?:certifications|certificates|licenses|credentials|professional\s+development)$/i,
    };
    const found = {};
    for (const l of lines) { const c = l.trim().replace(/:$/,'').trim(); for (const [s,p] of Object.entries(pats)) { if (p.test(c)) found[s] = true; } }
    return found;
}

function extractSectionTexts(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const pats = {
        summary: /^(?:professional\s+)?(?:summary|profile|objective|about\s*me|career\s+summary)/i,
        experience: /^(?:work\s+)?(?:experience|employment|professional\s+experience|work\s+history)/i,
        education: /^(?:education|academic|qualifications|degrees)/i,
        skills: /^(?:skills|technical\s+skills|core\s+competencies|technologies)/i,
        projects: /^(?:projects|personal\s+projects|key\s+projects)/i,
    };
    const texts = {}; let cur = null, cl = [];
    for (const l of lines) {
        const c = l.trim().replace(/:$/,'').trim(); let fs = null;
        for (const [s,p] of Object.entries(pats)) { if (p.test(c)) { fs = s; break; } }
        if (fs) { if (cur && cl.length) texts[cur] = cl.join('\n'); cur = fs; cl = []; } else if (cur) cl.push(l);
    }
    if (cur && cl.length) texts[cur] = cl.join('\n');
    return texts;
}

// ── MAIN ANALYSIS ────────────────────────────────────────────────
function analyzeResumeFull(text, role, jd) {
    role = (role && role !== 'Auto-Detect') ? role : 'Generic';
    const lines = text.split('\n').filter(l => l.trim());
    const words = text.match(/\b[A-Za-z][A-Za-z'-]*\b/g) || [];
    const wc = words.length;
    const bullets = lines.filter(l => /^[\s]*[-•*▪►◦]\s/.test(l) || /^\d+[.)]\s/.test(l));
    const sections = detectSections(text); const sTexts = extractSectionTexts(text);

    const content = scoreContent(text, words, bullets, sTexts);
    const ats = analyzeATS(text, role);
    const fmt = scoreFormatting(text, lines, bullets, sections, wc, sTexts);
    const exp = scoreExperience(sections, sTexts);
    const skl = scoreSkills(sections, sTexts, role);
    const edu = scoreEducation(sections, sTexts);
    const read = calcReadability(text, words, lines, bullets);

    const cats = {'Content Quality':content,'ATS Keywords':ats.score,'Formatting':fmt,'Experience Impact':exp,'Skills Coverage':skl,'Education':edu};
    const wts = {'Content Quality':0.25,'ATS Keywords':0.20,'Formatting':0.15,'Experience Impact':0.20,'Skills Coverage':0.10,'Education':0.10};
    let overall = 0; for (const [k,w] of Object.entries(wts)) overall += (cats[k]||0)*w;
    overall = Math.min(100,Math.max(0,Math.round(overall)));

    const weakSections = detectWeakSections(sections, sTexts, ats, text, words);
    const sw = detectStrengthsWeaknesses(text, words, sections, sTexts, ats, cats);
    const feedback = generateFeedback(text, words, ats, sections, wc);
    const improvements = generateImprovements(sTexts);
    const faang = generateFAANG(sTexts);
    const jdMatch = jd ? analyzeJDMatch(text, jd) : null;
    const improved = generateImprovedResume(sTexts);

    return {
        overall_score: overall, ats_score: ats.score, readability_score: read,
        categories: cats, weak_sections: weakSections, strengths: sw.strengths, weaknesses: sw.weaknesses,
        ats_details: ats, feedback, improvements, faang, jd_match: jdMatch, improved_resume: improved,
        stats: { word_count: wc, bullet_count: bullets.length, section_count: Object.keys(sections).length, action_verb_count: words.filter(w=>ACTION_VERBS.has(w.toLowerCase())).length, weak_word_count: words.filter(w=>WEAK_WORDS.has(w.toLowerCase())).length, metric_count: (text.match(/\d+[%$KkMm+]/g)||[]).length }
    };
}

// ── Scoring Functions ────────────────────────────────────────────
function scoreContent(text,words,bullets,sTexts) {
    let s=0; const av=words.filter(w=>ACTION_VERBS.has(w.toLowerCase())).length, bc=Math.max(bullets.length,1), r=av/bc;
    if(r>=0.6)s+=25;else if(r>=0.3)s+=15;else if(av>=2)s+=8;
    const m=(text.match(/\d+[%$KkMm+]|\$[\d,.]+[KkMm]?/g)||[]);
    if(m.length>=8)s+=25;else if(m.length>=4)s+=18;else if(m.length>=2)s+=10;else if(m.length>=1)s+=4;
    const ww=words.filter(w=>WEAK_WORDS.has(w.toLowerCase())).length;
    if(ww===0)s+=20;else if(ww<=2)s+=14;else if(ww<=4)s+=6;
    if(sTexts.summary){const sw=sTexts.summary.split(/\s+/).length;if(sw>=20&&sw<=80)s+=10;else if(sw>0)s+=4;if(/\d/.test(sTexts.summary))s+=5;}
    const fp=(text.match(/\b(?:I|me|my|myself)\b/g)||[]).length;
    if(fp===0)s+=15;else if(fp<=2)s+=8;else if(fp<=5)s+=3;
    return Math.min(100,Math.max(0,s));
}

function analyzeATS(text,role) {
    const t=ROLE_KEYWORDS[role]||ROLE_KEYWORDS['Generic'], lo=text.toLowerCase();
    const f=t.filter(k=>lo.includes(k.toLowerCase())), mi=t.filter(k=>!lo.includes(k.toLowerCase()));
    return {score:Math.min(100,Math.max(0,Math.round(f.length/Math.max(t.length,1)*100))),found:f,missing:mi,total_target:t.length,found_count:f.length,role};
}

function scoreFormatting(text,lines,bullets,secs,wc,sTexts) {
    let s=0; if(/[\w.+-]+@[\w-]+\.[\w.]+/.test(text))s+=12; if(/[\+]?[\d\s().-]{10,}/.test(text))s+=8; if(/linkedin\.com\/in\//i.test(text))s+=8;
    s+=(['experience','education','skills'].filter(x=>secs[x]).length)*7; s=Math.min(s,48);
    if(bullets.length>=8)s+=20;else if(bullets.length>=4)s+=14;else if(bullets.length>=1)s+=6;
    if(wc>=300&&wc<=800)s+=15;else if(wc>=200&&wc<=1000)s+=10;else if(wc>=100)s+=4;
    if(sTexts.experience){const eb=(sTexts.experience.match(/^[\s]*[-•*▪►]\s/gm)||[]).length;if(eb>=3)s+=9;else if(eb>=1)s+=4;}
    return Math.min(100,Math.max(0,s));
}

function scoreExperience(secs,sTexts) {
    if(!secs.experience&&!sTexts.experience)return 5; let s=15;
    const et=sTexts.experience||''; if(!et)return 15;
    const d=(et.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s,]+\d{4}/gi)||[]), p=(et.match(/\b(?:Present|Current|Now)\b/gi)||[]);
    const td=d.length+p.length; if(td>=4)s+=20;else if(td>=2)s+=12;else if(td>=1)s+=5;
    const eb=et.split('\n').filter(l=>/^[\s]*[-•*▪►]\s/.test(l)); if(eb.length>=8)s+=20;else if(eb.length>=4)s+=12;else if(eb.length>=1)s+=5;
    const em=(et.match(/\d+[%$KkMm+]|\$[\d,.]+/g)||[]); if(em.length>=5)s+=20;else if(em.length>=2)s+=12;else if(em.length>=1)s+=5;
    const ew=(et.match(/\b\w+\b/g)||[]).map(w=>w.toLowerCase()), ea=ew.filter(w=>ACTION_VERBS.has(w)).length;
    if(ea>=6)s+=15;else if(ea>=3)s+=10;else if(ea>=1)s+=4;
    const ip=['resulting in','leading to','which led','saving','revenue','reduced','increased','improved','grew'];
    const ic=ip.filter(x=>et.toLowerCase().includes(x)).length; if(ic>=3)s+=10;else if(ic>=1)s+=5;
    return Math.min(100,Math.max(0,s));
}

function scoreSkills(secs,sTexts,role) {
    if(!secs.skills&&!sTexts.skills)return 5; let s=15; const st=sTexts.skills||''; if(!st)return 15;
    const items=st.split(/[,\n|•\-*▪►;]/).map(x=>x.trim()).filter(x=>x.length>1&&x.length<60);
    if(items.length>=15)s+=30;else if(items.length>=10)s+=22;else if(items.length>=5)s+=12;else if(items.length>=1)s+=5;
    if(/(?:languages|frameworks|tools|databases|platforms|technical|programming):/i.test(st))s+=15;else if(items.length>=5)s+=5;
    const rk=ROLE_KEYWORDS[role]||ROLE_KEYWORDS['Generic'], lo=st.toLowerCase(), mt=rk.filter(k=>lo.includes(k)).length, rt=mt/Math.max(rk.length,1);
    if(rt>=0.3)s+=25;else if(rt>=0.15)s+=15;else if(mt>=2)s+=8;
    const ti=['python','java','sql','aws','react','docker','git','linux','api'], si=['leadership','communication','teamwork','management','problem-solving'];
    if(ti.some(t=>lo.includes(t))&&si.some(x=>lo.includes(x)))s+=15;else if(ti.some(t=>lo.includes(t))||si.some(x=>lo.includes(x)))s+=8;
    return Math.min(100,Math.max(0,s));
}

function scoreEducation(secs,sTexts) {
    if(!secs.education&&!sTexts.education)return 5; let s=25; const et=sTexts.education||''; if(!et)return 25;
    if(/(?:bachelor|master|phd|associate|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|mba|doctorate|diploma|degree)/i.test(et))s+=25;
    if(/(?:university|college|institute|school|academy)/i.test(et))s+=15;
    if(/\b(?:19|20)\d{2}\b/.test(et))s+=15;
    if(/(?:gpa|grade|cgpa)[\s:]*[\d.]+/i.test(et))s+=10;
    if(/(?:coursework|honors|dean|magna|summa|cum laude|scholarship)/i.test(et))s+=10;
    return Math.min(100,Math.max(0,s));
}

function calcReadability(text,words,lines,bullets) {
    if(!words.length)return 30; let s=0;
    const sents=text.split(/(?<=[.!?])\s+/).filter(x=>x.trim().length>8), avg=words.length/Math.max(sents.length,1);
    if(avg>=12&&avg<=22)s+=35;else if(avg>=8&&avg<=30)s+=20;else s+=5;
    const br=bullets.length/Math.max(lines.length,1);
    if(br>=0.3)s+=25;else if(br>=0.15)s+=15;else if(bullets.length>=1)s+=5;
    if(lines.filter(l=>l.split(/\s+/).length>40).length===0)s+=20;else s+=12;
    function syl(w){const m=w.toLowerCase().match(/[aeiouy]+/g);let c=m?m.length:1;if(w.endsWith('e')&&c>1)c--;return Math.max(1,c);}
    const as=words.reduce((a,w)=>a+syl(w),0)/Math.max(words.length,1);
    if(as<=1.8)s+=20;else if(as<=2.2)s+=12;else s+=4;
    return Math.min(100,Math.max(0,s));
}

// ── STEP 2: Strengths & Weaknesses ───────────────────────────────
function detectStrengthsWeaknesses(text,words,sections,sTexts,ats,cats) {
    const strengths=[], weaknesses=[];
    const av=words.filter(w=>ACTION_VERBS.has(w.toLowerCase())).length;
    const ww=words.filter(w=>WEAK_WORDS.has(w.toLowerCase())).length;
    const metrics=(text.match(/\d+[%$KkMm+]|\$[\d,.]+/g)||[]).length;
    const fp=(text.match(/\b(?:I|me|my|myself)\b/g)||[]).length;

    if(av>=5) strengths.push(`Strong action verbs (${av} found)`); else weaknesses.push(`Weak action verb usage (only ${av} found, aim for 5+)`);
    if(metrics>=4) strengths.push(`Good metric density (${metrics} quantifiable results)`); else weaknesses.push(`Few quantifiable metrics (${metrics}). Add percentages, dollar amounts, headcounts.`);
    if(ww===0) strengths.push('No weak filler words detected'); else weaknesses.push(`${ww} weak/filler words found. Replace with impactful language.`);
    if(fp<=1) strengths.push('Professional tone — no excessive first-person pronouns'); else weaknesses.push(`${fp} first-person pronouns (I, me, my). Remove for professional tone.`);
    if(sections.summary) strengths.push('Professional summary section present'); else weaknesses.push('Missing professional summary — critical for first impressions');
    if(sections.experience) strengths.push('Work experience section included'); else weaknesses.push('No work experience section detected');
    if(sections.skills) strengths.push('Skills section present'); else weaknesses.push('Missing skills section — critical for ATS matching');
    if(sections.education) strengths.push('Education section present');
    if(sections.certifications) strengths.push('Certifications included');
    if(sections.projects) strengths.push('Projects section adds depth');
    if(/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) strengths.push('Contact email included');
    if(/linkedin\.com\/in\//i.test(text)) strengths.push('LinkedIn profile linked');
    else weaknesses.push('No LinkedIn URL found');
    if(ats.score>=60) strengths.push(`Good ATS keyword coverage (${ats.score}%)`); else weaknesses.push(`Low ATS keyword match (${ats.score}% for ${ats.role})`);

    return {strengths, weaknesses};
}

// ── Weak Section Detection ───────────────────────────────────────
function detectWeakSections(secs,sTexts,ats,text,words) {
    const w=[];
    if(!secs.summary) w.push({section:'Summary',severity:'critical',reason:'No professional summary. Recruiters spend 6 seconds scanning — this is essential.'});
    else if(sTexts.summary){const wc=sTexts.summary.split(/\s+/).length;if(wc<15)w.push({section:'Summary',severity:'warning',reason:`Summary too short (${wc} words). Expand to 2-3 impactful sentences.`});if(!/\d/.test(sTexts.summary))w.push({section:'Summary',severity:'warning',reason:'Summary lacks metrics. Add numbers to quantify your value.'});}

    if(!secs.experience) w.push({section:'Experience',severity:'critical',reason:'No experience section — the most critical section for most roles.'});
    else if(sTexts.experience){const et=sTexts.experience,bl=et.split('\n').filter(l=>/^[\s]*[-•*▪►]\s/.test(l)),mt=(et.match(/\d+[%$KkMm+]|\$[\d,.]+/g)||[]),wk=(et.match(/\b\w+\b/g)||[]).filter(x=>WEAK_WORDS.has(x.toLowerCase()));
    if(bl.length<3)w.push({section:'Experience',severity:'warning',reason:`Only ${bl.length} bullet(s). Use 3-5 per role.`});if(mt.length<2)w.push({section:'Experience',severity:'warning',reason:`Only ${mt.length} metric(s). Quantify achievements.`});if(wk.length>=3)w.push({section:'Experience',severity:'warning',reason:`Weak words: ${[...new Set(wk)].slice(0,3).join(', ')}`});}

    if(!secs.skills) w.push({section:'Skills',severity:'critical',reason:'No skills section. ATS depends on keyword matching.'});
    else if(ats.score<40)w.push({section:'Skills',severity:'critical',reason:`ATS match only ${ats.score}% for ${ats.role}. Missing ${ats.missing.length} terms.`});
    else if(ats.score<65)w.push({section:'Skills',severity:'warning',reason:`ATS match ${ats.score}%. Add more role-specific keywords.`});

    if(!secs.education)w.push({section:'Education',severity:'warning',reason:'No education section found.'});
    if(!w.length)w.push({section:'All Sections',severity:'good',reason:'All sections well-structured. Focus on keyword fine-tuning.'});
    return w;
}

// ── Feedback ─────────────────────────────────────────────────────
function generateFeedback(text,words,ats,secs,wc) {
    const fb={}; const av=words.filter(w=>ACTION_VERBS.has(w.toLowerCase())).length, ww=words.filter(w=>WEAK_WORDS.has(w.toLowerCase())).length;
    const m=(text.match(/\d+[%$KkMm+]|\$[\d,.]+/g)||[]).length, fp=(text.match(/\b(?:I|me|my|myself)\b/g)||[]).length;
    const c=[]; if(av>=5)c.push(`✓ Strong action verbs (${av})`);else c.push(`✗ Few action verbs (${av}). Aim for 5+.`);
    if(ww===0)c.push('✓ No filler words');else{const l=[...new Set(words.filter(w=>WEAK_WORDS.has(w.toLowerCase())))].slice(0,5);c.push(`✗ ${ww} weak words: ${l.join(', ')}`);}
    if(m>=5)c.push(`✓ Excellent metrics (${m})`);else if(m>=2)c.push(`○ ${m} metrics. Aim for 5+.`);else c.push(`✗ Only ${m}. Add percentages.`);
    if(fp>3)c.push(`✗ ${fp} first-person pronouns.`); fb['Content Quality']=c;

    const a=[`Role: ${ats.role}`,`Keywords: ${ats.found_count}/${ats.total_target}`];
    if(ats.missing.length)a.push(`Missing: ${ats.missing.slice(0,6).join(', ')}`);
    if(ats.score>=70)a.push('✓ Good ATS coverage');else if(ats.score>=40)a.push('○ Moderate. Add keywords.');else a.push('✗ Low. May be filtered out.');
    fb['ATS Keywords']=a;

    const f=[]; if(/[\w.+-]+@[\w-]+\.[\w.]+/.test(text))f.push('✓ Email');else f.push('✗ No email');
    if(/linkedin/i.test(text))f.push('✓ LinkedIn');else f.push('○ No LinkedIn');
    if(wc>=300&&wc<=800)f.push(`✓ Good length (${wc})`);else if(wc<200)f.push(`✗ Too short (${wc})`);else if(wc>1000)f.push(`○ Long (${wc})`);else f.push(`○ ${wc} words`);
    f.push(`Sections: ${Object.keys(secs).join(', ')}`); fb['Formatting']=f;
    return fb;
}

// ── Improvements ─────────────────────────────────────────────────
function generateImprovements(sTexts) {
    const imp={}; for(const sec of['summary','experience','skills','education','projects']){const o=sTexts[sec];if(!o)continue;const{improved:i,changes:c}=improveSection(sec,o);imp[sec]={original:o.trim(),improved:i.trim(),changes:c};} return imp;
}

function improveSection(name,text) {
    let imp=text; const ch=[];
    for(const[w,s]of Object.entries(REPLACEMENTS)){const re=new RegExp('\\b'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','gi');if(re.test(imp)){imp=imp.replace(re,s);ch.push(`Replaced "${w}" → "${s}"`);}}
    if(name==='experience'){imp=imp.split('\n').map(l=>{const m=l.match(/^([\s]*[-•*▪►]\s+)([a-z])(.*)/);if(m){if(!ch.includes('Capitalized bullets'))ch.push('Capitalized bullets');return m[1]+m[2].toUpperCase()+m[3];}return l;}).join('\n');}
    if(!ch.length)ch.push('Section looks good — minor polishing applied');
    return{improved:imp,changes:ch};
}

function generateImprovedResume(sTexts) {
    const parts=[]; for(const s of['summary','experience','education','skills','projects','certifications']){const o=sTexts[s];if(!o)continue;const{improved}=improveSection(s,o);parts.push(`${s.toUpperCase()}\n${improved}`);} return parts.length?parts.join('\n\n'):'';
}

// ── STEP 6: FAANG-Level Optimization ─────────────────────────────
function generateFAANG(sTexts) {
    const faang = {};

    const faangReplacements = [
        {from:/\b(?:was responsible for|responsible for)\b/gi, to:'Spearheaded', verb:'Spearheaded'},
        {from:/\b(?:helped|assisted)\s+(?:with|in|to)?\s*/gi, to:'Drove ', verb:'Drove'},
        {from:/\b(?:worked on|worked with)\b/gi, to:'Engineered', verb:'Engineered'},
        {from:/\bcreated\b/gi, to:'Built', verb:'Built'},
        {from:/\bdeveloped\b/gi, to:'Developed', verb:'Developed'},
        {from:/\bmanaged\b/gi, to:'Orchestrated', verb:'Orchestrated'},
        {from:/\bimproved\b/gi, to:'Optimized', verb:'Optimized'},
        {from:/\bfixed\b/gi, to:'Resolved', verb:'Resolved'},
        {from:/\bset up\b/gi, to:'Architected', verb:'Architected'},
        {from:/\bstarted\b/gi, to:'Launched', verb:'Launched'},
        {from:/\bran\b/gi, to:'Executed', verb:'Executed'},
        {from:/\bmade\b/gi, to:'Delivered', verb:'Delivered'},
        {from:/\bchanged\b/gi, to:'Transformed', verb:'Transformed'},
        {from:/\bused\b/gi, to:'Leveraged', verb:'Leveraged'},
        {from:/\bupdated\b/gi, to:'Modernized', verb:'Modernized'},
    ];

    for (const sec of ['summary', 'experience', 'projects']) {
        const original = sTexts[sec];
        if (!original) continue;

        const items = [];
        const lines = original.split('\n').filter(l => l.trim());

        for (const line of lines) {
            let enhanced = line;
            let appliedVerb = null;

            for (const rep of faangReplacements) {
                if (rep.from.test(enhanced)) {
                    enhanced = enhanced.replace(rep.from, rep.to);
                    appliedVerb = rep.verb;
                    break;
                }
            }

            // If no replacement found but line starts with bullet, try to enhance
            if (!appliedVerb && /^[\s]*[-•*▪►]\s/.test(line)) {
                const content = line.replace(/^[\s]*[-•*▪►]\s+/, '');
                const firstWord = content.split(/\s/)[0];
                if (firstWord && !ACTION_VERBS.has(firstWord.toLowerCase()) && !FAANG_VERBS.includes(firstWord)) {
                    const verb = FAANG_VERBS[Math.floor(Math.random() * FAANG_VERBS.length)];
                    enhanced = `• ${verb} ${content.charAt(0).toLowerCase() + content.slice(1)}`;
                    appliedVerb = verb;
                }
            }

            if (enhanced !== line) {
                items.push({ before: line.trim(), after: enhanced.trim(), verb: appliedVerb });
            }
        }

        if (items.length > 0) {
            faang[sec] = items;
        }
    }

    // If nothing was enhanced, add guidance
    if (Object.keys(faang).length === 0) {
        faang._note = 'Your resume already uses strong action verbs. Focus on adding quantifiable metrics to each bullet point for FAANG-level impact.';
    }

    return faang;
}

// ── JD Match ─────────────────────────────────────────────────────
function analyzeJDMatch(text,jd) {
    const sw=new Set(['the','and','for','with','that','this','are','was','will','can','has','have','had','not','but','from','they','been','its','you','your','our','who','which','their','about','into','more','other','than','then','also','each','how','all','would','there','when','make','like','such','through','over','after','before','should','could','must','work','working','ability','strong','including','using','used','looking','role','position','team','experience','years','join','company','what','best','well','get','use']);
    const jw=jd.toLowerCase().match(/\b[a-z]{4,}\b/g)||[], kw=new Set(jw.filter(w=>!sw.has(w)));
    const bg=jd.toLowerCase().match(/\b([a-z]+ [a-z]+)\b/g)||[];
    for(const b of bg){const ws=b.split(' ');if(ws.every(w=>!sw.has(w))&&b.length>6)kw.add(b);}
    const lo=text.toLowerCase(), f=[...kw].filter(k=>lo.includes(k)), m=[...kw].filter(k=>!lo.includes(k)).sort((a,b)=>b.length-a.length);
    const sc=Math.min(100,Math.max(0,Math.round(f.length/Math.max(kw.size,1)*100)));
    const sg=[]; if(m.length)sg.push(`Add ${Math.min(m.length,10)} missing keywords`); if(sc<50)sg.push('Significant alignment needed');if(sc>=70)sg.push('Good alignment! Fine-tune remaining.');
    return{score:sc,found:f.slice(0,20),missing:m.slice(0,15),total_keywords:kw.size,suggestions:sg};
}
