"""
ResumeAI Deep Analyzer — Multi-engine resume analysis with structural,
tonal, data-driven, and ATS scoring.
"""
import re
import math
import random


class DeepResumeAnalyzer:
    """
    A comprehensive resume analyzer that simulates multi-model AI analysis.
    Produces structural, tonal, data-driven, and deep heuristic scores.
    """

    def __init__(self, text, jd="", role="Generic"):
        self.text = text
        self.jd = jd
        self.role = role
        self.lines = [l.strip() for l in text.splitlines() if l.strip()]
        self.words = re.findall(r"\b[A-Za-z][A-Za-z'-]*\b", text)
        self.word_count = len(self.words)
        self.sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
        self.sections = self._detect_sections()

        # Weak / filler words
        self.weak_words = [
            'responsible', 'helped', 'worked', 'assisted', 'participated',
            'handled', 'utilized', 'used', 'did', 'made', 'got', 'went',
            'tried', 'various', 'several', 'some', 'many', 'good', 'nice',
            'great', 'stuff', 'things', 'etc', 'really', 'very', 'basically',
            'just', 'involved', 'duties included', 'tasked with'
        ]

        # Power action verbs
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

        # Role-specific keywords
        self._role_keywords = {
            'Software Engineer': [
                'python', 'javascript', 'react', 'node', 'typescript', 'api', 'sql',
                'docker', 'aws', 'git', 'ci/cd', 'agile', 'microservices', 'kubernetes',
                'rest', 'graphql', 'testing', 'database', 'cloud', 'devops', 'linux',
                'algorithm', 'data structures', 'html', 'css', 'java', 'c++', 'go',
                'rust', 'mongodb', 'postgresql', 'redis', 'kafka', 'terraform'
            ],
            'Data Analyst': [
                'python', 'sql', 'pandas', 'numpy', 'tableau', 'excel', 'dashboard',
                'statistics', 'etl', 'visualization', 'power bi', 'data mining',
                'analytics', 'reporting', 'metrics', 'r', 'machine learning',
                'regression', 'hypothesis testing', 'a/b testing', 'data pipeline',
                'spark', 'hadoop', 'scikit-learn', 'matplotlib', 'seaborn'
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
            'Data Scientist': [
                'machine learning', 'deep learning', 'python', 'tensorflow',
                'pytorch', 'nlp', 'computer vision', 'statistics', 'regression',
                'classification', 'neural network', 'feature engineering',
                'model deployment', 'mlops', 'scikit-learn', 'pandas', 'numpy',
                'sql', 'r', 'experiment design', 'bayesian', 'reinforcement learning'
            ],
            'Marketing Specialist': [
                'seo', 'sem', 'ppc', 'content marketing', 'social media',
                'google analytics', 'hubspot', 'email marketing', 'conversion rate',
                'brand strategy', 'copywriting', 'campaign', 'lead generation',
                'crm', 'marketing automation', 'roi', 'ctr', 'engagement'
            ],
            'Generic': [
                'leadership', 'management', 'project', 'collaborated', 'delivered',
                'optimized', 'communication', 'planning', 'initiative', 'results',
                'team', 'strategy', 'problem-solving', 'analytical', 'budget',
                'stakeholder', 'presentation', 'cross-functional', 'deadline'
            ]
        }

        # Replacement map for rewrites
        self._replacements = {
            'responsible': 'spearheaded',
            'helped': 'facilitated',
            'worked': 'executed',
            'assisted': 'partnered',
            'participated': 'contributed',
            'handled': 'managed',
            'utilized': 'leveraged',
            'used': 'employed',
            'did': 'accomplished',
            'made': 'developed',
            'got': 'secured',
            'went': 'transitioned',
            'tried': 'pursued',
            'involved': 'engaged',
        }

    # ── Section Detection ────────────────────────────────────────────
    def _detect_sections(self):
        """Detect resume sections from header patterns."""
        section_patterns = {
            'summary': r'(?i)^(?:professional\s+)?(?:summary|profile|objective|about\s+me)',
            'experience': r'(?i)^(?:work\s+)?(?:experience|employment|professional\s+experience|work\s+history)',
            'education': r'(?i)^(?:education|academic|qualifications|degrees)',
            'skills': r'(?i)^(?:skills|technical\s+skills|core\s+competencies|technologies|proficiencies)',
            'projects': r'(?i)^(?:projects|personal\s+projects|key\s+projects)',
            'certifications': r'(?i)^(?:certifications|certificates|licenses|credentials)',
            'awards': r'(?i)^(?:awards|honors|achievements|recognition)',
            'publications': r'(?i)^(?:publications|papers|research)',
            'volunteer': r'(?i)^(?:volunteer|community|extracurricular)',
        }
        found = {}
        for line in self.lines:
            for section, pattern in section_patterns.items():
                if re.match(pattern, line):
                    found[section] = True
        return found

    # ── Core Analysis ────────────────────────────────────────────────
    def analyze(self):
        """Run full multi-engine analysis pipeline."""
        structural = self._score_structure()
        tone = self._score_tone()
        impact = self._score_impact()
        content = self._score_content()
        ats = self._analyze_ats()
        rewrites = self._generate_rewrites()

        return {
            'gpt4': {
                'score': structural,
                'feedback': self._feedback_structure()
            },
            'claude': {
                'score': tone,
                'feedback': self._feedback_tone()
            },
            'gemini': {
                'score': impact,
                'feedback': self._feedback_impact()
            },
            'custom': {
                'score': content,
                'feedback': self._feedback_deep(),
                'rewrites': rewrites
            },
            'ats_stats': ats,
            'visuals': self._build_visuals(structural, tone, impact, content)
        }

    # ── Structural Scoring (GPT-4 engine) ────────────────────────────
    def _score_structure(self):
        score = 0
        # Contact info present
        if re.search(r'\S+@\S+\.\S+', self.text):
            score += 12
        if re.search(r'[\d\(\)\-\+\s]{10,}', self.text):
            score += 8
        if 'linkedin' in self.text.lower():
            score += 5

        # Essential sections present
        essential = ['experience', 'education', 'skills']
        for s in essential:
            if s in self.sections:
                score += 10

        # Summary/Objective present
        if 'summary' in self.sections:
            score += 10

        # Bullet points usage
        bullet_lines = len([l for l in self.lines if re.match(r'^[\-•*▪►]\s', l)])
        if bullet_lines >= 5:
            score += 10
        elif bullet_lines >= 2:
            score += 5

        # Appropriate length (300-800 words ideal)
        if 300 <= self.word_count <= 800:
            score += 10
        elif 200 <= self.word_count <= 1000:
            score += 5

        # Section count bonus
        if len(self.sections) >= 4:
            score += 10
        elif len(self.sections) >= 3:
            score += 5

        # No obvious missing info
        if self.word_count > 50:
            score += 5

        return min(100, max(0, score))

    def _feedback_structure(self):
        fb = []
        if 'summary' not in self.sections:
            fb.append("⚠️ Missing Professional Summary — Add a 2-3 sentence summary at the top highlighting your key value proposition.")
        if 'experience' not in self.sections:
            fb.append("🔴 No Work Experience section detected — This is critical for most roles.")
        if 'education' not in self.sections:
            fb.append("⚠️ Education section missing — Include your highest degree and institution.")
        if 'skills' not in self.sections:
            fb.append("⚠️ Skills section missing — Add a dedicated skills section with relevant technologies and competencies.")
        if not re.search(r'\S+@\S+\.\S+', self.text):
            fb.append("🔴 No email address found — Always include a professional email.")
        if self.word_count < 200:
            fb.append("⚠️ Resume is too short ({} words). Aim for 400-700 words.".format(self.word_count))
        elif self.word_count > 1000:
            fb.append("⚠️ Resume is quite long ({} words). Consider trimming to 1-2 pages.".format(self.word_count))

        bullet_lines = len([l for l in self.lines if re.match(r'^[\-•*▪►]\s', l)])
        if bullet_lines < 3:
            fb.append("💡 Use more bullet points for experience descriptions — they improve readability and ATS parsing.")

        if len(self.sections) >= 4:
            fb.append("✅ Good section organization — your resume has clear, well-defined sections.")
        if not fb:
            fb.append("✅ Structural analysis looks solid. Resume is well-organized.")
        return fb

    # ── Tone Scoring (Claude engine) ─────────────────────────────────
    def _score_tone(self):
        score = 0
        text_lower = self.text.lower()

        # Action verb density
        action_count = sum(1 for w in self.words if w.lower() in self.action_verbs)
        ratio = action_count / max(self.word_count, 1)
        if ratio >= 0.03:
            score += 20
        elif ratio >= 0.015:
            score += 12
        elif ratio >= 0.005:
            score += 5

        # Weak word penalty
        weak_count = sum(1 for w in self.words if w.lower() in self.weak_words)
        if weak_count == 0:
            score += 20
        elif weak_count <= 2:
            score += 12
        elif weak_count <= 5:
            score += 5

        # Passive voice check
        passive = len(re.findall(r'\b(?:was|were|be|been|being|is|are)\s+\w+ed\b', self.text, re.I))
        if passive == 0:
            score += 15
        elif passive <= 2:
            score += 8

        # First-person avoidance (resumes shouldn't use I/me/my excessively)
        first_person = len(re.findall(r'\b(?:I|me|my|myself)\b', self.text))
        if first_person == 0:
            score += 10
        elif first_person <= 2:
            score += 5

        # Quantifiable achievements (numbers/percentages)
        metrics = len(re.findall(r'\b\d+[%$KkMm]?\b', self.text))
        if metrics >= 5:
            score += 20
        elif metrics >= 3:
            score += 12
        elif metrics >= 1:
            score += 5

        # Professional tone check (no casual language)
        casual_words = ['awesome', 'cool', 'amazing', 'super', 'totally', 'literally', 'honestly']
        casual_count = sum(1 for w in self.words if w.lower() in casual_words)
        if casual_count == 0:
            score += 10
        elif casual_count <= 1:
            score += 5

        # Sentence variety
        if len(self.sentences) > 0:
            lengths = [len(s.split()) for s in self.sentences]
            avg_len = sum(lengths) / len(lengths)
            if 10 <= avg_len <= 25:
                score += 5

        return min(100, max(0, score))

    def _feedback_tone(self):
        fb = []
        text_lower = self.text.lower()

        action_count = sum(1 for w in self.words if w.lower() in self.action_verbs)
        if action_count < 3:
            fb.append("⚠️ Low action verb usage — Start bullet points with strong verbs like 'Architected', 'Delivered', 'Optimized'.")
        else:
            fb.append("✅ Good use of action verbs ({} found).".format(action_count))

        weak_found = [w for w in set(w.lower() for w in self.words) if w in self.weak_words]
        if weak_found:
            fb.append("⚠️ Weak/filler words detected: {}. Replace with stronger alternatives.".format(', '.join(weak_found[:5])))

        passive = len(re.findall(r'\b(?:was|were|be|been|being|is|are)\s+\w+ed\b', self.text, re.I))
        if passive > 2:
            fb.append("⚠️ {} passive voice instances found. Switch to active voice for more impact.".format(passive))

        metrics = len(re.findall(r'\b\d+[%$KkMm]?\b', self.text))
        if metrics < 3:
            fb.append("💡 Add more quantifiable metrics — numbers, percentages, and dollar amounts make your impact tangible.")
        else:
            fb.append("✅ Good use of quantifiable metrics ({} found).".format(metrics))

        first_person = len(re.findall(r'\b(?:I|me|my|myself)\b', self.text))
        if first_person > 3:
            fb.append("⚠️ Excessive first-person pronouns ({}) — remove \"I\", \"me\", \"my\" from resume bullets.".format(first_person))

        if not fb:
            fb.append("✅ Resume tone is professional and impactful.")
        return fb

    # ── Impact / Data Scoring (Gemini engine) ────────────────────────
    def _score_impact(self):
        score = 0
        text_lower = self.text.lower()

        # Metrics density
        numbers = re.findall(r'\b\d+[%$KkMm+]?\b', self.text)
        percentages = re.findall(r'\d+%', self.text)
        dollars = re.findall(r'\$[\d,]+[KkMm]?', self.text)

        if len(numbers) >= 8:
            score += 20
        elif len(numbers) >= 4:
            score += 12
        elif len(numbers) >= 1:
            score += 5

        if len(percentages) >= 2:
            score += 10
        elif len(percentages) >= 1:
            score += 5

        if len(dollars) >= 1:
            score += 10

        # Impact keywords
        impact_words = ['increased', 'decreased', 'reduced', 'improved', 'grew',
                        'saved', 'generated', 'delivered', 'achieved', 'exceeded',
                        'revenue', 'profit', 'efficiency', 'productivity', 'performance']
        impact_count = sum(1 for w in self.words if w.lower() in impact_words)
        if impact_count >= 5:
            score += 15
        elif impact_count >= 3:
            score += 10
        elif impact_count >= 1:
            score += 5

        # Result-oriented language
        result_patterns = [
            r'result(?:ing|ed)?\s+in',
            r'leading\s+to',
            r'which\s+(?:increased|decreased|improved|reduced)',
            r'saving\s+\$?\d',
            r'by\s+\d+%',
        ]
        result_hits = sum(1 for p in result_patterns if re.search(p, text_lower))
        score += min(15, result_hits * 5)

        # Experience depth (multiple roles)
        date_ranges = re.findall(r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{4}', self.text, re.I)
        if len(date_ranges) >= 4:
            score += 10
        elif len(date_ranges) >= 2:
            score += 5

        # Skills breadth
        if 'skills' in self.sections:
            score += 10

        return min(100, max(0, score))

    def _feedback_impact(self):
        fb = []
        percentages = re.findall(r'\d+%', self.text)
        dollars = re.findall(r'\$[\d,]+[KkMm]?', self.text)
        numbers = re.findall(r'\b\d+[%$KkMm+]?\b', self.text)

        if len(percentages) < 2:
            fb.append("📊 Add more percentage metrics — e.g., 'Improved load time by 40%'.")
        if len(dollars) == 0:
            fb.append("💰 No dollar amounts found — Quantify business impact: 'Generated $500K in annual savings'.")
        if len(numbers) >= 5:
            fb.append("✅ Good data density — {} quantifiable metrics detected.".format(len(numbers)))

        impact_words = ['increased', 'decreased', 'reduced', 'improved', 'grew', 'saved', 'generated']
        impact_count = sum(1 for w in self.words if w.lower() in impact_words)
        if impact_count < 2:
            fb.append("💡 Use more impact verbs — 'Increased', 'Reduced', 'Generated' show measurable outcomes.")

        date_ranges = re.findall(r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)', self.text, re.I)
        if len(date_ranges) < 2:
            fb.append("⚠️ Add dates to your experience entries for career progression visibility.")

        fb.append("📈 Tip: Frame every bullet as [Action Verb] + [Task] + [Result with Number].")
        return fb

    # ── Deep Content Scoring (Custom Super Engine) ───────────────────
    def _score_content(self):
        s = self._score_structure()
        t = self._score_tone()
        i = self._score_impact()
        # Weighted blend
        return min(100, max(0, int(s * 0.3 + t * 0.35 + i * 0.35)))

    def _feedback_deep(self):
        fb = []
        score = self._score_content()
        if score >= 80:
            fb.append("🌟 Excellent resume! Your content is strong, well-structured, and impactful.")
        elif score >= 60:
            fb.append("👍 Good foundation. A few targeted improvements can push this into the top tier.")
        elif score >= 40:
            fb.append("⚠️ Your resume needs significant improvement in multiple areas.")
        else:
            fb.append("🔴 Major revision needed. Focus on structure, action verbs, and quantifiable results.")

        # Check critical elements
        if 'summary' not in self.sections:
            fb.append("Add a compelling Professional Summary as the first section.")
        if 'projects' in self.sections:
            fb.append("✅ Projects section detected — great for demonstrating hands-on experience.")
        if 'certifications' in self.sections:
            fb.append("✅ Certifications section adds credibility.")

        # Readability
        if self.word_count > 0 and len(self.sentences) > 0:
            avg_sentence_len = self.word_count / len(self.sentences)
            if avg_sentence_len > 30:
                fb.append("📝 Average sentence length is high ({:.0f} words). Break up long sentences.".format(avg_sentence_len))

        return fb

    # ── ATS Analysis ─────────────────────────────────────────────────
    def _analyze_ats(self):
        """Analyze ATS keyword compatibility for the target role."""
        role_key = self.role if self.role in self._role_keywords else 'Generic'
        target = self._role_keywords.get(role_key, self._role_keywords['Generic'])
        text_lower = self.text.lower()

        found = [kw for kw in target if kw.lower() in text_lower]
        missing = [kw for kw in target if kw.lower() not in text_lower]

        # Also check JD keywords if provided
        jd_missing = []
        if self.jd:
            jd_words = set(re.findall(r'\b[a-z][a-z]+\b', self.jd.lower()))
            common_words = {'the', 'and', 'for', 'with', 'that', 'this', 'are', 'was',
                           'will', 'can', 'has', 'have', 'had', 'not', 'but', 'from',
                           'they', 'been', 'its', 'you', 'your', 'our', 'who', 'which',
                           'their', 'about', 'into', 'more', 'other', 'than', 'then',
                           'also', 'each', 'how', 'all', 'would', 'there', 'when',
                           'make', 'like', 'such', 'through', 'over', 'after', 'before'}
            jd_keywords = jd_words - common_words
            for kw in jd_keywords:
                if len(kw) > 3 and kw not in text_lower:
                    jd_missing.append(kw)

        total_target = len(target)
        found_count = len(found)
        ats_score = min(100, int((found_count / max(total_target, 1)) * 100))

        return {
            'score': ats_score,
            'missing': missing[:15],
            'found': found,
            'jd_missing': jd_missing[:10] if jd_missing else [],
            'total_checked': total_target,
            'role': role_key
        }

    # ── Rewrite Engine ───────────────────────────────────────────────
    def _generate_rewrites(self):
        """Generate rewritten versions of weak sentences."""
        rewrites = []
        for line in self.lines:
            line_lower = line.lower()
            for weak in self.weak_words:
                if f" {weak} " in f" {line_lower} " or line_lower.startswith(weak):
                    rewritten = self._rewrite_sentence(line, weak)
                    if rewritten and rewritten != line:
                        rewrites.append(f"❌ \"{line}\" → ✅ \"{rewritten}\"")
                        break
            if len(rewrites) >= 8:
                break
        return rewrites

    def _rewrite_sentence(self, sentence, weak_word):
        """Rewrite a sentence by replacing a weak word with a power verb."""
        replacement = self._replacements.get(weak_word.lower())
        if not replacement:
            # Pick a contextual action verb
            replacement = random.choice(self.action_verbs[:15])

        # Simple replacement
        pattern = re.compile(re.escape(weak_word), re.IGNORECASE)
        rewritten = pattern.sub(replacement.capitalize(), sentence, count=1)

        # If the sentence starts with "Responsible for", restructure it
        resp_match = re.match(r'^(?:Responsible\s+for|Duties\s+included|Tasked\s+with)\s+(.+)', sentence, re.I)
        if resp_match:
            rest = resp_match.group(1)
            # Capitalize first word and add a power verb
            verb = random.choice(['Spearheaded', 'Led', 'Drove', 'Orchestrated', 'Managed'])
            rewritten = f"{verb} {rest}"

        return rewritten

    # ── Visuals Data ─────────────────────────────────────────────────
    def _build_visuals(self, structural, tone, impact, content):
        return {
            'radar': {
                'labels': ['Structure', 'Tone', 'Impact', 'ATS', 'Content', 'Readability'],
                'scores': [
                    structural,
                    tone,
                    impact,
                    self._analyze_ats()['score'],
                    content,
                    self._readability_score()
                ]
            },
            'breakdown': {
                'Structure': structural,
                'Tone & Voice': tone,
                'Impact & Metrics': impact,
                'Overall Content': content,
            }
        }

    def _readability_score(self):
        """Calculate Flesch Reading Ease approximation."""
        if self.word_count == 0:
            return 50
        syllable_count = sum(self._count_syllables(w) for w in self.words)
        sentence_count = max(len(self.sentences), 1)
        flesch = 206.835 - 1.015 * (self.word_count / sentence_count) - 84.6 * (syllable_count / self.word_count)
        return min(100, max(0, int(flesch)))

    def _count_syllables(self, word):
        word = word.lower()
        vowels = re.findall(r'[aeiouy]+', word)
        count = len(vowels) if vowels else 1
        if word.endswith('e') and count > 1:
            count -= 1
        return max(1, count)
