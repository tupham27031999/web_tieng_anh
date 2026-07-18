from flask import Flask, render_template, request, jsonify
from config import FIELDS, NODE_TYPES, DATA_FILE, IMAGE_FOLDER, AUDIO_FOLDER, UPLOAD_FOLDER
import json
import os
from werkzeug.utils import secure_filename
import time
from flask import send_from_directory
from gtts import gTTS

os.makedirs(IMAGE_FOLDER,exist_ok=True)
os.makedirs(AUDIO_FOLDER,exist_ok=True)

PATH_SOFTWARE = os.path.dirname(os.path.abspath(__file__)).replace(str("\\"), "/")

print("="*10 + " path " + "="*10)
print(PATH_SOFTWARE)

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html",fields=FIELDS,node_types=NODE_TYPES)

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data,f,ensure_ascii=False,indent=4)

@app.route("/api/load")
def api_load():
    return jsonify(load_data())

@app.route("/api/save", methods=["POST"])
def api_save():
    data = request.get_json()
    save_data(data)
    return jsonify({"success": True})

@app.route("/api/upload/image",methods=["POST"])
def upload_image():
    file = request.files["file"]
    base, ext = os.path.splitext(secure_filename(file.filename))
    filename = f"{int(time.time())}_{base}.webp"
    path = os.path.join(IMAGE_FOLDER, filename)
    
    try:
        from PIL import Image
        with Image.open(file) as img:
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")
                
            max_dim = 500
            w, h = img.size
            if max(w, h) > max_dim:
                if w > h:
                    new_w = max_dim
                    new_h = int(h * (max_dim / w))
                else:
                    new_h = max_dim
                    new_w = int(w * (max_dim / h))
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
            img.save(path, "WEBP", quality=50, optimize=True)
        return jsonify({"url": f"/uploads/images/{filename}", "name": f"{base}.webp"})
    except Exception as e:
        print(f"PIL Optimization failed: {e}. Saving raw file as fallback.")
        file.seek(0)
        raw_filename = f"{int(time.time())}_{secure_filename(file.filename)}"
        raw_path = os.path.join(IMAGE_FOLDER, raw_filename)
        file.save(raw_path)
        return jsonify({"url": f"/uploads/images/{raw_filename}", "name": file.filename})

@app.route("/api/upload/audio",methods=["POST"])
def upload_audio():
    file = request.files["file"]
    filename = f"{int(time.time())}_{secure_filename(file.filename)}"
    path = os.path.join(AUDIO_FOLDER,filename)
    file.save(path)
    return jsonify({"url":f"/uploads/audio/{filename}", "name": file.filename})

@app.route("/api/tts", methods=["POST"])
def text_to_speech():
    req = request.get_json()
    text = req.get("text", "").strip()
    lang = req.get("lang", "en").strip()
    
    if not text:
        return jsonify({"error": "Text is empty"}), 400
        
    filename = f"{int(time.time())}_tts_{lang}.mp3"
    path = os.path.join(AUDIO_FOLDER, filename)
    
    try:
        tts = gTTS(text=text, lang=lang, slow=False)
        tts.save(path)
        return jsonify({"url": f"/uploads/audio/{filename}", "name": f"[TTS-{lang.upper()}] {text}.mp3"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/delete/file", methods=["POST"])
def delete_file():
    req = request.get_json()
    url = req.get("url", "").strip()
    
    # Safe path checking
    if not url.startswith("/uploads/"):
        return jsonify({"error": "Invalid path"}), 400
        
    parts = url.strip("/").split("/")
    if len(parts) != 3 or parts[0] != "uploads" or parts[1] not in ["audio", "images"]:
        return jsonify({"error": "Invalid directory"}), 400
        
    filename = os.path.basename(parts[2])
    target_path = os.path.abspath(os.path.join(UPLOAD_FOLDER, parts[1], filename))
    uploads_abs = os.path.abspath(UPLOAD_FOLDER)
    
    if not target_path.startswith(uploads_abs):
        return jsonify({"error": "Path traversal detected"}), 400
        
    if os.path.exists(target_path):
        try:
            os.remove(target_path)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    return jsonify({"error": "File not found"}), 404

@app.route("/uploads/<folder>/<path:filename>")
def uploaded_file(folder, filename):
    return send_from_directory(
        os.path.join("uploads", folder),
        filename
    )

if __name__ == "__main__":
    app.run(debug=True)
