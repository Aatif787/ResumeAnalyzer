"""
ResumeAI Pro — Server (Vercel Serverless Compatible)
"""
import os
import json
import uuid
import traceback
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory

# ── App Init ─────────────────────────────────────────────────────
app = Flask(__name__, static_folder='.', static_url_path='')

DATA_DIR = '/tmp/resume_data' if os.environ.get('VERCEL') else os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)


# ── Static Routes ────────────────────────────────────────────────
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')


@app.route('/css/<path:path>')
def serve_css(path):
    return send_from_directory('css', path)


@app.route('/js/<path:path>')
def serve_js(path):
    return send_from_directory('js', path)


# ── API: Analyze (Text Input) ───────────────────────────────────
@app.route('/api/analyze', methods=['POST'])
def api_analyze():
    try:
        data = request.get_json()
        if not data or not data.get('text'):
            return jsonify({'error': 'No resume text provided'}), 400

        text = data['text']
        jd = data.get('jd', '')
        role = data.get('role', 'Generic')

        from utils.analyzer import DeepResumeAnalyzer
        analyzer = DeepResumeAnalyzer(text, jd=jd, role=role)
        results = analyzer.analyze()

        return jsonify(results)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ── API: Analyze Multi (Legacy Compat) ───────────────────────────
@app.route('/api/analyze-multi', methods=['POST'])
def api_analyze_multi():
    """Legacy endpoint — redirects to new unified analyzer."""
    return api_analyze()


# ── API: Upload File ─────────────────────────────────────────────
@app.route('/api/upload', methods=['POST'])
def api_upload():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        if not file.filename:
            return jsonify({'error': 'Empty filename'}), 400

        ext = file.filename.rsplit('.', 1)[-1].lower()
        if ext not in ['pdf', 'docx', 'doc', 'txt']:
            return jsonify({'error': 'Unsupported file type'}), 400

        filepath = os.path.join(DATA_DIR, f'upload_{uuid.uuid4().hex}.{ext}')
        file.save(filepath)

        from utils.parser import parseResumeFile
        text = parseResumeFile(filepath)

        # Clean up
        try:
            os.remove(filepath)
        except:
            pass

        if not text or len(text.strip()) < 20:
            return jsonify({'error': 'Could not extract text from file'}), 400

        jd = request.form.get('jd', '')
        role = request.form.get('role', 'Generic')

        from utils.analyzer import DeepResumeAnalyzer
        analyzer = DeepResumeAnalyzer(text, jd=jd, role=role)
        results = analyzer.analyze()
        results['extracted_text'] = text

        return jsonify(results)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ── API: Save ────────────────────────────────────────────────────
@app.route('/api/save', methods=['POST'])
def api_save():
    try:
        data = request.get_json()
        save_id = uuid.uuid4().hex[:8]
        save_path = os.path.join(DATA_DIR, f'analysis_{save_id}.json')

        data['id'] = save_id
        data['saved_at'] = datetime.now().isoformat()

        with open(save_path, 'w') as f:
            json.dump(data, f)

        return jsonify({'id': save_id, 'status': 'saved'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── API: Health Check ────────────────────────────────────────────
@app.route('/api/health')
def api_health():
    return jsonify({'status': 'ok', 'version': '2.0.0'})


# ── Run ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
