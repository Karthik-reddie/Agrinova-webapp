import os
import sqlite3
import io
import requests
import numpy as np
from datetime import datetime

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

import google.generativeai as genai
import tensorflow as tf
from tensorflow.keras.models import load_model
from PIL import Image

# # =====================================================
# # GEMINI CONFIGURATION (SINGLE CONFIGURATION)
# # =====================================================
# GENIE_API_KEY = os.getenv('GENIE_API_KEY') or "AIzaSyDTT2zylOQIPLpufliVp--l6Re0qratMto"
# genai.configure(api_key=GENIE_API_KEY)

# =====================================================
# FLASK SETUP
# =====================================================
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'your-super-secret-key-change-in-production')
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

DATABASE = 'users.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Scans table for disease predictions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            prediction TEXT NOT NULL,
            confidence REAL NOT NULL,
            image_filename TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    
    conn.commit()
    conn.close()

init_db()

# =====================================================
# AUTHENTICATION ROUTES
# =====================================================
@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not all([username, email, password]):
        return jsonify({'error': 'Please provide username, email and password'}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE username = ? OR email = ?", (username, email))
        if cursor.fetchone():
            return jsonify({'error': 'Username or Email already exists'}), 400

        password_hash = generate_password_hash(password)
        cursor.execute("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                      (username, email, password_hash))
        conn.commit()
        return jsonify({'message': 'User registered successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username_or_email = data.get('username_or_email')
    password = data.get('password')

    if not all([username_or_email, password]):
        return jsonify({'error': 'Please provide username/email and password'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ? OR email = ?", (username_or_email, username_or_email))
    user = cursor.fetchone()
    conn.close()

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid username/email or password'}), 401

    session['user_id'] = user['id']
    session['username'] = user['username']
    return jsonify({
        'message': 'Logged in successfully', 
        'user': {'id': user['id'], 'username': user['username']}
    })

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/profile', methods=['GET'])
def profile():
    user_id = session.get('user_id')
    username = session.get('username')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify({'user': {'id': user_id, 'username': username}})

# =====================================================
# PLANT DISEASE PREDICTION
# =====================================================
try:
    model = load_model('model/plant_disease_model.h5')
    class_names = ['Apple_scab', 'Apple_Black_rot', 'Cedar_apple_rust', 'Healthy', 'Others']
except Exception as e:
    print(f"Model loading error: {e}")
    model = None
    class_names = []

def prepare_image(image, target_size=(224, 224)):
    if image.mode != 'RGB':
        image = image.convert('RGB')
    image = image.resize(target_size)
    image = np.array(image) / 255.0
    image = np.expand_dims(image, axis=0)
    return image

@app.route('/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({'error': 'Model not loaded'}), 500
        
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        image = Image.open(io.BytesIO(file.read()))
        processed_image = prepare_image(image)
        preds = model.predict(processed_image, verbose=0)
        class_idx = np.argmax(preds, axis=1)[0]
        prediction = class_names[class_idx]
        confidence = float(np.max(preds))

        # Save to user scan history if logged in
        user_id = session.get('user_id')
        if user_id:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO scans (user_id, prediction, confidence) VALUES (?, ?, ?)",
                (user_id, prediction, confidence)
            )
            conn.commit()
            conn.close()
            
        return jsonify({'prediction': prediction, 'confidence': confidence})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# WEATHER FORECAST
# =====================================================
@app.route('/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city')
    if not city:
        return jsonify({'error': 'City parameter is required'}), 400

    api_key = '6d3183bb84680b414f5bbc5ea217613e'
    url = f'https://api.openweathermap.org/data/2.5/weather?q={city}&units=metric&appid={api_key}'

    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        if response.status_code != 200:
            return jsonify({'error': data.get("message", "Error fetching weather data")}), response.status_code

        weather_info = {
            'city': data['name'],
            'temperature': data['main']['temp'],
            'description': data['weather'][0]['description'],
            'humidity': data['main']['humidity'],
            'wind_speed': data['wind']['speed']
        }
        return jsonify(weather_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# AI CHATBOT (Gemini)
# =====================================================
# =====================================================
# AI CHATBOT (Gemini - FIXED)
# =====================================================
import google.generativeai as genai

GENIE_API_KEY = os.getenv("GENIE_API_KEY") or "AIzaSyDTT2zylOQIPLpufliVp--l6Re0qratMto"
genai.configure(api_key=GENIE_API_KEY)

model = genai.GenerativeModel("gemini-1.5-flash")  # ✅ FIXED MODEL


@app.route('/chatbot', methods=['GET', 'POST'])
def chatbot():
    try:
        if request.method == 'GET':
            return jsonify({
                "message": "Chatbot endpoint working. Send POST with 'message'."
            })

        data = request.get_json()
        message = data.get("message")

        if not message:
            return jsonify({"error": "Message is required"}), 400

        response = model.generate_content(message)

        # ✅ Safe text extraction
        bot_reply = response.text

        return jsonify({
            "reply": bot_reply,
            "language": data.get("language", "en")
        })

    except Exception as e:
        print("🔥 Gemini Error:", e)
        return jsonify({"error": str(e)}), 500


# =====================================================
# MARKET PRICE (SAMPLE DATA)
# =====================================================
@app.route('/market_price', methods=['POST'])
def market_price():
    try:
        data = request.get_json()
        crop = data.get('crop', '').lower()
        location = data.get('location', '').lower()

        # Sample market data (replace with real API later)
        sample_prices = [
            {'crop': 'wheat', 'location': 'delhi', 'min_price': 2500, 'modal_price': 2750, 'max_price': 2900},
            {'crop': 'paddy', 'location': 'punjab', 'min_price': 1800, 'modal_price': 2000, 'max_price': 2150},
            {'crop': 'soybean', 'location': 'madhya pradesh', 'min_price': 3500, 'modal_price': 3700, 'max_price': 3860},
            {'crop': 'wheat', 'location': 'punjab', 'min_price': 2600, 'modal_price': 2800, 'max_price': 2950},
        ]

        results = [item for item in sample_prices 
                  if crop in item['crop'] and location in item['location']]
        
        return jsonify({'market_prices': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# ROOT ENDPOINT
# =====================================================
@app.route('/')
def home():
    return "AGRINOVA AI Backend is running! All endpoints working."

# =====================================================
# MAIN
# =====================================================
if __name__ == '__main__':
    print("🚀 Starting AGRINOVA Backend...")
    print("📱 Frontend: http://localhost:3000")
    print("🔧 Backend APIs: http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=True)
