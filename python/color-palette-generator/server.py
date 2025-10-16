#!/usr/bin/env python3
"""
Color Palette Generator MCP Server using FastMCP
Supports both stdio (Claude Desktop) and Streamable HTTP (ChatGPT) transports
"""

import os
import sys
import colorsys
import random
from typing import List, Tuple
from mcp.server.fastmcp import FastMCP

# Create FastMCP server
mcp = FastMCP("color-palette-generator")

def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_hex(r: int, g: int, b: int) -> str:
    """Convert RGB tuple to hex color."""
    return f"#{r:02x}{g:02x}{b:02x}"

def generate_complementary(base_hex: str) -> List[str]:
    """Generate complementary color."""
    r, g, b = hex_to_rgb(base_hex)
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    h = (h + 0.5) % 1.0
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return [base_hex, rgb_to_hex(int(r*255), int(g*255), int(b*255))]

def generate_analogous(base_hex: str, count: int = 3) -> List[str]:
    """Generate analogous colors."""
    r, g, b = hex_to_rgb(base_hex)
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    colors = [base_hex]
    
    for i in range(1, count):
        offset = (i * 30) / 360
        new_h = (h + offset) % 1.0
        r, g, b = colorsys.hsv_to_rgb(new_h, s, v)
        colors.append(rgb_to_hex(int(r*255), int(g*255), int(b*255)))
    
    return colors

def generate_triadic(base_hex: str) -> List[str]:
    """Generate triadic colors."""
    r, g, b = hex_to_rgb(base_hex)
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    colors = [base_hex]
    
    for offset in [1/3, 2/3]:
        new_h = (h + offset) % 1.0
        r, g, b = colorsys.hsv_to_rgb(new_h, s, v)
        colors.append(rgb_to_hex(int(r*255), int(g*255), int(b*255)))
    
    return colors

def generate_monochromatic(base_hex: str, count: int = 5) -> List[str]:
    """Generate monochromatic palette."""
    r, g, b = hex_to_rgb(base_hex)
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    colors = []
    
    for i in range(count):
        new_v = 0.2 + (i / (count - 1)) * 0.6 if count > 1 else v
        r, g, b = colorsys.hsv_to_rgb(h, s, new_v)
        colors.append(rgb_to_hex(int(r*255), int(g*255), int(b*255)))
    
    return colors

@mcp.tool()
def generate_palette(
    base_color: str = None,
    scheme: str = "complementary",
    count: int = 5
) -> str:
    """
    Generate a color palette based on a base color and color scheme.
    
    Args:
        base_color: Hex color code (e.g., '#FF5733'). Random if not provided.
        scheme: Color scheme (complementary, analogous, triadic, monochromatic, random)
        count: Number of colors to generate (for applicable schemes)
    
    Returns:
        Generated color palette with hex codes
    """
    # Generate random base color if not provided
    if not base_color:
        base_color = rgb_to_hex(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
    
    # Ensure hex format
    if not base_color.startswith('#'):
        base_color = f"#{base_color}"
    
    # Generate palette based on scheme
    if scheme == "complementary":
        colors = generate_complementary(base_color)
    elif scheme == "analogous":
        colors = generate_analogous(base_color, count)
    elif scheme == "triadic":
        colors = generate_triadic(base_color)
    elif scheme == "monochromatic":
        colors = generate_monochromatic(base_color, count)
    elif scheme == "random":
        colors = [rgb_to_hex(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)) for _ in range(count)]
    else:
        return f"❌ Unknown scheme: {scheme}"
    
    output = f"🎨 {scheme.title()} Color Palette\n"
    output += f"━━━━━━━━━━━━━━━━━━━━\n"
    output += f"Base Color: {base_color}\n\n"
    
    for i, color in enumerate(colors, 1):
        r, g, b = hex_to_rgb(color)
        output += f"{i}. {color}  RGB({r}, {g}, {b})\n"
    
    return output

