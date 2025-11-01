#!/usr/bin/env python3

import sys
import os

# Set cache directory to local folder to avoid permission issues
os.environ['HF_HOME'] = os.path.join(os.path.dirname(__file__), 'hf_cache')
os.environ['TRANSFORMERS_CACHE'] = os.path.join(os.path.dirname(__file__), 'hf_cache')

# Add error handling for imports
try:
    from sentence_transformers import SentenceTransformer
except ImportError as e:
    print(f"Error importing sentence_transformers: {e}")
    print("Please install with: pip install sentence-transformers")
    sys.exit(1)

"""
Local Embedding Server using Sentence Transformers
Provides a REST API for text embeddings using free local models
"""

import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global embedding model
embedding_model = None
MODEL_NAME = os.getenv('EMBEDDING_MODEL_NAME', 'all-MiniLM-L6-v2')  # Free, fast, good quality

def load_embedding_model():
    """Load the Sentence Transformer model on startup"""
    global embedding_model
    try:
        logger.info(f"Loading embedding model: {MODEL_NAME}")
        
        # Load the model (will download on first use)
        embedding_model = SentenceTransformer(MODEL_NAME)
        
        # Get model info
        max_seq_length = embedding_model.max_seq_length
        embedding_dim = embedding_model.get_sentence_embedding_dimension()
        
        logger.info(f"Embedding model loaded successfully")
        logger.info(f"Max sequence length: {max_seq_length}")
        logger.info(f"Embedding dimensions: {embedding_dim}")
        
    except Exception as e:
        logger.error(f"Failed to load embedding model: {e}")
        raise

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': MODEL_NAME,
        'model_loaded': embedding_model is not None,
        'embedding_dimensions': embedding_model.get_sentence_embedding_dimension() if embedding_model else None,
        'max_sequence_length': embedding_model.max_seq_length if embedding_model else None
    })

@app.route('/embed', methods=['POST'])
def create_embedding():
    """Create embedding for a single text"""
    try:
        if not embedding_model:
            return jsonify({'error': 'Embedding model not loaded'}), 500
            
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
            
        text = data['text']
        if not text.strip():
            return jsonify({'error': 'Empty text provided'}), 400
            
        logger.info(f"Creating embedding for text of length {len(text)}")
        
        # Generate embedding
        embedding = embedding_model.encode(text, convert_to_numpy=True)
        
        # Convert to list for JSON serialization
        embedding_list = embedding.tolist()
        
        logger.info(f"Generated embedding with {len(embedding_list)} dimensions")
        
        return jsonify({
            'success': True,
            'embedding': embedding_list,
            'dimensions': len(embedding_list),
            'model': MODEL_NAME
        })
        
    except Exception as e:
        logger.error(f"Embedding creation failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/embed/batch', methods=['POST'])
def create_batch_embeddings():
    """Create embeddings for multiple texts"""
    try:
        if not embedding_model:
            return jsonify({'error': 'Embedding model not loaded'}), 500
            
        data = request.get_json()
        if not data or 'texts' not in data:
            return jsonify({'error': 'No texts provided'}), 400
            
        texts = data['texts']
        if not isinstance(texts, list) or len(texts) == 0:
            return jsonify({'error': 'Invalid texts array'}), 400
            
        # Filter out empty texts
        valid_texts = [text for text in texts if text and text.strip()]
        if len(valid_texts) == 0:
            return jsonify({'error': 'No valid texts provided'}), 400
            
        logger.info(f"Creating embeddings for {len(valid_texts)} texts")
        
        # Generate embeddings in batch (more efficient)
        embeddings = embedding_model.encode(valid_texts, convert_to_numpy=True, batch_size=32)
        
        # Convert to list for JSON serialization
        embeddings_list = [emb.tolist() for emb in embeddings]
        
        logger.info(f"Generated {len(embeddings_list)} embeddings")
        
        return jsonify({
            'success': True,
            'embeddings': embeddings_list,
            'count': len(embeddings_list),
            'dimensions': len(embeddings_list[0]) if embeddings_list else 0,
            'model': MODEL_NAME
        })
        
    except Exception as e:
        logger.error(f"Batch embedding creation failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/similarity', methods=['POST'])
def compute_similarity():
    """Compute cosine similarity between two texts"""
    try:
        if not embedding_model:
            return jsonify({'error': 'Embedding model not loaded'}), 500
            
        data = request.get_json()
        if not data or 'text1' not in data or 'text2' not in data:
            return jsonify({'error': 'Both text1 and text2 required'}), 400
            
        text1 = data['text1']
        text2 = data['text2']
        
        if not text1.strip() or not text2.strip():
            return jsonify({'error': 'Empty texts provided'}), 400
            
        logger.info("Computing similarity between two texts")
        
        # Generate embeddings
        embeddings = embedding_model.encode([text1, text2], convert_to_numpy=True)
        
        # Compute cosine similarity
        similarity = np.dot(embeddings[0], embeddings[1]) / (
            np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
        )
        
        return jsonify({
            'success': True,
            'similarity': float(similarity),
            'model': MODEL_NAME
        })
        
    except Exception as e:
        logger.error(f"Similarity computation failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/models', methods=['GET'])
def list_models():
    """List available embedding models"""
    available_models = [
        'all-MiniLM-L6-v2',      # 384 dim, fast, good quality
        'all-mpnet-base-v2',     # 768 dim, slower, better quality
        'paraphrase-MiniLM-L6-v2', # 384 dim, good for paraphrases
        'distilbert-base-nli-stsb-mean-tokens', # 768 dim, good general purpose
    ]
    
    return jsonify({
        'available_models': available_models,
        'current_model': MODEL_NAME,
        'model_loaded': embedding_model is not None,
        'embedding_dimensions': embedding_model.get_sentence_embedding_dimension() if embedding_model else None
    })

if __name__ == '__main__':
    # Load model on startup
    load_embedding_model()
    
    # Start Flask server
    port = int(os.getenv('EMBEDDING_PORT', 5001))
    host = os.getenv('EMBEDDING_HOST', '127.0.0.1')
    
    logger.info(f"Starting Embedding server on {host}:{port}")
    app.run(host=host, port=port, debug=False)
