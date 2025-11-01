#!/usr/bin/env python3
"""
Local Whisper Transcription Server
Provides a REST API for audio transcription using OpenAI Whisper
"""

import os
import tempfile
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import torch
import requests
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global whisper model
whisper_model = None
MODEL_SIZE = os.getenv('WHISPER_MODEL_SIZE', 'base')  # tiny, base, small, medium, large

def load_whisper_model():
    """Load the Whisper model on startup"""
    global whisper_model
    try:
        logger.info(f"Loading Whisper model: {MODEL_SIZE}")
        
        # Check if CUDA is available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")
        
        whisper_model = whisper.load_model(MODEL_SIZE, device=device)
        logger.info("Whisper model loaded successfully")
        
    except Exception as e:
        logger.error(f"Failed to load Whisper model: {e}")
        raise

def download_audio_file(url: str) -> str:
    """Download audio file from URL to temporary file"""
    try:
        logger.info(f"Downloading audio from: {url}")
        
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
            for chunk in response.iter_content(chunk_size=8192):
                temp_file.write(chunk)
            temp_path = temp_file.name
            
        logger.info(f"Audio downloaded to: {temp_path}")
        return temp_path
        
    except Exception as e:
        logger.error(f"Failed to download audio: {e}")
        raise

def transcribe_audio_file(file_path: str) -> dict:
    """Transcribe audio file using Whisper"""
    try:
        logger.info(f"Transcribing audio file: {file_path}")
        
        # Transcribe with Whisper
        result = whisper_model.transcribe(
            file_path,
            task="transcribe",
            language=None,  # Auto-detect language
            verbose=False
        )
        
        # Format segments with timestamps
        segments = []
        if 'segments' in result:
            for segment in result['segments']:
                segments.append({
                    'text': segment['text'].strip(),
                    'start': segment['start'],
                    'end': segment['end']
                })
        else:
            # Fallback if no segments
            segments.append({
                'text': result['text'].strip(),
                'start': 0.0,
                'end': 0.0
            })
        
        logger.info(f"Transcription completed. Found {len(segments)} segments")
        
        return {
            'text': result['text'],
            'language': result.get('language', 'unknown'),
            'segments': segments
        }
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': MODEL_SIZE,
        'device': 'cuda' if torch.cuda.is_available() else 'cpu',
        'model_loaded': whisper_model is not None
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Transcribe audio from URL or uploaded file"""
    try:
        temp_file_path = None
        
        # Check if file is uploaded (multipart/form-data)
        if 'audio_file' in request.files:
            uploaded_file = request.files['audio_file']
            
            # Save uploaded file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
                uploaded_file.save(temp_file.name)
                temp_file_path = temp_file.name
                
        # Check if URL is provided (JSON)
        elif request.is_json and request.json and 'audio_url' in request.json:
            audio_url = request.json['audio_url']
            temp_file_path = download_audio_file(audio_url)
            
        else:
            return jsonify({'error': 'No audio_url or audio_file provided'}), 400
        
        if not whisper_model:
            return jsonify({'error': 'Whisper model not loaded'}), 500
            
        # Transcribe the audio
        result = transcribe_audio_file(temp_file_path)
        
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
            
        return jsonify({
            'success': True,
            'result': result
        })
        
    except Exception as e:
        # Clean up on error
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
            
        logger.error(f"Transcription request failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/models', methods=['GET'])
def list_models():
    """List available Whisper models"""
    models = ['tiny', 'base', 'small', 'medium', 'large']
    return jsonify({
        'available_models': models,
        'current_model': MODEL_SIZE,
        'model_loaded': whisper_model is not None
    })

if __name__ == '__main__':
    # Load model on startup
    load_whisper_model()
    
    # Start Flask server
    port = int(os.getenv('WHISPER_PORT', 5000))
    host = os.getenv('WHISPER_HOST', '127.0.0.1')
    
    logger.info(f"Starting Whisper server on {host}:{port}")
    app.run(host=host, port=port, debug=False)
