import os
import json
import uuid
import time
import random
from flask import Flask, request, jsonify, make_response, send_from_directory, send_file
from utils.parser import extract_text
from utils.analyzer import DeepResumeAnalyzer
from utils.generator import ResumeGenerator

app = Flask(__name__, static_url_path='', static_folder='.')

if os.environ.get('VERCEL'):
    DATA_DIR = os.path.join('/tmp', 'data', 'reports')
else:
    DATA_DIR = os.path.join(os.path.dirname(__file__), 'data', 'reports')
os.makedirs(DATA_DIR, exist_ok=True)

def cors(resp):
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return resp

@app.route('/api/health', methods=['GET'])
def health():
    return cors(jsonify(status='ok'))

@app.route('/api/analyze-multi', methods=['POST', 'OPTIONS'])
def analyze_multi():
    if request.method == 'OPTIONS':
        return cors(make_response('', 200))
    
    try:
        print("DEBUG: analyze_multi CALLED")
        text = ""
        jd = ""
        role = "Generic"
        
        # Handle Multipart Form Data (File Upload)
        if request.content_type and 'multipart/form-data' in request.content_type:
            if 'file' in request.files:
                file = request.files['file']
                text = extract_text(file)
            else:
                text = request.form.get('text', '')
                
            jd = request.form.get('jd', '')
            role = request.form.get('role', 'Generic')
        # Handle JSON
        else:
            body = request.get_json(force=True)
            text = body.get('text') or ''
            jd = body.get('jd') or ''
            role = body.get('role') or 'Generic'
            
        print(f"DEBUG: Received role='{role}', jd_length={len(jd)}, text_length={len(text)}")
        
        if not text.strip():
            return cors(jsonify(error="No resume text provided")), 400
        
        # Run Deep Analysis
        analyzer = DeepResumeAnalyzer(text, jd, role)
        analysis_result = analyzer.analyze()
        
        # Construct Response matching Frontend Expectation
        result = {
            "models": {
                "gpt4": {
                    "name": "GPT-4 (Structural)", 
                    "score": analysis_result['gpt4']['score'], 
                    "feedback": analysis_result['gpt4']['feedback'], 
                    "focus": "Structure & Impact"
                },
                "claude": {
                    "name": "Claude 3 (Tone)", 
                    "score": analysis_result['claude']['score'], 
                    "feedback": analysis_result['claude']['feedback'], 
                    "focus": "Tone & Nuance"
                },
                "gemini": {
                    "name": "Gemini Pro (Data)", 
                    "score": analysis_result['gemini']['score'], 
                    "feedback": analysis_result['gemini']['feedback'], 
                    "focus": "Data & Trends"
                },
                "custom": {
                    "name": "Trae SuperEngine", 
                    "score": analysis_result['custom']['score'], 
                    "feedback": analysis_result['custom']['feedback'], 
                    "rewrites": analysis_result['custom'].get('rewrites', []),
                    "focus": "Deep Heuristics"
                }
            },
            "synthesis": {
                "final_score": analysis_result['custom']['score'], # Use custom as final for now
                "summary": "Resume analyzed. Focus on quantifying impact and ensuring all key sections are present.",
                "optimized_content": text + "\n\n[AI OPTIMIZED SUGGESTIONS]\n" + "\n".join(analysis_result['custom']['feedback'][:3]),
                "rewrites": analysis_result['custom'].get('rewrites', []),
                "visuals": analysis_result.get('visuals', {}),
                "metrics": {
                    "readability": 0, # Calculated in DeepAnalyzer implicitly, can expose if needed
                    "word_count": len(text.split()),
                    "sentence_count": len(text.split('.')),
                    "ats_score": analysis_result['ats_stats']['score'],
                    "ats_missing": analysis_result['ats_stats']['missing']
                }
            }
        }
        
        return cors(jsonify(result))
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return cors(jsonify(error=str(e))), 500


@app.route('/', methods=['GET'])
def root():
    try:
        resp = send_from_directory(os.path.dirname(__file__), 'index.html')
        return cors(resp)
    except Exception as e:
        return cors(jsonify(error=str(e))), 500

