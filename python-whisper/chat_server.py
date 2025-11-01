#!/usr/bin/env python3
"""
Local Chat Server using Ollama or GPT4All
Provides a REST API for chat completions using free local models
"""

import os
import logging
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import subprocess
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
CHAT_MODE = os.getenv('CHAT_MODE', 'ollama')  # 'ollama' or 'gpt4all'
OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://127.0.0.1:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama2:7b')  # Default model

def check_ollama_running():
    """Check if Ollama is running"""
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        return response.status_code == 200
    except:
        return False

def start_ollama():
    """Start Ollama if not running"""
    try:
        if not check_ollama_running():
            logger.info("Starting Ollama...")
            subprocess.Popen(['ollama', 'serve'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(3)  # Give it time to start
            
        return check_ollama_running()
    except Exception as e:
        logger.error(f"Failed to start Ollama: {e}")
        return False

def ensure_model_available():
    """Ensure the specified model is available"""
    try:
        if not check_ollama_running():
            return False
            
        # Check if model exists
        response = requests.get(f"{OLLAMA_URL}/api/tags")
        if response.status_code == 200:
            models = response.json().get('models', [])
            model_names = [model['name'] for model in models]
            
            if OLLAMA_MODEL not in model_names:
                logger.info(f"Model {OLLAMA_MODEL} not found. Available models: {model_names}")
                logger.info(f"Pulling model {OLLAMA_MODEL}... This may take a while.")
                
                # Pull the model
                pull_response = requests.post(f"{OLLAMA_URL}/api/pull", 
                                            json={"name": OLLAMA_MODEL},
                                            timeout=600)  # 10 minutes timeout
                
                if pull_response.status_code == 200:
                    logger.info(f"Model {OLLAMA_MODEL} pulled successfully")
                    return True
                else:
                    logger.error(f"Failed to pull model: {pull_response.text}")
                    return False
            else:
                logger.info(f"Model {OLLAMA_MODEL} is available")
                return True
        
        return False
    except Exception as e:
        logger.error(f"Error checking model availability: {e}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    ollama_running = check_ollama_running()
    
    return jsonify({
        'status': 'healthy' if ollama_running else 'degraded',
        'chat_mode': CHAT_MODE,
        'ollama_running': ollama_running,
        'ollama_url': OLLAMA_URL,
        'model': OLLAMA_MODEL
    })

@app.route('/chat/completions', methods=['POST'])
def chat_completions():
    """Chat completions endpoint compatible with OpenAI format"""
    try:
        if not check_ollama_running():
            return jsonify({'error': 'Ollama is not running. Please start Ollama first.'}), 500
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        messages = data.get('messages', [])
        if not messages:
            return jsonify({'error': 'No messages provided'}), 400
            
        # Convert messages to prompt
        prompt = ""
        for message in messages:
            role = message.get('role', 'user')
            content = message.get('content', '')
            
            if role == 'system':
                prompt += f"System: {content}\n"
            elif role == 'user':
                prompt += f"Human: {content}\n"
            elif role == 'assistant':
                prompt += f"Assistant: {content}\n"
        
        prompt += "Assistant: "
        
        logger.info(f"Generating response for prompt of length {len(prompt)}")
        
        # Call Ollama API
        ollama_request = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": data.get('temperature', 0.3),
                "max_tokens": data.get('max_tokens', 500),
            }
        }
        
        response = requests.post(f"{OLLAMA_URL}/api/generate", 
                               json=ollama_request, 
                               timeout=120)
        
        if response.status_code != 200:
            return jsonify({'error': f'Ollama API error: {response.text}'}), 500
            
        ollama_response = response.json()
        generated_text = ollama_response.get('response', '')
        
        # Format response in OpenAI-compatible format
        return jsonify({
            'choices': [{
                'message': {
                    'role': 'assistant',
                    'content': generated_text
                },
                'finish_reason': 'stop'
            }],
            'model': OLLAMA_MODEL,
            'usage': {
                'prompt_tokens': len(prompt.split()),
                'completion_tokens': len(generated_text.split()),
                'total_tokens': len(prompt.split()) + len(generated_text.split())
            }
        })
        
    except Exception as e:
        logger.error(f"Chat completion failed: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/models', methods=['GET'])
def list_models():
    """List available models"""
    try:
        if not check_ollama_running():
            return jsonify({
                'error': 'Ollama not running',
                'available_models': [],
                'current_model': OLLAMA_MODEL
            })
            
        response = requests.get(f"{OLLAMA_URL}/api/tags")
        if response.status_code == 200:
            models = response.json().get('models', [])
            model_names = [model['name'] for model in models]
            
            return jsonify({
                'available_models': model_names,
                'current_model': OLLAMA_MODEL,
                'recommended_models': [
                    'llama2:7b',      # Good general purpose
                    'llama2:13b',     # Better quality, slower
                    'codellama:7b',   # Good for code
                    'mistral:7b',     # Fast and efficient
                    'phi:2.7b',       # Very fast, smaller
                ]
            })
        else:
            return jsonify({'error': 'Failed to fetch models'}), 500
            
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/setup', methods=['POST'])
def setup_ollama():
    """Setup Ollama and pull the default model"""
    try:
        logger.info("Setting up Ollama...")
        
        # Start Ollama if not running
        if not start_ollama():
            return jsonify({'error': 'Failed to start Ollama'}), 500
            
        # Ensure model is available
        if not ensure_model_available():
            return jsonify({'error': f'Failed to setup model {OLLAMA_MODEL}'}), 500
            
        return jsonify({
            'success': True,
            'message': f'Ollama setup complete with model {OLLAMA_MODEL}',
            'model': OLLAMA_MODEL
        })
        
    except Exception as e:
        logger.error(f"Setup failed: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Local Chat Server...")
    logger.info(f"Chat mode: {CHAT_MODE}")
    logger.info(f"Ollama URL: {OLLAMA_URL}")
    logger.info(f"Model: {OLLAMA_MODEL}")
    
    # Check if Ollama is available
    if CHAT_MODE == 'ollama':
        if not check_ollama_running():
            logger.warning("Ollama is not running. You may need to start it manually or call /setup endpoint.")
        else:
            logger.info("Ollama is running")
    
    # Start Flask server
    port = int(os.getenv('CHAT_PORT', 5002))
    host = os.getenv('CHAT_HOST', '127.0.0.1')
    
    logger.info(f"Starting Chat server on {host}:{port}")
    app.run(host=host, port=port, debug=False)
