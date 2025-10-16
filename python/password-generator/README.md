# Password Generator & Security Checker

A comprehensive password generation and security analysis tool for the OpenAI Apps SDK. Generate secure passwords, check password strength, and verify if passwords have been compromised in data breaches.

## Features

- 🔐 Generate cryptographically secure random passwords
- 🎲 Create memorable passphrases
- 📊 Analyze password strength with detailed metrics
- 🔍 Check passwords against 600+ million compromised passwords (Have I Been Pwned)
- 🛡️ Entropy calculation and crack time estimation
- ⚙️ Highly customizable generation options
- 🔒 Privacy-focused (uses k-anonymity for breach checks)

## Installation

```bash
cd python/password-generator
pip install -r requirements.txt
```

## Run Server

```bash
python server.py
```

## Available Tools

### 1. `generate_password`

Generate a secure random password with customizable options.

**Parameters:**
- `length` (int, optional): Password length, 8-128 characters (default: 16)
- `include_uppercase` (bool, optional): Include A-Z (default: true)
- `include_lowercase` (bool, optional): Include a-z (default: true)
- `include_numbers` (bool, optional): Include 0-9 (default: true)
- `include_symbols` (bool, optional): Include special characters (default: true)
- `exclude_ambiguous` (bool, optional): Exclude 0, O, l, 1, I (default: false)
- `count` (int, optional): Number of passwords to generate, 1-20 (default: 1)

**Example:**
```json
{
  "length": 20,
  "include_uppercase": true,
  "include_lowercase": true,
  "include_numbers": true,
  "include_symbols": true,
  "exclude_ambiguous": true,
  "count": 5
}
```

**Output:**
```
Generated Password: K#mP9$xL@wQz2&Nv
Length: 16 characters
Entropy: 95.27 bits
Estimated crack time: 1247 years
```

### 2. `check_password_strength`

Analyze password strength with detailed feedback and suggestions.

**Parameters:**
- `password` (string, required): The password to analyze
- `user_inputs` (array, optional): Personal info to check against (e.g., ["john", "doe", "john@email.com"])

**Example:**
```json
{
  "password": "MyP@ssw0rd2024",
  "user_inputs": ["john", "doe"]
}
```

**Output:**
```
Password Strength Analysis
==================================================

Password: **************
Length: 14 characters
Entropy: 82.41 bits
Strength: Strong
Score: 4/5
Estimated crack time: 152 years

Character Types:
  • lowercase: ✓
  • uppercase: ✓
  • numbers: ✓
  • symbols: ✓

💡 Suggestions:
  • Increase password length to at least 16 characters
```

### 3. `check_password_breach`

Check if a password has been exposed in known data breaches.

**Parameters:**
- `password` (string, required): The password to check

**Example:**
```json
{
  "password": "password123"
}
```

**Output:**
```
⚠️  WARNING: This password has been found in 2,456,789 data breaches!

This password is compromised and should NOT be used.
Please generate a new password immediately.
```

**Privacy Note:** This tool uses the Have I Been Pwned API with k-anonymity. Only the first 5 characters of your password's SHA-1 hash are sent, making it impossible for the service to know your actual password.

### 4. `generate_passphrase`

Generate a memorable passphrase using random words.

**Parameters:**
- `word_count` (int, optional): Number of words, 3-10 (default: 4)
- `separator` (string, optional): Character between words (default: "-")
- `capitalize` (bool, optional): Capitalize first letter of each word (default: false)
- `add_number` (bool, optional): Add a number at the end (default: false)

**Example:**
```json
{
  "word_count": 5,
  "separator": "-",
  "capitalize": true,
  "add_number": true
}
```

**Output:**
```
Generated Passphrase: Correct-Horse-Battery-Staple-Thunder-7492
Length: 46 characters
Words: 5
Entropy: 87.32 bits
Estimated crack time: 487 years

💡 Tip: Passphrases are easier to remember than random passwords!
```

## Testing in ChatGPT

1. Install dependencies: `pip install -r requirements.txt`
2. Start the server: `python server.py`
3. In ChatGPT, go to Settings → Connectors → Add Local Connector
4. Configure the connector:
   - Name: "Password Generator"
   - Command: `python /path/to/password-generator/server.py`
5. Test with prompts like:
   - "Generate a strong password for me"
   - "Check the strength of my password: MyPassword123"
   - "Has the password 'qwerty123' been compromised?"
   - "Generate a memorable passphrase with 5 words"

## Use Cases

- **Account Creation**: Generate strong passwords for new accounts
- **Security Audit**: Check existing passwords for strength and breaches
- **Password Policy**: Validate passwords meet security requirements
- **Education**: Teach users about password security
- **Password Manager**: Generate passwords for a password manager
- **Compliance**: Meet security standards (NIST, PCI-DSS, etc.)

## Security Best Practices

### Password Generation
- Use at least 16 characters for high-security accounts
- Enable all character types (uppercase, lowercase, numbers, symbols)
- Generate a unique password for each account
- Use a password manager to store passwords securely

### Password Strength
- **Entropy**: Aim for 80+ bits (effectively uncrackable)
- **Length**: Longer is better (16+ characters recommended)
- **Complexity**: Use all character types
- **Uniqueness**: Never reuse passwords

### Entropy Levels
- < 40 bits: Very Weak - easily cracked
- 40-60 bits: Weak - vulnerable to targeted attacks
- 60-80 bits: Moderate - adequate for low-value accounts
- 80-100 bits: Strong - good for most accounts
- 100+ bits: Very Strong - suitable for high-security accounts

## API Reference

### Have I Been Pwned
This tool uses the [Have I Been Pwned](https://haveibeenpwned.com/) API to check for compromised passwords. The service uses k-anonymity to protect privacy:

1. Your password is hashed with SHA-1
2. Only the first 5 characters of the hash are sent to the API
3. The API returns all hashes starting with those 5 characters
4. Your password is checked locally against the results

This means the API never sees your actual password or full hash.

## Troubleshooting

**Issue**: ImportError for `mcp` module
- Install dependencies: `pip install -r requirements.txt`
- Ensure Python 3.8+ is being used

**Issue**: Network error when checking breaches
- Check internet connection
- Have I Been Pwned API might be temporarily unavailable
- The tool will still work for password generation and strength checking

**Issue**: "At least one character type must be included" error
- Enable at least one character type option
- Cannot generate password with all character types disabled

## License

MIT

