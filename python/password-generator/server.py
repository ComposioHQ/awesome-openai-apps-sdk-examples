#!/usr/bin/env python3
"""
Password Generator MCP Server using FastMCP
Supports both stdio (Claude Desktop) and Streamable HTTP (ChatGPT) transports
"""

import os
import sys
from mcp.server.fastmcp import FastMCP
from tools.password_tools import (
    generate_password,
    calculate_entropy,
    check_password_strength,
    check_haveibeenpwned
)

# Create FastMCP server
mcp = FastMCP("password-generator")

@mcp.tool()
def generate_secure_password(
    length: int = 16,
    include_uppercase: bool = True,
    include_lowercase: bool = True,
    include_numbers: bool = True,
    include_symbols: bool = True,
    exclude_ambiguous: bool = False,
    custom_chars: str = ""
) -> str:
    """
    Generate a secure random password with customizable options.
    
    Args:
        length: Password length (minimum 8, recommended 16+)
        include_uppercase: Include uppercase letters (A-Z)
        include_lowercase: Include lowercase letters (a-z)
        include_numbers: Include numbers (0-9)
        include_symbols: Include symbols (!@#$%^&*...)
        exclude_ambiguous: Exclude ambiguous characters (0,O,l,1,I)
        custom_chars: Custom character set to use instead of defaults
    
    Returns:
        Generated password with strength analysis
    """
    result = generate_password(
        length=length,
        include_uppercase=include_uppercase,
        include_lowercase=include_lowercase,
        include_numbers=include_numbers,
        include_symbols=include_symbols,
        exclude_ambiguous=exclude_ambiguous,
        custom_chars=custom_chars
    )
    
    output = f"🔐 Generated Password\n"
    output += f"━━━━━━━━━━━━━━━━━━━━\n"
    output += f"Password: {result['password']}\n"
    output += f"Strength: {result['strength']}\n"
    output += f"Entropy: {result['entropy']:.2f} bits\n"
    output += f"Estimated Crack Time: {result['crack_time']}\n"
    
    return output

@mcp.tool()
def check_password(password: str, check_breach: bool = False) -> str:
    """
    Analyze password strength and optionally check if it has been breached.
    
    Args:
        password: The password to analyze
        check_breach: Whether to check against haveibeenpwned.com database
    
    Returns:
        Comprehensive password analysis with recommendations
    """
    strength_result = check_password_strength(password)
    
    output = f"🔍 Password Analysis\n"
    output += f"━━━━━━━━━━━━━━━━━━━━\n"
    output += f"Score: {strength_result['score']}/4\n"
    output += f"Strength: {strength_result['strength']}\n"
    output += f"Entropy: {strength_result['entropy']:.2f} bits\n"
    output += f"Estimated Crack Time: {strength_result['crack_time']}\n"
    
    if strength_result['feedback']:
        output += f"\n📝 Recommendations:\n{strength_result['feedback']}\n"
    
    if check_breach:
        breach_result = check_haveibeenpwned(password)
        output += f"\n🌐 Breach Database Check\n"
        output += f"{breach_result['message']}\n"
        if breach_result['breached']:
            output += f"⚠️  WARNING: Found in {breach_result['breach_count']} data breaches!\n"
            output += f"This password should NEVER be used!\n"
    
    return output

@mcp.tool()
def calculate_password_entropy_bits(password: str) -> str:
    """
    Calculate the entropy (randomness/unpredictability) of a password in bits.
    
    Args:
        password: The password to analyze
    
    Returns:
        Entropy value with strength classification
    """
    entropy = calculate_entropy(password)
    
    if entropy < 28:
        strength = "Very Weak"
        emoji = "🔴"
    elif entropy < 36:
        strength = "Weak"
        emoji = "🟠"
    elif entropy < 60:
        strength = "Fair"
        emoji = "🟡"
    elif entropy < 128:
        strength = "Strong"
        emoji = "🟢"
    else:
        strength = "Very Strong"
        emoji = "🔵"
    
    output = f"{emoji} Entropy Analysis\n"
    output += f"━━━━━━━━━━━━━━━━━━━━\n"
    output += f"Entropy: {entropy:.2f} bits\n"
    output += f"Strength: {strength}\n"
    output += f"\nInterpretation:\n"
    output += f"• < 28 bits: Very Weak (easily crackable)\n"
    output += f"• 28-36 bits: Weak (crackable with effort)\n"
    output += f"• 36-60 bits: Fair (resistant to casual attacks)\n"
    output += f"• 60-128 bits: Strong (very difficult to crack)\n"
    output += f"• > 128 bits: Very Strong (effectively uncrackable)\n"
    
    return output

if __name__ == "__main__":
    # Determine transport based on environment
    use_http = os.getenv("MCP_TRANSPORT") == "http" or "--http" in sys.argv
    
    if use_http:
        # Run with Streamable HTTP transport for ChatGPT
        port = int(os.getenv("PORT", "5000"))
        print(f"Password Generator MCP Server running on http://0.0.0.0:{port}", file=sys.stderr)
        print(f"MCP endpoint: http://0.0.0.0:{port}/", file=sys.stderr)
        mcp.run(transport="streamable-http", host="0.0.0.0", port=port)
    else:
        # Run with stdio transport for Claude Desktop
        print("Password Generator MCP Server running on stdio", file=sys.stderr)
        mcp.run(transport="stdio")
