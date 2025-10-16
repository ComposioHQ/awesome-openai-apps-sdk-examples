"""Text analysis utilities."""

import re
from typing import Dict, List, Tuple, Any
from collections import Counter

def count_words(text: str) -> int:
    """Count words in text."""
    words = text.split()
    return len(words)

def count_sentences(text: str) -> int:
    """Count sentences in text."""
    sentences = re.split(r'[.!?]+', text)
    return len([s for s in sentences if s.strip()])

def count_paragraphs(text: str) -> int:
    """Count paragraphs in text."""
    paragraphs = text.split('\n\n')
    return len([p for p in paragraphs if p.strip()])

def get_reading_time(text: str, words_per_minute: int = 200) -> int:
    """Calculate reading time in minutes."""
    word_count = count_words(text)
    minutes = max(1, round(word_count / words_per_minute))
    return minutes

def analyze_text(text: str) -> Dict[str, Any]:
    """Perform comprehensive text analysis."""
    
    words = text.split()
    word_count = len(words)
    char_count = len(text)
    char_count_no_spaces = len(text.replace(' ', ''))
    sentence_count = count_sentences(text)
    paragraph_count = count_paragraphs(text)
    
    # Average calculations
    avg_word_length = char_count_no_spaces / word_count if word_count > 0 else 0
    avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
    
    # Reading time at different speeds
    reading_time_slow = get_reading_time(text, 150)
    reading_time_avg = get_reading_time(text, 200)
    reading_time_fast = get_reading_time(text, 250)
    
    # Readability
    readability = get_readability_scores(text)
    
    return {
        "word_count": word_count,
        "char_count": char_count,
        "char_count_no_spaces": char_count_no_spaces,
        "sentence_count": sentence_count,
        "paragraph_count": paragraph_count,
        "avg_word_length": avg_word_length,
        "avg_sentence_length": avg_sentence_length,
        "reading_time_slow": reading_time_slow,
        "reading_time_avg": reading_time_avg,
        "reading_time_fast": reading_time_fast,
        "readability": readability
    }

def get_readability_scores(text: str) -> Dict[str, Any]:
    """Calculate readability scores."""
    
    word_count = count_words(text)
    sentence_count = count_sentences(text)
    
    if sentence_count == 0 or word_count == 0:
        return {
            "grade_level": "N/A",
            "difficulty": "N/A"
        }
    
    # Simple readability estimation
    avg_sentence_length = word_count / sentence_count
    avg_word_length = sum(len(word) for word in text.split()) / word_count
    
    # Rough grade level estimation
    grade_level = round(0.39 * avg_sentence_length + 11.8 * (avg_word_length / 6) - 15.59)
    grade_level = max(1, min(18, grade_level))  # Clamp between 1-18
    
    # Difficulty classification
    if grade_level <= 6:
        difficulty = "Easy"
    elif grade_level <= 10:
        difficulty = "Moderate"
    elif grade_level <= 14:
        difficulty = "Difficult"
    else:
        difficulty = "Very Difficult"
    
    return {
        "grade_level": f"Grade {grade_level}",
        "difficulty": difficulty
    }

def extract_keywords(text: str, max_keywords: int = 10) -> List[Tuple[str, int]]:
    """Extract keywords from text."""
    
    # Tokenize and clean
    words = re.findall(r'\b[a-z]+\b', text.lower())
    
    # Remove stop words
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'is', 'it', 'that', 'this', 'as', 'be', 'by', 'from',
        'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do',
        'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may',
        'might', 'must', 'shall'
    }
    
    # Filter words
    filtered_words = [
        w for w in words 
        if w not in stop_words and len(w) > 3
    ]
    
    # Count frequency
    word_freq = Counter(filtered_words)
    
    # Get top keywords
    keywords = word_freq.most_common(max_keywords)
    
    return keywords

