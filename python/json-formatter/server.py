#!/usr/bin/env python3
"""
JSON Formatter & Validator MCP Server using FastMCP
Supports both stdio (Claude Desktop) and Streamable HTTP (ChatGPT) transports
"""

import os
import sys
from mcp.server.fastmcp import FastMCP
from tools.json_tools import (
    format_json,
    minify_json,
    validate_json,
    convert_json_to_yaml,
    convert_yaml_to_json,
    merge_json,
    extract_json_path,
    compare_json
)

# Create FastMCP server
mcp = FastMCP("json-formatter")

@mcp.tool()
def format_json_string(json_string: str, indent: int = 2) -> str:
    """
    Format and prettify a JSON string with proper indentation.
    
    Args:
        json_string: The JSON string to format
        indent: Number of spaces for indentation (default: 2)
    
    Returns:
        Formatted JSON string
    """
    result = format_json(json_string, indent)
    if result['success']:
        return f"✅ Formatted JSON:\n\n{result['result']}"
    else:
        return f"❌ Error: {result['error']}"

@mcp.tool()
def minify_json_string(json_string: str) -> str:
    """
    Minify a JSON string by removing all whitespace.
    
    Args:
        json_string: The JSON string to minify
    
    Returns:
        Minified JSON string
    """
    result = minify_json(json_string)
    if result['success']:
        return f"✅ Minified JSON:\n\n{result['result']}"
    else:
        return f"❌ Error: {result['error']}"

@mcp.tool()
def validate_json_string(json_string: str) -> str:
    """
    Validate if a string is valid JSON and provide detailed error messages.
    
    Args:
        json_string: The JSON string to validate
    
    Returns:
        Validation result with error details if invalid
    """
    result = validate_json(json_string)
    if result['valid']:
        return f"✅ Valid JSON\n\nThe JSON is well-formed and valid."
    else:
        return f"❌ Invalid JSON\n\nError: {result['error']}"

@mcp.tool()
def json_to_yaml(json_string: str) -> str:
    """
    Convert JSON to YAML format.
    
    Args:
        json_string: The JSON string to convert
    
    Returns:
        YAML formatted string
    """
    result = convert_json_to_yaml(json_string)
    if result['success']:
        return f"✅ Converted to YAML:\n\n{result['result']}"
    else:
        return f"❌ Error: {result['error']}"

@mcp.tool()
def yaml_to_json(yaml_string: str, indent: int = 2) -> str:
    """
    Convert YAML to JSON format.
    
    Args:
        yaml_string: The YAML string to convert
        indent: Number of spaces for JSON indentation (default: 2)
    
    Returns:
        JSON formatted string
    """
    result = convert_yaml_to_json(yaml_string, indent)
    if result['success']:
        return f"✅ Converted to JSON:\n\n{result['result']}"
    else:
        return f"❌ Error: {result['error']}"

@mcp.tool()
def merge_json_objects(json1: str, json2: str) -> str:
    """
    Merge two JSON objects. Values from json2 override json1 for duplicate keys.
    
    Args:
        json1: First JSON object
        json2: Second JSON object (takes precedence)
    
    Returns:
        Merged JSON object
    """
    result = merge_json(json1, json2)
    if result['success']:
        return f"✅ Merged JSON:\n\n{result['result']}"
    else:
        return f"❌ Error: {result['error']}"

@mcp.tool()
def extract_value_from_json(json_string: str, path: str) -> str:
    """
    Extract a value from JSON using a path (e.g., 'user.address.city').
    
    Args:
        json_string: The JSON string to query
        path: Dot-notation path to the value (e.g., 'user.name')
    
    Returns:
        Extracted value or error message
    """
    result = extract_json_path(json_string, path)
    if result['success']:
        return f"✅ Extracted value at '{path}':\n\n{result['result']}"
    else:
        return f"❌ Error: {result['error']}"

@mcp.tool()
def compare_json_objects(json1: str, json2: str) -> str:
    """
    Compare two JSON objects and show differences.
    
    Args:
        json1: First JSON object
        json2: Second JSON object
    
    Returns:
        Comparison report showing differences
    """
    result = compare_json(json1, json2)
    if result['success']:
        comp = result['result']
        output = f"📊 JSON Comparison\n"
        output += f"━━━━━━━━━━━━━━━━━━━━\n"
        output += f"Equal: {comp['equal']}\n\n"
        
        if not comp['equal']:
            if comp['added']:
                output += f"✅ Added keys:\n{', '.join(comp['added'])}\n\n"
            if comp['removed']:
                output += f"❌ Removed keys:\n{', '.join(comp['removed'])}\n\n"
            if comp['modified']:
                output += f"🔄 Modified keys:\n{', '.join(comp['modified'])}\n\n"
        
        return output
    else:
        return f"❌ Error: {result['error']}"

if __name__ == "__main__":
    # Determine transport based on environment
    use_http = os.getenv("MCP_TRANSPORT") == "http" or "--http" in sys.argv
    
    if use_http:
        # Run with Streamable HTTP transport for ChatGPT
        port = int(os.getenv("PORT", "5001"))
        print(f"JSON Formatter MCP Server running on http://0.0.0.0:{port}", file=sys.stderr)
        print(f"MCP endpoint: http://0.0.0.0:{port}/", file=sys.stderr)
        mcp.run(transport="streamable-http", host="0.0.0.0", port=port)
    else:
        # Run with stdio transport for Claude Desktop
        print("JSON Formatter MCP Server running on stdio", file=sys.stderr)
        mcp.run(transport="stdio")