@mcp.tool()
def convert_color(color: str, to_format: str = "rgb") -> str:
    """
    Convert color between different formats.
    
    Args:
        color: Color in hex (#RRGGBB) or rgb (r,g,b) format
        to_format: Target format (rgb, hex, hsl, hsv)
    
    Returns:
        Converted color value
    """
    # Parse input color
    if color.startswith('#'):
        r, g, b = hex_to_rgb(color)
    elif ',' in color:
        r, g, b = map(int, color.replace('rgb(', '').replace(')', '').split(','))
    else:
        return "❌ Invalid color format. Use hex (#RRGGBB) or rgb (r,g,b)"
    
    output = f"🔄 Color Conversion\n━━━━━━━━━━━━━━━━━━━━\n"
    output += f"Input: {color}\n\n"
    
    if to_format == "rgb":
        output += f"RGB: ({r}, {g}, {b})\n"
    elif to_format == "hex":
        output += f"Hex: {rgb_to_hex(r, g, b)}\n"
    elif to_format == "hsl":
        h, l, s = colorsys.rgb_to_hls(r/255, g/255, b/255)
        output += f"HSL: ({int(h*360)}°, {int(s*100)}%, {int(l*100)}%)\n"
    elif to_format == "hsv":
        h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
        output += f"HSV: ({int(h*360)}°, {int(s*100)}%, {int(v*100)}%)\n"
    else:
        return f"❌ Unknown format: {to_format}"
    
    return output

@mcp.tool()
def check_contrast(color1: str, color2: str) -> str:
    """
    Check the contrast ratio between two colors (for accessibility).
    
    Args:
        color1: First color (hex format)
        color2: Second color (hex format)
    
    Returns:
        Contrast ratio and WCAG compliance levels
    """
    def get_luminance(hex_color: str) -> float:
        r, g, b = hex_to_rgb(hex_color)
        r, g, b = r/255, g/255, b/255
        
        def adjust(c):
            return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
        
        return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b)
    
    l1 = get_luminance(color1)
    l2 = get_luminance(color2)
    
    lighter = max(l1, l2)
    darker = min(l1, l2)
    ratio = (lighter + 0.05) / (darker + 0.05)
    
    output = f"♿ Contrast Checker\n━━━━━━━━━━━━━━━━━━━━\n"
    output += f"Color 1: {color1}\n"
    output += f"Color 2: {color2}\n\n"
    output += f"Contrast Ratio: {ratio:.2f}:1\n\n"
    output += f"WCAG Compliance:\n"
    output += f"• Normal Text AA: {'✅ Pass' if ratio >= 4.5 else '❌ Fail'} (4.5:1)\n"
    output += f"• Normal Text AAA: {'✅ Pass' if ratio >= 7 else '❌ Fail'} (7:1)\n"
    output += f"• Large Text AA: {'✅ Pass' if ratio >= 3 else '❌ Fail'} (3:1)\n"
    output += f"• Large Text AAA: {'✅ Pass' if ratio >= 4.5 else '❌ Fail'} (4.5:1)\n"
    
    return output

@mcp.tool()
def suggest_text_color(background: str) -> str:
    """
    Suggest optimal text color (black or white) for a given background color.
    
    Args:
        background: Background color (hex format)
    
    Returns:
        Recommended text color
    """
    def get_luminance(hex_color: str) -> float:
        r, g, b = hex_to_rgb(hex_color)
        r, g, b = r/255, g/255, b/255
        
        def adjust(c):
            return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
        
        return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b)
    
    bg_luminance = get_luminance(background)
    
    # Calculate contrast with black and white
    white_contrast = (1 + 0.05) / (bg_luminance + 0.05)
    black_contrast = (bg_luminance + 0.05) / (0 + 0.05)
    
    text_color = "#FFFFFF" if white_contrast > black_contrast else "#000000"
    best_contrast = max(white_contrast, black_contrast)
    
    output = f"📝 Text Color Suggestion\n━━━━━━━━━━━━━━━━━━━━\n"
    output += f"Background: {background}\n\n"
    output += f"Recommended Text Color: {text_color}\n"
    output += f"Contrast Ratio: {best_contrast:.2f}:1\n\n"
    output += f"WCAG AA Compliance: {'✅ Pass' if best_contrast >= 4.5 else '⚠️  May not meet standards'}\n"
    
    return output

if __name__ == "__main__":
    # Determine transport based on environment
    use_http = os.getenv("MCP_TRANSPORT") == "http" or "--http" in sys.argv
    
    if use_http:
        # Run with Streamable HTTP transport for ChatGPT
        port = int(os.getenv("PORT", "5004"))
        print(f"Color Palette Generator MCP Server running on http://0.0.0.0:{port}", file=sys.stderr)
        print(f"MCP endpoint: http://0.0.0.0:{port}/", file=sys.stderr)
        mcp.run(transport="streamable-http", host="0.0.0.0", port=port)
    else:
        # Run with stdio transport for Claude Desktop
        print("Color Palette Generator MCP Server running on stdio", file=sys.stderr)
        mcp.run(transport="stdio")