@app.route('/api/save', methods=['POST', 'OPTIONS'])
def save():
    if request.method == 'OPTIONS':
        return cors(make_response('', 200))
    try:
        payload = request.get_json(force=True)
        rid = str(uuid.uuid4())
        path = os.path.join(DATA_DIR, f'{rid}.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return cors(jsonify(id=rid))
    except Exception as e:
        return cors(jsonify(error=str(e))), 400

@app.route('/api/report/<rid>', methods=['GET'])
def report(rid):
    path = os.path.join(DATA_DIR, f'{rid}.json')
    if not os.path.exists(path):
        return cors(jsonify(error='not_found')), 404
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return cors(jsonify(data))

@app.route('/api/generate-resume', methods=['POST', 'OPTIONS'])
def generate_resume():
    if request.method == 'OPTIONS':
        return cors(make_response('', 200))
    try:
        data = request.get_json(force=True)
        # Options
        options = data.get('options', {})
        fmt = options.get('format', 'docx')
        
        generator = ResumeGenerator(data, options)
        file_stream = generator.generate()
        
        if fmt == 'pdf':
             return send_file(
                file_stream,
                as_attachment=True,
                download_name='resume.pdf',
                mimetype='application/pdf'
            )
        else:
             return send_file(
                file_stream,
                as_attachment=True,
                download_name='resume.docx',
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return cors(jsonify(error=str(e))), 500

@app.route('/api/generate-suggestions', methods=['POST', 'OPTIONS'])
def generate_suggestions():
    if request.method == 'OPTIONS':
        return cors(make_response('', 200))
    try:
        body = request.get_json(force=True)
        role = body.get('role', 'Generic')
        type = body.get('type', 'bullets') # 'bullets' or 'summary'
        
        # Mock AI Generation with High-Quality Templates
        suggestions = []
        
        if type == 'summary':
            templates = {
                "software_engineer": [
                    "Results-oriented Software Engineer with [X] years of experience architecting scalable distributed systems using Python and React. Proven track record of reducing latency by [Y]% and improving system reliability.",
                    "Full Stack Developer specializing in cloud-native applications. Expert in AWS, Node.js, and CI/CD pipelines. Passionate about writing clean, maintainable code and mentoring junior developers.",
                    "Innovative Engineering Lead with a focus on high-performance algorithms and data structures. Successfully delivered [Project Name] resulting in a [Z]% increase in user engagement."
                ],
                "product_manager": [
                    "Strategic Product Manager with experience leading cross-functional teams to deliver user-centric products. Skilled in agile methodologies, data analysis, and stakeholder management.",
                    "Data-driven PM with a background in [Industry]. Successfully launched [Product] achieving $1M ARR in the first year. Expert in roadmap planning and feature prioritization.",
                    "Customer-obsessed Product Leader focused on improving UX and driving retention. Led the redesign of [Platform] resulting in a [X]% increase in NPS."
                ],
                "data_scientist": [
                    "Analytical Data Scientist with expertise in machine learning and statistical modeling. Proficient in Python, SQL, and TensorFlow. Experience deploying models to production to solve complex business problems.",
                    "Insight-driven Data Analyst skilled in transforming raw data into actionable strategies. Expert in Tableau and PowerBI visualization. Helped optimize marketing spend by [X]%."
                ],
                "generic": [
                    "Motivated professional with [X] years of experience in [Field]. Proven ability to drive results and collaborate effectively in fast-paced environments.",
                    "Dedicated [Role] with a strong background in [Skill A] and [Skill B]. Committed to delivering high-quality work and exceeding organizational goals."
                ]
            }
            key = role.lower().replace(" ", "_")
            suggestions = templates.get(key, templates['generic'])
            
        elif type == 'bullets':
            templates = {
                "software_engineer": [
                    "Architected and deployed a microservices-based application using Docker and Kubernetes, improving scalability by 40%.",
                    "Optimized database queries in PostgreSQL, reducing average response time from 500ms to 50ms.",
                    "Led a team of 5 developers in migrating legacy codebase to React, resulting in a 20% increase in developer velocity.",
                    "Implemented a CI/CD pipeline using Jenkins, reducing deployment time by 60%.",
                    "Developed a RESTful API serving 1M+ daily requests with 99.99% uptime."
                ],
                "product_manager": [
                    "Defined and executed product roadmap for [Product], resulting in a 30% year-over-year revenue growth.",
                    "Conducted user research and usability testing to identify pain points, leading to a 15% increase in conversion rate.",
                    "Collaborated with engineering and design teams to launch [Feature] on time and under budget.",
                    "Prioritized product backlog based on customer feedback and business impact, ensuring alignment with company goals.",
                    "Analyzed market trends and competitor landscape to identify new opportunities for growth."
                ],
                "marketing_specialist": [
                    "Designed and executed a multi-channel marketing campaign that generated 5,000+ leads in Q3.",
                    "Managed social media strategy across LinkedIn and Twitter, growing follower base by 200%.",
                    "Optimized email marketing sequences, increasing open rates by 25% and click-through rates by 10%.",
                    "Created compelling content for company blog, driving a 40% increase in organic traffic.",
                    "Analyzed campaign performance using Google Analytics to refine strategy and maximize ROI."
                ],
                 "generic": [
                    "Led [Project Name] from conception to completion, ensuring all deliverables were met on time.",
                    "Collaborated with [Team] to improve [Process], resulting in a [X]% increase in efficiency.",
                    "Analyzed data to identify trends and make informed decisions, driving [Outcome].",
                    "Managed budget of $[Amount], consistently staying within allocated resources."
                ]
            }
            key = role.lower().replace(" ", "_")
            suggestions = templates.get(key, templates['generic'])

        return cors(jsonify(suggestions=suggestions))
        
    except Exception as e:
        return cors(jsonify(error=str(e))), 400

@app.route('/api/rewrite-bullet', methods=['POST', 'OPTIONS'])
def rewrite_bullet():
    if request.method == 'OPTIONS':
        return cors(make_response('', 200))
    try:
        body = request.get_json(force=True)
        text = body.get('text', '')
        role = body.get('role', 'Generic')
        
        if not text:
            return cors(jsonify(suggestion=None))
            
        # Reuse Analyzer logic
        analyzer = DeepResumeAnalyzer(text, "", role)
        # We need to access _rewrite_sentence directly or via _generate_rewrites
        # _generate_rewrites returns a list of formatted strings.
        # Let's try to find a match manually using the analyzer's dictionaries
        
        suggestion = None
        text_lower = text.lower()
        
        # Check role specific flavors first (logic copied from analyzer to expose single result)
        # Or better, just use the analyzer's method if we can access it. 
        # But _rewrite_sentence requires a specific weak word.
        
        # Let's find a weak word
        found_weak = None
        for weak in analyzer.weak_words:
            if f" {weak} " in text_lower or text_lower.startswith(weak):
                found_weak = weak
                break
        
        if found_weak:
            suggestion = analyzer._rewrite_sentence(text, found_weak)
        
        return cors(jsonify(suggestion=suggestion))
        
    except Exception as e:
        return cors(jsonify(error=str(e))), 400

def split_sentences(text: str):
    import re
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+', text or '') if s.strip()]

def split_words(text: str):
    import re
    return re.findall(r"\b[A-Za-z][A-Za-z'-]*\b", text or '')

def estimate_syllables(word: str):
    w = ''.join([c for c in word.lower() if c.isalpha()])
    if not w:
        return 0
    import re
    vowels = re.findall(r'[aeiouy]+', w)
    count = len(vowels) if vowels else 1
    if w.endswith('e'):
        count = max(1, count - 1)
    return count

def role_keywords(role: str):
    role = (role or 'generic').lower()
    m = {
        'software engineer': ['javascript','react','node','typescript','api','sql','docker','aws','git','testing'],
        'data analyst': ['python','sql','pandas','numpy','tableau','excel','dashboard','statistics','etl','visualization'],
        'product manager': ['roadmap','stakeholder','user research','metrics','kpi','jira','backlog','strategy','launch','market'],
        'designer': ['figma','sketch','prototype','ux','ui','wireframe','accessibility','design system','responsive','layout'],
        'generic': ['leadership','management','project','collaborated','delivered','optimized','communication','planning','initiative','results']
    }
    return m.get(role, m['generic'])

@app.route('/api/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    if request.method == 'OPTIONS':
        return cors(make_response('', 200))
    try:
        body = request.get_json(force=True)
        text = body.get('text') or ''
        role = body.get('role') or 'generic'
        sentences = split_sentences(text)
        words = split_words(text)
        syllables = sum(estimate_syllables(w) for w in words)
        S = max(len(sentences), 1)
        W = max(len(words), 1)
        Y = max(syllables, 1)
        flesch = round(206.835 - 1.015 * (W / S) - 84.6 * (Y / W))
        fk = round(0.39 * (W / S) + 11.8 * (Y / W) - 15.59)
        import re
        passive = len(re.findall(r'\b(?:was|were|be|been|being|is|are)\s+\w+ed\b', text, flags=re.I))
        lines = [l.strip() for l in text.splitlines()]
        verbs = ['achieved','developed','implemented','managed','led','created','improved','increased','decreased','designed','coordinated','analyzed','executed','delivered','optimized','built','architected','owned','drove']
        action_starts = sum(1 for l in lines if re.match(r'^\s*(?:[-•*\u2022]\s*)?(?:' + '|'.join(verbs) + r')\b', l, flags=re.I))
        action_density = round((action_starts / max(len(lines), 1)) * 100)
        mmYYYY = len(re.findall(r'\b(?:0?[1-9]|1[0-2])[/.-]\d{4}\b', text))
        monYYYY = len(re.findall(r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b', text, flags=re.I))
        yearOnly = len(re.findall(r'\b(19|20)\d{2}\b', text))
        patterns = []
        if mmYYYY: patterns.append('MM/YYYY')
        if monYYYY: patterns.append('Mon YYYY')
        if yearOnly: patterns.append('YYYY only')
        consistent = len(patterns) <= 1
        email_valid = bool(re.search(r'\S+@\S+\.\S+', text))
        phone_valid = len(re.sub(r'\D', '', text)) >= 10
        target = role_keywords(role)
        tlower = text.lower()
        missing = [k for k in target if k.lower() not in tlower]
        resp = {
            'advancedMetrics': {
                'readability': {'fleschReadingEase': flesch, 'fleschKincaidGrade': fk, 'sentenceCount': S, 'wordCount': W},
                'passiveVoiceCount': passive,
                'actionVerbDensity': action_density,
                'datePatterns': {'mmYYYY': mmYYYY, 'monYYYY': monYYYY, 'yearOnly': yearOnly, 'patternsUsed': patterns, 'consistent': consistent},
                'contactIntegrity': {'emailValid': email_valid, 'phoneValid': phone_valid, 'hasLinkedIn': 'linkedin.com/in' in tlower},
                'atsKeywordGap': {'role': role.lower(), 'targetCount': len(target), 'missing': missing, 'missingCount': len(missing)}
            }
        }
        return cors(jsonify(resp))
    except Exception as e:
        return cors(jsonify(error=str(e))), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050)
