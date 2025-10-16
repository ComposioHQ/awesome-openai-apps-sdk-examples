#!/usr/bin/env python3
"""
Text Analyzer MCP Server using FastMCP
Supports both stdio (Claude Desktop) and Streamable HTTP (ChatGPT) transports
"""

import os
import sys
from mcp.server.fastmcp import FastMCP
from tools.text_tools import (
    analyze_text,
    get_reading_time,
    extract_keywords,
    count_words,
    get_readability_scores
)

# Create FastMCP server
mcp = FastMCP("text-analyzer")

@mcp.tool()
def analyze_text_content(text: str) -> str:
    """
    Perform comprehensive text analysis including word count, character count, and readability metrics.
    
    Args:
        text: The text to analyze
    
    Returns:
        Comprehensive analysis report
    """
    result = analyze_text(text)
    
    output = f"📊 Text Analysis Report\n"
    output += f"━━━━━━━━━━━━━━━━━━━━\n\n"
    output += f"📝 Basic Statistics:\n"
    output += f"  • Characters: {result['char_count']}\n"
    output += f"  • Characters (no spaces): {result['char_count_no_spaces']}\n"
    output += f"  • Words: {result['word_count']}\n"
    output += f"  • Sentences: {result['sentence_count']}\n"
    output += f"  • Paragraphs: {result['paragraph_count']}\n"
    output += f"  • Lines: {result['line_count']}\n\n"
    
    output += f"📖 Reading Metrics:\n"
    output += f"  • Average word length: {result['avg_word_length']:.2f} characters\n"
    output += f"  • Average sentence length: {result['avg_sentence_length']:.2f} words\n"
    output += f"  • Reading time: {result['reading_time']}\n\n"
    
    output += f"📚 Readability Scores:\n"
    for score_name, score_value in result['readability'].items():
        output += f"  • {score_name}: {score_value}\n"
    
    return output

@mcp.tool()
def calculate_reading_time(text: str, words_per_minute: int = 200) -> str:
    """
    Calculate estimated reading time for the text.
    
    Args:
        text: The text to analyze
        words_per_minute: Average reading speed (default: 200 wpm)
    
    Returns:
        Estimated reading time
    """
    result = get_reading_time(text, words_per_minute)
    
    output = f"⏱️  Reading Time Estimate\n"
    output += f"━━━━━━━━━━━━━━━━━━━━\n"
    output += f"Words: {result['word_count']}\n"
    output += f"Reading speed: {words_per_minute} words/minute\n"
    output += f"Estimated time: {result['reading_time']}\n"
    
    return output

@mcp.tool()
def extract_keywords_from_text(text: str, max_keywords: int = 10) -> str:
    """
    Extract the most important keywords from the text.
    
    Args:
        text: The text to analyze
        max_keywords: Maximum number of keywords to extract (default: 10)
    
    Returns:
        List of extracted keywords
    """
    result = extract_keywords(text, max_keywords)
    
    output = f"🔑 Extracted Keywords\n"
    output += f"━━━━━━━━━━━━━━━━━━━━\n"
    output += f"Found {len(result['keywords'])} keywords:\n\n"
    
    for i, keyword in enumerate(result['keywords'], 1):
        output += f"{i}. {keyword}\n"
    
    return output

@mcp.tool()
def count_word_occurrences(text: str, word: str = None, case_sensitive: bool = False) -> str:
    """
    Count word occurrences in the text. If no word specified, returns total word count.
    
    Args:
        text: The text to analyze
        word: Specific word to count (optional)
        case_sensitive: Whether to perform case-sensitive counting
    
    Returns:
        Word count statistics
    """
    result = count_words(text, word, case_sensitive)
    
    if word:
        output = f"🔍 Word Occurrence Count\n"
        output += f"━━━━━━━━━━━━━━━━━━━━\n"
        output += f"Searching for: '{word}'\n"
        output += f"Case sensitive: {case_sensitive}\n"
        output += f"Occurrences: {result['count']}\n"
    else:
        output = f"📊 Word Count\n"
        output += f"━━━━━━━━━━━━━━━━━━━━\n"
        output += f"Total words: {result['total_words']}\n"
        output += f"Unique words: {result['unique_words']}\n"
    
    return output

@mcp.tool()
def get_readability_metrics(text: str) -> str:
    """
    Calculate various readability scores for the text.
    
    Args:
        text: The text to analyze
    
    Returns:
        Readability scores including Flesch Reading Ease, Flesch-Kincaid Grade, etc.
    """
    result = get_readability_scores(text)
    
    output = f"📚 Readability Analysis\n"
    output += f"━━━━━━━━━━━━━━━━━━━━\n\n"
    
    for metric, score in result.items():
        output += f"{metric}:\n  {score}\n\n"
    
    output += f"ℹ️  Interpretation:\n"
    output += f"• Flesch Reading Ease: Higher = easier (90-100 = very easy, 0-30 = very hard)\n"
    output += f"• Flesch-Kincaid Grade: U.S. grade level needed to understand\n"
    output += f"• SMOG Index: Years of education needed\n"
    output += f"• Coleman-Liau: U.S. grade level\n"
    output += f"• Automated Readability: U.S. grade level\n"
    
    return output

if __name__ == "__main__":
    # Determine transport based on environment
    use_http = os.getenv("MCP_TRANSPORT") == "http" or "--http" in sys.argv
    
    if use_http:
        # Run with Streamable HTTP transport for ChatGPT
        port = int(os.getenv("PORT", "5002"))
        print(f"Text Analyzer MCP Server running on http://0.0.0.0:{port}", file=sys.stderr)
        print(f"MCP endpoint: http://0.0.0.0:{port}/", file=sys.stderr)
        mcp.run(transport="streamable-http", host="0.0.0.0", port=port)
    else:
        # Run with stdio transport for Claude Desktop
        print("Text Analyzer MCP Server running on stdio", file=sys.stderr)
        mcp.run(transport="stdio")
