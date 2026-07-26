"""Local semantic matching engine using sentence-transformers."""
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

_model = None


def get_model():
    """Lazily load the sentence-transformers model."""
    global _model
    if _model is None:
        # Download and cache locally.
        # This lightweight model is ~120MB and runs fast on CPU.
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def compute_semantic_similarity(source_sentence: str, sentences: list) -> list:
    """Computes cosine similarity between source_sentence and a list of target sentences."""
    if not sentences:
        return []
    try:
        model = get_model()
        # Encode sentences
        all_sentences = [source_sentence] + list(sentences)
        embeddings = model.encode(all_sentences)

        source_vector = embeddings[0].reshape(1, -1)
        target_vectors = embeddings[1:]

        # Calculate cosine similarity
        similarities = cosine_similarity(source_vector, target_vectors)[0]
        return [max(0.0, float(val)) for val in similarities]
    except Exception as e:
        print(f"Semantic similarity calculation failed: {e}")
        return [0.0] * len(sentences)
