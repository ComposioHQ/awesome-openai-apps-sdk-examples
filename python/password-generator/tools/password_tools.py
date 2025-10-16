"""Password generation and security checking utilities."""

import secrets
import string
import math
import hashlib
import requests
from typing import List, Dict, Any

def generate_password(
    length: int = 16,
    include_uppercase: bool = True,
    include_lowercase: bool = True,
    include_numbers: bool = True,
    include_symbols: bool = True,
    exclude_ambiguous: bool = False
) -> str:
    """Generate a secure random password."""
    
    if length < 8:
        raise ValueError("Password length must be at least 8 characters")
    
    # Build character set
    chars = ""
    
    if include_lowercase:
        chars += string.ascii_lowercase
    if include_uppercase:
        chars += string.ascii_uppercase
    if include_numbers:
        chars += string.digits
    if include_symbols:
        chars += "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    if not chars:
        raise ValueError("At least one character type must be included")
    
    # Remove ambiguous characters if requested
    if exclude_ambiguous:
        ambiguous = "0O1lI"
        chars = "".join(c for c in chars if c not in ambiguous)
    
    # Generate password ensuring at least one character from each enabled type
    password = []
    
    # Add at least one of each required type
    if include_lowercase:
        password.append(secrets.choice(string.ascii_lowercase))
    if include_uppercase:
        password.append(secrets.choice(string.ascii_uppercase))
    if include_numbers:
        password.append(secrets.choice(string.digits))
    if include_symbols:
        password.append(secrets.choice("!@#$%^&*()_+-=[]{}|;:,.<>?"))
    
    # Fill the rest randomly
    remaining_length = length - len(password)
    password.extend(secrets.choice(chars) for _ in range(remaining_length))
    
    # Shuffle to avoid predictable patterns
    password_list = list(password)
    for i in range(len(password_list) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        password_list[i], password_list[j] = password_list[j], password_list[i]
    
    return "".join(password_list)

def calculate_entropy(password: str) -> float:
    """Calculate password entropy in bits."""
    charset_size = 0
    
    has_lowercase = any(c in string.ascii_lowercase for c in password)
    has_uppercase = any(c in string.ascii_uppercase for c in password)
    has_numbers = any(c in string.digits for c in password)
    has_symbols = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?/\\\"'~`" for c in password)
    
    if has_lowercase:
        charset_size += 26
    if has_uppercase:
        charset_size += 26
    if has_numbers:
        charset_size += 10
    if has_symbols:
        charset_size += 32
    
    if charset_size == 0:
        return 0.0
    
    # Entropy = log2(charset_size^length)
    entropy = len(password) * math.log2(charset_size)
    return entropy

def check_password_strength(password: str, user_inputs: List[str] = None) -> Dict[str, Any]:
    """Analyze password strength and return detailed report."""
    
    if user_inputs is None:
        user_inputs = []
    
    length = len(password)
    entropy = calculate_entropy(password)
    
    # Check character types
    has_lowercase = any(c in string.ascii_lowercase for c in password)
    has_uppercase = any(c in string.ascii_uppercase for c in password)
    has_numbers = any(c in string.digits for c in password)
    has_symbols = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?/\\\"'~`" for c in password)
    
    # Count character types
    char_type_count = sum([has_lowercase, has_uppercase, has_numbers, has_symbols])
    
    # Calculate score (0-5)
    score = 0
    if length >= 8:
        score += 1
    if length >= 12:
        score += 1
    if length >= 16:
        score += 1
    if char_type_count >= 3:
        score += 1
    if char_type_count >= 4:
        score += 1
    
    # Determine strength level
    if score <= 1:
        strength = "Very Weak"
    elif score == 2:
        strength = "Weak"
    elif score == 3:
        strength = "Moderate"
    elif score == 4:
        strength = "Strong"
    else:
        strength = "Very Strong"
    
    # Check for common patterns
    warnings = []
    suggestions = []
    
    if length < 12:
        warnings.append("Password is shorter than recommended (12+ characters)")
        suggestions.append("Increase password length to at least 12 characters")
    
    if char_type_count < 3:
        warnings.append("Password doesn't use enough character types")
        suggestions.append("Use a mix of uppercase, lowercase, numbers, and symbols")
    
    # Check for sequential characters
    sequences = ["abc", "bcd", "cde", "123", "234", "345", "678", "789"]
    if any(seq in password.lower() for seq in sequences):
        warnings.append("Contains sequential characters")
        suggestions.append("Avoid sequential patterns like 'abc' or '123'")
    
    # Check for repeated characters
    if any(password.count(c) >= 3 for c in set(password)):
        warnings.append("Contains repeated characters")
        suggestions.append("Avoid repeating the same character multiple times")
    
    # Check against user inputs
    for user_input in user_inputs:
        if user_input.lower() in password.lower():
            warnings.append(f"Contains personal information: '{user_input}'")
            suggestions.append("Don't use personal information in passwords")
    
    # Common weak passwords
    common_passwords = ["password", "123456", "qwerty", "admin", "letmein"]
    if password.lower() in common_passwords:
        warnings.append("This is a commonly used password")
        suggestions.append("Use a unique, randomly generated password")
    
    # Estimate crack time
    guesses_per_second = 10_000_000_000  # 10 billion per second
    combinations = 2 ** entropy
    seconds = combinations / guesses_per_second
    
    if seconds < 60:
        crack_time = "Less than a minute"
    elif seconds < 3600:
        crack_time = f"{int(seconds / 60)} minutes"
    elif seconds < 86400:
        crack_time = f"{int(seconds / 3600)} hours"
    elif seconds < 31536000:
        crack_time = f"{int(seconds / 86400)} days"
    elif seconds < 31536000 * 100:
        crack_time = f"{int(seconds / 31536000)} years"
    else:
        crack_time = "Centuries (effectively uncrackable)"
    
    return {
        "password_length": length,
        "length": length,
        "entropy": entropy,
        "strength": strength,
        "score": score,
        "crack_time": crack_time,
        "character_types": {
            "lowercase": has_lowercase,
            "uppercase": has_uppercase,
            "numbers": has_numbers,
            "symbols": has_symbols
        },
        "warnings": warnings,
        "suggestions": suggestions
    }

def check_haveibeenpwned(password: str) -> int:
    """
    Check if password has been pwned using Have I Been Pwned API.
    Uses k-anonymity - only sends first 5 chars of SHA-1 hash.
    Returns the number of times the password has been seen in breaches.
    """
    
    # Create SHA-1 hash of password
    sha1_hash = hashlib.sha1(password.encode()).hexdigest().upper()
    
    # Send only first 5 characters
    prefix = sha1_hash[:5]
    suffix = sha1_hash[5:]
    
    try:
        # Query Have I Been Pwned API
        url = f"https://api.pwnedpasswords.com/range/{prefix}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            # Parse response to find our hash suffix
            hashes = response.text.split('\r\n')
            for hash_line in hashes:
                hash_suffix, count = hash_line.split(':')
                if hash_suffix == suffix:
                    return int(count)
            return 0  # Not found in breaches
        else:
            # API error, assume not found
            return 0
    
    except Exception as e:
        # Network error or timeout, return -1 to indicate check failed
        print(f"Error checking Have I Been Pwned: {e}")
        return -1

