
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch.nn.functional as F
import re
import os

app = Flask(__name__)
# Enable CORS to allow the Chrome Extension to talk to this server
CORS(app)

MODEL_PATH = "./xlmr_hate_model"

print("Loading model... please wait.")
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    model.eval()
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    print("Ensure the folder './xlmr_hate_model' exists.")

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r'\@\w+|\#', '', text)
    text = re.sub(r"[^\w\s\u0900-\u097F]", "", text) # Keep Nepali
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def predict_hate_logic(text):
    cleaned = clean_text(text)
    if not cleaned:
        return "NOT HATE", 0.0

    inputs = tokenizer(cleaned, return_tensors="pt", truncation=True, padding=True, max_length=128)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = F.softmax(logits, dim=1)

    probs = probs.squeeze().tolist()
    # Assuming index 1 is Hate, 0 is Not Hate based on your provided code
    hate_prob = probs[1]
    not_hate_prob = probs[0]

    label = "HATE SPEECH" if hate_prob > not_hate_prob else "NOT HATE"
    return label, hate_prob

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    text = data.get('text', '')
    
    label, confidence = predict_hate_logic(text)
    
    return jsonify({
        'is_hate': label == "HATE SPEECH",
        'confidence': confidence
    })

if __name__ == '__main__':
    # Run on localhost port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)