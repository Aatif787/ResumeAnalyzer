"""
ResumeAI Pro — Deep Resume Analyzer v2
Truly dynamic analysis that adapts to actual resume content.
NO hardcoded scores — every metric is calculated from the text.
"""
import re
import math
import random


class DeepResumeAnalyzer:
    """Multi-dimensional resume analyzer with accurate per-content scoring."""

    def __init__(self, text, jd="", role="Generic"):
        self.text = text
        self.jd = jd.strip() if jd else ""
        self.role = role if role and role != "Auto-Detect" else "Generic"
        self.lines = [l.strip() for l in text.splitlines() if l.strip()]
        self.words = re.findall(r"\b[A-Za-z][A-Za-z'-]*\b", text)
        self.word_count = len(self.words)
        self.sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 8]
        self.bullet_lines = [l for l in self.lines if re.match(r'^[\-•*▪►◦‣⁃●]\s', l) or re.match(r'^\d+[\.\)]\s', l)]
        self.sections = self._detect_sections()
        self.section_texts = self._extract_section_texts()

        self.weak_words = [
            'responsible', 'helped', 'worked', 'assisted', 'participated',
            'handled', 'utilized', 'used', 'did', 'made', 'got', 'went',
            'tried', 'various', 'several', 'some', 'many', 'good', 'nice',
            'great', 'stuff', 'things', 'etc', 'really', 'very', 'basically',
            'just', 'involved', 'duties included', 'tasked with'
        ]

        self.action_verbs = [
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
        ]

        self._role_keywords = {
            'Software Engineer': [
                'python', 'javascript', 'react', 'node', 'typescript', 'api', 'sql',
                'docker', 'aws', 'git', 'ci/cd', 'agile', 'microservices', 'kubernetes',
                'rest', 'graphql', 'testing', 'database', 'cloud', 'devops', 'linux',
                'algorithm', 'data structures', 'html', 'css', 'java', 'c++', 'go',
                'rust', 'mongodb', 'postgresql', 'redis', 'kafka', 'terraform',
                'angular', 'vue', 'spring', 'django', 'flask', 'express', 'webpack'
            ],
            'Data Scientist': [
                'machine learning', 'deep learning', 'python', 'tensorflow',
                'pytorch', 'nlp', 'computer vision', 'statistics', 'regression',
                'classification', 'neural network', 'feature engineering',
                'model deployment', 'mlops', 'scikit-learn', 'pandas', 'numpy',
                'sql', 'r', 'experiment design', 'bayesian', 'reinforcement learning',
                'spark', 'hadoop', 'a/b testing', 'hypothesis testing'
            ],
            'Data Analyst': [
                'python', 'sql', 'pandas', 'numpy', 'tableau', 'excel', 'dashboard',
                'statistics', 'etl', 'visualization', 'power bi', 'data mining',
                'analytics', 'reporting', 'metrics', 'r', 'machine learning',
                'regression', 'hypothesis testing', 'a/b testing', 'data pipeline',
                'spark', 'hadoop', 'scikit-learn', 'matplotlib', 'seaborn', 'looker'
            ],
            'Product Manager': [
                'roadmap', 'stakeholder', 'user research', 'metrics', 'kpi', 'jira',
                'backlog', 'strategy', 'launch', 'market analysis', 'agile', 'scrum',
                'sprint', 'prioritization', 'mvp', 'okr', 'a/b testing',
                'customer journey', 'competitive analysis', 'go-to-market',
                'product-market fit', 'revenue', 'retention', 'churn', 'nps'
            ],
            'Designer': [
                'figma', 'sketch', 'prototype', 'ux', 'ui', 'wireframe',
                'accessibility', 'design system', 'responsive', 'user testing',
                'adobe', 'interaction', 'typography', 'color theory', 'heuristic',
                'persona', 'information architecture', 'usability', 'motion design'
            ],
            'Marketing Specialist': [
                'seo', 'sem', 'ppc', 'content marketing', 'social media',
                'google analytics', 'hubspot', 'email marketing', 'conversion rate',
                'brand strategy', 'copywriting', 'campaign', 'lead generation',
                'crm', 'marketing automation', 'roi', 'ctr', 'engagement'
            ],
            'DevOps Engineer': [
                'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform',
                'ansible', 'jenkins', 'ci/cd', 'linux', 'bash', 'python',
                'monitoring', 'prometheus', 'grafana', 'helm', 'gitlab',
                'infrastructure as code', 'cloud formation', 'nginx', 'load balancing'
            ],
            'Project Manager': [
                'project management', 'scrum', 'agile', 'waterfall', 'risk management',
                'budget', 'timeline', 'stakeholder', 'resource allocation', 'pmp',
                'jira', 'confluence', 'gantt', 'milestone', 'scope', 'deliverable',
                'cross-functional', 'communication', 'leadership', 'planning'
            ],
            'Generic': [
                'leadership', 'management', 'project', 'collaborated', 'delivered',
                'optimized', 'communication', 'planning', 'initiative', 'results',
                'team', 'strategy', 'problem-solving', 'analytical', 'budget',
                'stakeholder', 'presentation', 'cross-functional', 'deadline'
            ]
        }

        self._replacements = {
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
        }

    # ── Section Detection ────────────────────────────────────────
    def _detect_sections(self):
        patterns = {
            'summary': r'(?:professional\s+)?(?:summary|profile|objective|about\s*me|career\s+summary|personal\s+statement)',
            'experience': r'(?:work\s+)?(?:experience|employment|professional\s+experience|work\s+history|career\s+history)',
            'education': r'(?:education|academic|qualifications|degrees|academic\s+background)',
            'skills': r'(?:skills|technical\s+skills|core\s+competencies|technologies|proficiencies|expertise)',
            'projects': r'(?:projects|personal\s+projects|key\s+projects|portfolio)',
            'certifications': r'(?:certifications|certificates|licenses|credentials|professional\s+development)',
            'awards': r'(?:awards|honors|achievements|recognition)',
            'publications': r'(?:publications|papers|research)',
            'volunteer': r'(?:volunteer|community|extracurricular)',
            'languages': r'(?:languages|language\s+skills)',
        }
        found = {}
        for line in self.lines:
            clean = line.strip().rstrip(':').strip()
            for section, pat in patterns.items():
                if re.match(r'^' + pat + r'$', clean, re.I):
                    found[section] = True
        return found

    def _extract_section_texts(self):
        """Extract actual text content for each section."""
        section_patterns = {
            'summary': r'(?:professional\s+)?(?:summary|profile|objective|about\s*me|career\s+summary)',
            'experience': r'(?:work\s+)?(?:experience|employment|professional\s+experience|work\s+history)',
            'education': r'(?:education|academic|qualifications|degrees)',
            'skills': r'(?:skills|technical\s+skills|core\s+competencies|technologies)',
            'projects': r'(?:projects|personal\s+projects|key\s+projects)',
        }
        texts = {}
        current_section = None
        current_lines = []

        for line in self.lines:
            clean = line.strip().rstrip(':').strip()
            found_section = None
            for sec, pat in section_patterns.items():
                if re.match(r'^' + pat + r'$', clean, re.I):
                    found_section = sec
                    break

            if found_section:
                if current_section and current_lines:
                    texts[current_section] = '\n'.join(current_lines)
                current_section = found_section
                current_lines = []
            elif current_section:
                current_lines.append(line)

        if current_section and current_lines:
            texts[current_section] = '\n'.join(current_lines)

        return texts

    # ── Main Analysis ────────────────────────────────────────────
    def analyze(self):
        overall_score = self._calc_overall()
        ats_result = self._analyze_ats()
        readability = self._calc_readability()
        categories = self._calc_categories()
        weak_sections = self._detect_weak_sections()
        improvements = self._generate_improvements()
        jd_match = self._analyze_jd_match() if self.jd else None
        sw = self._detect_strengths_weaknesses(ats_result)
        faang = self._generate_faang()

        return {
            'overall_score': overall_score,
            'ats_score': ats_result['score'],
            'readability_score': readability,
            'categories': categories,
            'weak_sections': weak_sections,
            'strengths': sw['strengths'],
            'weaknesses': sw['weaknesses'],
            'ats_details': ats_result,
            'feedback': self._generate_feedback(categories),
            'improvements': improvements,
            'faang': faang,
            'jd_match': jd_match,
            'improved_resume': self._generate_full_improved_resume(),
            'stats': {
                'word_count': self.word_count,
                'bullet_count': len(self.bullet_lines),
                'section_count': len(self.sections),
                'action_verb_count': self._count_action_verbs(),
                'weak_word_count': self._count_weak_words(),
                'metric_count': len(re.findall(r'\d+[%$KkMm+]', self.text)),
            }
        }

    # ── Category Scoring (all truly dynamic) ─────────────────────
    def _calc_categories(self):
        return {
            'Content Quality': self._score_content(),
            'ATS Keywords': self._analyze_ats()['score'],
            'Formatting': self._score_formatting(),
            'Experience Impact': self._score_experience(),
            'Skills Coverage': self._score_skills(),
            'Education': self._score_education(),
        }

    def _calc_overall(self):
        cats = self._calc_categories()
        weights = {
            'Content Quality': 0.25,
            'ATS Keywords': 0.20,
            'Formatting': 0.15,
            'Experience Impact': 0.20,
            'Skills Coverage': 0.10,
            'Education': 0.10,
        }
        total = sum(cats[k] * weights[k] for k in cats)
        return min(100, max(0, round(total)))

    def _score_content(self):
        score = 0

        # Action verb usage (0-25)
        av_count = self._count_action_verbs()
        bullet_count = max(len(self.bullet_lines), 1)
        av_ratio = av_count / bullet_count
        if av_ratio >= 0.6:
            score += 25
        elif av_ratio >= 0.3:
            score += 15
        elif av_count >= 2:
            score += 8

        # Quantifiable metrics (0-25)
        metrics = re.findall(r'\d+[%$KkMm+]|\$[\d,.]+[KkMm]?', self.text)
        if len(metrics) >= 8:
            score += 25
        elif len(metrics) >= 4:
            score += 18
        elif len(metrics) >= 2:
            score += 10
        elif len(metrics) >= 1:
            score += 4

        # Weak word penalty (0-20, reduced by weak words)
        ww_count = self._count_weak_words()
        if ww_count == 0:
            score += 20
        elif ww_count <= 2:
            score += 14
        elif ww_count <= 4:
            score += 6

        # Summary quality (0-15)
        if 'summary' in self.section_texts:
            summary = self.section_texts['summary']
            swords = len(summary.split())
            if 20 <= swords <= 80:
                score += 10
            elif swords > 0:
                score += 4
            if re.search(r'\d', summary):
                score += 5
        elif 'summary' in self.sections:
            score += 5

        # Professional language (0-15)
        first_person = len(re.findall(r'\b(?:I|me|my|myself)\b', self.text))
        if first_person == 0:
            score += 15
        elif first_person <= 2:
            score += 8
        elif first_person <= 5:
            score += 3

        return min(100, max(0, score))

    def _score_formatting(self):
        score = 0
        contact = {}

        # Email (0-12)
        if re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', self.text):
            score += 12
            contact['email'] = True

        # Phone (0-8)
        if re.search(r'[\+]?[\d\s\(\)\-\.]{10,}', self.text):
            score += 8
            contact['phone'] = True

        # LinkedIn (0-8)
        if re.search(r'linkedin\.com/in/', self.text, re.I):
            score += 8

        # Section headers (0-20)
        essential = ['experience', 'education', 'skills']
        present = sum(1 for s in essential if s in self.sections)
        score += present * 7  # max 21, cap at 20
        score = min(score, 48)  # running cap

        # Bullet points (0-20)
        if len(self.bullet_lines) >= 8:
            score += 20
        elif len(self.bullet_lines) >= 4:
            score += 14
        elif len(self.bullet_lines) >= 1:
            score += 6

        # Length appropriateness (0-15)
        if 300 <= self.word_count <= 800:
            score += 15
        elif 200 <= self.word_count <= 1000:
            score += 10
        elif self.word_count >= 100:
            score += 4

        # Consistent formatting (0-9) — check that bullets exist in experience
        if 'experience' in self.section_texts:
            exp_text = self.section_texts['experience']
            exp_bullets = len(re.findall(r'^[\s]*[\-•*▪►]\s', exp_text, re.M))
            if exp_bullets >= 3:
                score += 9
            elif exp_bullets >= 1:
                score += 4

        return min(100, max(0, score))

    def _score_experience(self):
        if 'experience' not in self.sections and 'experience' not in self.section_texts:
            return 5  # No experience section at all

        score = 15  # Section exists

        exp_text = self.section_texts.get('experience', '')
        if not exp_text:
            return 15

        # Date ranges (shows multiple roles)
        dates = re.findall(r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s,]+\d{4}', exp_text, re.I)
        present = re.findall(r'\b(?:Present|Current|Now)\b', exp_text, re.I)
        total_dates = len(dates) + len(present)
        if total_dates >= 4:
            score += 20
        elif total_dates >= 2:
            score += 12
        elif total_dates >= 1:
            score += 5

        # Bullets in experience
        exp_bullets = [l for l in exp_text.split('\n') if re.match(r'^[\s]*[\-•*▪►]\s', l)]
        if len(exp_bullets) >= 8:
            score += 20
        elif len(exp_bullets) >= 4:
            score += 12
        elif len(exp_bullets) >= 1:
            score += 5

        # Metrics in experience
        exp_metrics = re.findall(r'\d+[%$KkMm+]|\$[\d,.]+', exp_text)
        if len(exp_metrics) >= 5:
            score += 20
        elif len(exp_metrics) >= 2:
            score += 12
        elif len(exp_metrics) >= 1:
            score += 5

        # Action verbs in experience
        exp_words = re.findall(r'\b\w+\b', exp_text.lower())
        exp_action = sum(1 for w in exp_words if w in self.action_verbs)
        if exp_action >= 6:
            score += 15
        elif exp_action >= 3:
            score += 10
        elif exp_action >= 1:
            score += 4

        # Impact language
        impact_phrases = ['resulting in', 'leading to', 'which led', 'saving', 'revenue', 'reduced', 'increased', 'improved', 'grew']
        impact_count = sum(1 for p in impact_phrases if p in exp_text.lower())
        if impact_count >= 3:
            score += 10
        elif impact_count >= 1:
            score += 5

        return min(100, max(0, score))

    def _score_skills(self):
        if 'skills' not in self.sections and 'skills' not in self.section_texts:
            return 5

        score = 15  # Section exists

        skills_text = self.section_texts.get('skills', '')
        if not skills_text:
            return 15

        # Count individual skills (split by common delimiters)
        skill_items = re.split(r'[,\n|•\-*▪►;]', skills_text)
        skill_items = [s.strip() for s in skill_items if s.strip() and len(s.strip()) > 1 and len(s.strip()) < 60]

        if len(skill_items) >= 15:
            score += 30
        elif len(skill_items) >= 10:
            score += 22
        elif len(skill_items) >= 5:
            score += 12
        elif len(skill_items) >= 1:
            score += 5

        # Organization (has sub-categories?)
        has_categories = bool(re.search(r'(?:languages|frameworks|tools|databases|platforms|technical|soft\s+skills|programming):', skills_text, re.I))
        if has_categories:
            score += 15
        elif len(skill_items) >= 5:
            score += 5

        # Relevance to role
        role_key = self.role if self.role in self._role_keywords else 'Generic'
        role_kws = self._role_keywords[role_key]
        text_lower = skills_text.lower()
        matched = sum(1 for kw in role_kws if kw.lower() in text_lower)
        ratio = matched / max(len(role_kws), 1)
        if ratio >= 0.3:
            score += 25
        elif ratio >= 0.15:
            score += 15
        elif matched >= 2:
            score += 8

        # Technical vs soft skills balance
        tech_indicators = ['python', 'java', 'sql', 'aws', 'react', 'docker', 'git', 'linux', 'api']
        soft_indicators = ['leadership', 'communication', 'teamwork', 'management', 'problem-solving']
        has_tech = any(t in text_lower for t in tech_indicators)
        has_soft = any(s in text_lower for s in soft_indicators)
        if has_tech and has_soft:
            score += 15
        elif has_tech or has_soft:
            score += 8

        return min(100, max(0, score))

    def _score_education(self):
        if 'education' not in self.sections and 'education' not in self.section_texts:
            return 5

        score = 25  # Section exists

        edu_text = self.section_texts.get('education', '')
        if not edu_text:
            return 25

        # Degree present
        if re.search(r'(?:bachelor|master|phd|associate|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|mba|doctorate|diploma|degree)', edu_text, re.I):
            score += 25

        # Institution name (usually capitalized words)
        if re.search(r'(?:university|college|institute|school|academy)', edu_text, re.I):
            score += 15

        # Graduation date
        if re.search(r'\b(?:19|20)\d{2}\b', edu_text):
            score += 15

        # GPA
        if re.search(r'(?:gpa|grade|cgpa)[\s:]*[\d.]+', edu_text, re.I):
            score += 10

        # Relevant coursework or honors
        if re.search(r'(?:coursework|honors|dean|magna|summa|cum laude|relevant|scholarship)', edu_text, re.I):
            score += 10

        return min(100, max(0, score))

    # ── ATS Analysis ─────────────────────────────────────────────
    def _analyze_ats(self):
        role_key = self.role if self.role in self._role_keywords else 'Generic'
        target = self._role_keywords[role_key]
        text_lower = self.text.lower()

        found = [kw for kw in target if kw.lower() in text_lower]
        missing = [kw for kw in target if kw.lower() not in text_lower]

        ratio = len(found) / max(len(target), 1)
        ats_score = min(100, max(0, round(ratio * 100)))

        return {
            'score': ats_score,
            'found': found,
            'missing': missing,
            'total_target': len(target),
            'found_count': len(found),
            'role': role_key,
        }

    # ── Readability ──────────────────────────────────────────────
    def _calc_readability(self):
        if self.word_count == 0 or len(self.sentences) == 0:
            return 30

        # Average words per sentence
        avg_wps = self.word_count / len(self.sentences)

        # Syllable counting
        total_syl = sum(self._syllables(w) for w in self.words)
        avg_syl = total_syl / max(self.word_count, 1)

        # Flesch Reading Ease (adapted for resumes)
        flesch = 206.835 - 1.015 * avg_wps - 84.6 * avg_syl

        # Adjust: resumes should be clear and concise (ideal: 50-70 Flesch)
        score = 0

        # Sentence length (ideal: 12-22 words)
        if 12 <= avg_wps <= 22:
            score += 35
        elif 8 <= avg_wps <= 30:
            score += 20
        else:
            score += 5

        # Bullet usage improves readability
        bullet_ratio = len(self.bullet_lines) / max(len(self.lines), 1)
        if bullet_ratio >= 0.3:
            score += 25
        elif bullet_ratio >= 0.15:
            score += 15
        elif len(self.bullet_lines) >= 1:
            score += 5

        # Short paragraphs
        long_lines = [l for l in self.lines if len(l.split()) > 40]
        if len(long_lines) == 0:
            score += 20
        elif len(long_lines) <= 2:
            score += 12

        # No jargon overload
        if avg_syl <= 1.8:
            score += 20
        elif avg_syl <= 2.2:
            score += 12
        else:
            score += 4

        return min(100, max(0, score))

    def _syllables(self, word):
        word = word.lower()
        vowels = re.findall(r'[aeiouy]+', word)
        count = len(vowels) if vowels else 1
        if word.endswith('e') and count > 1:
            count -= 1
        return max(1, count)

    # ── Weak Section Detection ───────────────────────────────────
    def _detect_weak_sections(self):
        weak = []

        # Summary
        if 'summary' not in self.sections:
            weak.append({
                'section': 'Summary',
                'severity': 'critical',
                'reason': 'No professional summary detected. Recruiters spend 6 seconds scanning — a strong summary is essential.'
            })
        elif 'summary' in self.section_texts:
            st = self.section_texts['summary']
            wc = len(st.split())
            if wc < 15:
                weak.append({
                    'section': 'Summary',
                    'severity': 'warning',
                    'reason': f'Summary is too short ({wc} words). Expand to 2-3 sentences highlighting your key value.'
                })
            if not re.search(r'\d', st):
                weak.append({
                    'section': 'Summary',
                    'severity': 'warning',
                    'reason': 'Summary lacks quantifiable metrics. Add numbers to show impact (e.g., "5+ years", "20% improvement").'
                })

        # Experience
        if 'experience' not in self.sections:
            weak.append({
                'section': 'Experience',
                'severity': 'critical',
                'reason': 'No work experience section found. This is the most critical section for most roles.'
            })
        elif 'experience' in self.section_texts:
            et = self.section_texts['experience']
            exp_bullets = [l for l in et.split('\n') if re.match(r'^[\s]*[\-•*▪►]\s', l)]
            exp_metrics = re.findall(r'\d+[%$KkMm+]|\$[\d,.]+', et)
            exp_weak = [w for w in re.findall(r'\b\w+\b', et.lower()) if w in self.weak_words]

            if len(exp_bullets) < 3:
                weak.append({
                    'section': 'Experience',
                    'severity': 'warning',
                    'reason': f'Only {len(exp_bullets)} bullet point(s) found. Use 3-5 achievement-oriented bullets per role.'
                })
            if len(exp_metrics) < 2:
                weak.append({
                    'section': 'Experience',
                    'severity': 'warning',
                    'reason': f'Only {len(exp_metrics)} metric(s) found in experience. Quantify your impact with numbers and percentages.'
                })
            if len(exp_weak) >= 3:
                examples = list(set(exp_weak))[:3]
                weak.append({
                    'section': 'Experience',
                    'severity': 'warning',
                    'reason': f'Weak words found: {", ".join(examples)}. Replace with strong action verbs.'
                })

        # Skills
        if 'skills' not in self.sections:
            weak.append({
                'section': 'Skills',
                'severity': 'critical',
                'reason': 'No skills section found. ATS systems heavily rely on keyword matching from this section.'
            })
        else:
            ats = self._analyze_ats()
            if ats['score'] < 40:
                weak.append({
                    'section': 'Skills',
                    'severity': 'critical',
                    'reason': f'ATS keyword match is only {ats["score"]}% for {ats["role"]}. Missing {len(ats["missing"])} key terms.'
                })
            elif ats['score'] < 65:
                weak.append({
                    'section': 'Skills',
                    'severity': 'warning',
                    'reason': f'ATS keyword match is {ats["score"]}%. Add more role-specific keywords to improve visibility.'
                })

        # Education
        if 'education' not in self.sections:
            weak.append({
                'section': 'Education',
                'severity': 'warning',
                'reason': 'No education section found. Include your highest degree and institution.'
            })

        # Projects (optional but helpful)
        if 'projects' not in self.sections and self._score_experience() < 60:
            weak.append({
                'section': 'Projects',
                'severity': 'info',
                'reason': 'Consider adding a Projects section to demonstrate additional hands-on experience.'
            })

        # If nothing is weak, add a positive note
        if not weak:
            weak.append({
                'section': 'All Sections',
                'severity': 'good',
                'reason': 'All major sections are well-structured. Focus on fine-tuning keywords and metrics.'
            })

        return weak

    # ── Feedback Generation ──────────────────────────────────────
    def _generate_feedback(self, categories):
        feedback = {}

        # Content feedback
        fb = []
        av = self._count_action_verbs()
        ww = self._count_weak_words()
        metrics = len(re.findall(r'\d+[%$KkMm+]|\$[\d,.]+', self.text))
        fp = len(re.findall(r'\b(?:I|me|my|myself)\b', self.text))

        if av >= 5:
            fb.append(f'✅ Strong action verb usage ({av} found)')
        elif av >= 2:
            fb.append(f'⚠️ Moderate action verb usage ({av} found). Aim for 5+ across your bullets.')
        else:
            fb.append(f'❌ Very few action verbs ({av} found). Start every bullet with a power verb.')

        if ww == 0:
            fb.append('✅ No weak/filler words detected')
        else:
            weak_list = list(set(w.lower() for w in self.words if w.lower() in self.weak_words))[:5]
            fb.append(f'⚠️ {ww} weak word(s) found: {", ".join(weak_list)}')

        if metrics >= 5:
            fb.append(f'✅ Excellent metric density ({metrics} quantifiable achievements)')
        elif metrics >= 2:
            fb.append(f'⚠️ Good start with {metrics} metric(s). Aim for 5+ numbers across your resume.')
        else:
            fb.append(f'❌ Only {metrics} metric(s). Add percentages, dollar amounts, and team sizes.')

        if fp > 3:
            fb.append(f'⚠️ {fp} first-person pronouns found. Remove "I", "me", "my" from resume.')
        feedback['Content Quality'] = fb

        # ATS feedback
        ats = self._analyze_ats()
        afb = []
        afb.append(f'Role analyzed: {ats["role"]}')
        afb.append(f'Keywords found: {ats["found_count"]}/{ats["total_target"]}')
        if ats['missing']:
            afb.append(f'Top missing: {", ".join(ats["missing"][:6])}')
        if ats['score'] >= 70:
            afb.append('✅ Good ATS coverage for this role')
        elif ats['score'] >= 40:
            afb.append('⚠️ Moderate ATS coverage. Add more role-specific keywords.')
        else:
            afb.append('❌ Low ATS coverage. Your resume may be filtered out by tracking systems.')
        feedback['ATS Keywords'] = afb

        # Formatting feedback
        ffb = []
        if re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', self.text):
            ffb.append('✅ Email address found')
        else:
            ffb.append('❌ No email found — always include a professional email')
        if 'linkedin' in self.text.lower():
            ffb.append('✅ LinkedIn profile included')
        else:
            ffb.append('⚠️ No LinkedIn URL found')
        if 300 <= self.word_count <= 800:
            ffb.append(f'✅ Good length ({self.word_count} words)')
        elif self.word_count < 200:
            ffb.append(f'⚠️ Too short ({self.word_count} words). Aim for 400-700.')
        elif self.word_count > 1000:
            ffb.append(f'⚠️ Too long ({self.word_count} words). Consider trimming to 1-2 pages.')
        else:
            ffb.append(f'ℹ️ Word count: {self.word_count}')
        ffb.append(f'Sections found: {len(self.sections)} ({", ".join(self.sections.keys())})')
        feedback['Formatting'] = ffb

        return feedback

    # ── Improvements ─────────────────────────────────────────────
    def _generate_improvements(self):
        improvements = {}

        for section_name in ['summary', 'experience', 'skills', 'education', 'projects']:
            original = self.section_texts.get(section_name, '')
            if not original:
                continue
            improved, changes = self._improve_section(section_name, original)
            improvements[section_name] = {
                'original': original.strip(),
                'improved': improved.strip(),
                'changes': changes,
            }

        return improvements

    def _improve_section(self, section_name, text):
        improved = text
        changes = []

        # Replace weak phrases
        for weak, strong in self._replacements.items():
            pattern = re.compile(r'\b' + re.escape(weak) + r'\b', re.I)
            if pattern.search(improved):
                improved = pattern.sub(strong, improved)
                changes.append(f'Replaced "{weak}" with "{strong}"')

        # Remove first-person pronouns
        for pronoun in ['I ', 'I\'ve ', 'I\'m ', ' me ', ' my ', ' myself ']:
            if pronoun in improved:
                if pronoun == 'I ':
                    improved = improved.replace('I was ', '').replace('I am ', '').replace('I have ', '').replace('I ', '')
                changes_added = f'Removed first-person pronoun: "{pronoun.strip()}"'
                if changes_added not in changes:
                    changes.append(changes_added)

        # For experience: ensure bullets start with action verbs
        if section_name == 'experience':
            lines = improved.split('\n')
            new_lines = []
            for line in lines:
                stripped = line.strip()
                if re.match(r'^[\-•*▪►]\s+[a-z]', stripped):
                    # Lowercase start — capitalize and consider adding verb
                    rest = re.sub(r'^[\-•*▪►]\s+', '', stripped)
                    rest = rest[0].upper() + rest[1:]
                    new_lines.append(f'• {rest}')
                    if 'Capitalized bullet point starts' not in changes:
                        changes.append('Capitalized bullet point starts')
                else:
                    new_lines.append(line)
            improved = '\n'.join(new_lines)

        # Add metric placeholders if none exist in experience
        if section_name == 'experience' and not re.search(r'\d+[%$]', improved):
            changes.append('Tip: Add quantifiable metrics (percentages, dollars, team sizes)')

        if not changes:
            changes.append('Section looks good — minor formatting improvements applied')

        return improved, changes

    # ── Full Improved Resume ─────────────────────────────────────
    def _generate_full_improved_resume(self):
        parts = []

        # Try to reconstruct from improved sections
        for section_name in ['summary', 'experience', 'education', 'skills', 'projects', 'certifications']:
            original = self.section_texts.get(section_name, '')
            if not original:
                continue

            header = section_name.upper().replace('_', ' ')
            improved, _ = self._improve_section(section_name, original)
            parts.append(f'{header}\n{improved}')

        if parts:
            return '\n\n'.join(parts)

        # Fallback: improve the whole text
        improved = self.text
        for weak, strong in self._replacements.items():
            pattern = re.compile(r'\b' + re.escape(weak) + r'\b', re.I)
            improved = pattern.sub(strong, improved)
        return improved

    # ── JD Match ─────────────────────────────────────────────────
    def _analyze_jd_match(self):
        if not self.jd:
            return None

        # Extract meaningful words from JD
        jd_words = re.findall(r'\b[a-zA-Z][a-zA-Z]+\b', self.jd.lower())
        stop_words = {
            'the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'will',
            'can', 'has', 'have', 'had', 'not', 'but', 'from', 'they', 'been',
            'its', 'you', 'your', 'our', 'who', 'which', 'their', 'about',
            'into', 'more', 'other', 'than', 'then', 'also', 'each', 'how',
            'all', 'would', 'there', 'when', 'make', 'like', 'such', 'through',
            'over', 'after', 'before', 'should', 'could', 'must', 'work',
            'working', 'ability', 'strong', 'including', 'using', 'used',
            'looking', 'role', 'position', 'team', 'experience', 'years',
            'join', 'company', 'what', 'best', 'well', 'get', 'use'
        }

        # Extract multi-word phrases (2-3 words)
        jd_text = self.jd.lower()
        bigrams = re.findall(r'\b([a-z]+\s+[a-z]+)\b', jd_text)
        trigrams = re.findall(r'\b([a-z]+\s+[a-z]+\s+[a-z]+)\b', jd_text)

        # Single word keywords (filtered)
        jd_keywords = set()
        for w in jd_words:
            if len(w) > 3 and w not in stop_words:
                jd_keywords.add(w)

        # Add meaningful phrases
        for phrase in bigrams + trigrams:
            words_in_phrase = phrase.split()
            if all(w not in stop_words for w in words_in_phrase) and len(phrase) > 6:
                jd_keywords.add(phrase)

        text_lower = self.text.lower()
        found = [kw for kw in jd_keywords if kw in text_lower]
        missing = [kw for kw in jd_keywords if kw not in text_lower]

        # Sort missing by likely importance (longer = more specific = more important)
        missing.sort(key=len, reverse=True)

        match_ratio = len(found) / max(len(jd_keywords), 1)
        match_score = min(100, max(0, round(match_ratio * 100)))

        # Generate suggestions
        suggestions = []
        if missing:
            suggestions.append(f'Add {len(missing[:10])} missing keywords found in the job description')
        if match_score < 50:
            suggestions.append('Your resume needs significant alignment with this job description')
        if match_score >= 70:
            suggestions.append('Good alignment! Fine-tune to match the remaining keywords.')

        return {
            'score': match_score,
            'found': found[:20],
            'missing': missing[:15],
            'total_keywords': len(jd_keywords),
            'suggestions': suggestions,
        }

    # ── Strengths & Weaknesses ────────────────────────────────────
    def _detect_strengths_weaknesses(self, ats_result):
        strengths, weaknesses = [], []
        av = self._count_action_verbs()
        ww = self._count_weak_words()
        metrics = len(re.findall(r'\d+[%$KkMm+]|\$[\d,.]+', self.text))
        fp = len(re.findall(r'\b(?:I|me|my|myself)\b', self.text))

        if av >= 5: strengths.append(f'Strong action verbs ({av} found)')
        else: weaknesses.append(f'Weak action verb usage (only {av}, aim for 5+)')
        if metrics >= 4: strengths.append(f'Good metric density ({metrics} quantifiable results)')
        else: weaknesses.append(f'Few quantifiable metrics ({metrics}). Add percentages, dollars.')
        if ww == 0: strengths.append('No weak filler words')
        else: weaknesses.append(f'{ww} weak/filler words found')
        if fp <= 1: strengths.append('Professional tone')
        else: weaknesses.append(f'{fp} first-person pronouns')
        if 'summary' in self.sections: strengths.append('Summary section present')
        else: weaknesses.append('Missing professional summary')
        if 'experience' in self.sections: strengths.append('Experience section included')
        else: weaknesses.append('No experience section')
        if 'skills' in self.sections: strengths.append('Skills section present')
        else: weaknesses.append('Missing skills section')
        if 'education' in self.sections: strengths.append('Education section present')
        if 'certifications' in self.sections: strengths.append('Certifications included')
        if 'projects' in self.sections: strengths.append('Projects section adds depth')
        if re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', self.text): strengths.append('Contact email included')
        if re.search(r'linkedin\.com/in/', self.text, re.I): strengths.append('LinkedIn profile linked')
        else: weaknesses.append('No LinkedIn URL')
        if ats_result['score'] >= 60: strengths.append(f'Good ATS coverage ({ats_result["score"]}%)')
        else: weaknesses.append(f'Low ATS match ({ats_result["score"]}% for {ats_result["role"]})')

        return {'strengths': strengths, 'weaknesses': weaknesses}

    # ── FAANG Optimization ────────────────────────────────────────
    def _generate_faang(self):
        faang_replacements = [
            (r'\b(?:was responsible for|responsible for)\b', 'Spearheaded', 'Spearheaded'),
            (r'\b(?:helped|assisted)\s+(?:with|in|to)?\s*', 'Drove ', 'Drove'),
            (r'\b(?:worked on|worked with)\b', 'Engineered', 'Engineered'),
            (r'\bcreated\b', 'Built', 'Built'),
            (r'\bmanaged\b', 'Orchestrated', 'Orchestrated'),
            (r'\bimproved\b', 'Optimized', 'Optimized'),
            (r'\bfixed\b', 'Resolved', 'Resolved'),
            (r'\bset up\b', 'Architected', 'Architected'),
            (r'\bstarted\b', 'Launched', 'Launched'),
            (r'\bran\b', 'Executed', 'Executed'),
            (r'\bmade\b', 'Delivered', 'Delivered'),
            (r'\bchanged\b', 'Transformed', 'Transformed'),
            (r'\bused\b', 'Leveraged', 'Leveraged'),
            (r'\bupdated\b', 'Modernized', 'Modernized'),
        ]
        faang_verbs = ['Built','Developed','Engineered','Designed','Implemented','Optimized','Architected','Scaled','Launched','Delivered','Spearheaded','Pioneered','Automated','Streamlined','Transformed']
        result = {}

        for sec in ['summary', 'experience', 'projects']:
            original = self.section_texts.get(sec, '')
            if not original:
                continue
            items = []
            for line in original.split('\n'):
                line_s = line.strip()
                if not line_s:
                    continue
                enhanced = line_s
                applied_verb = None
                for pattern, replacement, verb in faang_replacements:
                    if re.search(pattern, enhanced, re.I):
                        enhanced = re.sub(pattern, replacement, enhanced, count=1, flags=re.I)
                        applied_verb = verb
                        break
                if enhanced != line_s:
                    items.append({'before': line_s, 'after': enhanced, 'verb': applied_verb})
            if items:
                result[sec] = items

        if not result:
            result['_note'] = 'Resume already uses strong action verbs. Focus on quantifiable metrics for FAANG-level impact.'

        return result

    # ── Helpers ───────────────────────────────────────────────────
    def _count_action_verbs(self):
        return sum(1 for w in self.words if w.lower() in self.action_verbs)

    def _count_weak_words(self):
        return sum(1 for w in self.words if w.lower() in self.weak_words)
