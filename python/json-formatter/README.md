# JSON Formatter & Validator

A comprehensive JSON and YAML processing tool for the OpenAI Apps SDK. Format, validate, convert, merge, and compare JSON/YAML data with powerful utilities.

## Features

- 🎨 Format and prettify JSON with custom indentation
- 📦 Minify JSON to reduce file size
- ✅ Validate JSON syntax and schema
- 🔄 Convert between JSON and YAML formats
- 🔀 Merge multiple JSON objects
- 🔍 Extract values using JSONPath/dot notation
- 📊 Compare JSON objects and show differences
- ⚡ Fast and reliable processing

## Installation

```bash
cd python/json-formatter
pip install -r requirements.txt
```

## Run Server

```bash
python server.py
```

## Available Tools

### 1. `format_json`

Format and prettify JSON with customizable options.

**Parameters:**
- `json_string` (string, required): The JSON to format
- `indent` (int, optional): Indentation spaces (default: 2)
- `sort_keys` (bool, optional): Sort keys alphabetically (default: false)
- `ensure_ascii` (bool, optional): Escape non-ASCII characters (default: false)

**Example:**
```json
{
  "json_string": "{\"name\":\"John\",\"age\":30,\"city\":\"NYC\"}",
  "indent": 4,
  "sort_keys": true
}
```

### 2. `minify_json`

Remove all whitespace to minimize file size.

**Parameters:**
- `json_string` (string, required): The JSON to minify

**Example:**
```json
{
  "json_string": "{\n  \"name\": \"John\",\n  \"age\": 30\n}"
}
```

**Output:**
```
✓ JSON minified successfully

Original size: 35 bytes
Minified size: 24 bytes
Reduction: 31.4%
```

### 3. `validate_json`

Validate JSON syntax and optionally against a JSON Schema.

**Parameters:**
- `json_string` (string, required): The JSON to validate
- `schema` (object, optional): JSON Schema to validate against

**Example:**
```json
{
  "json_string": "{\"name\": \"John\", \"age\": 30}",
  "schema": {
    "type": "object",
    "properties": {
      "name": {"type": "string"},
      "age": {"type": "integer", "minimum": 0}
    },
    "required": ["name", "age"]
  }
}
```

### 4. `convert_json_to_yaml`

Convert JSON to YAML format.

**Parameters:**
- `json_string` (string, required): The JSON to convert
- `default_flow_style` (bool, optional): Use inline style (default: false)

**Example:**
```json
{
  "json_string": "{\"name\": \"John\", \"hobbies\": [\"reading\", \"coding\"]}"
}
```

**Output:**
```yaml
name: John
hobbies:
  - reading
  - coding
```

### 5. `convert_yaml_to_json`

Convert YAML to JSON format.

**Parameters:**
- `yaml_string` (string, required): The YAML to convert
- `indent` (int, optional): JSON indentation (default: 2)

**Example:**
```json
{
  "yaml_string": "name: John\nage: 30\nhobbies:\n  - reading\n  - coding"
}
```

### 6. `merge_json`

Merge two or more JSON objects.

**Parameters:**
- `json_objects` (array, required): Array of JSON strings to merge
- `deep_merge` (bool, optional): Deep merge nested objects (default: true)

**Example:**
```json
{
  "json_objects": [
    "{\"name\": \"John\", \"age\": 30}",
    "{\"age\": 31, \"city\": \"NYC\"}",
    "{\"hobbies\": [\"reading\"]}"
  ],
  "deep_merge": true
}
```

**Output:**
```json
{
  "name": "John",
  "age": 31,
  "city": "NYC",
  "hobbies": ["reading"]
}
```

### 7. `extract_json_path`

Extract values from JSON using dot notation or JSONPath.

**Parameters:**
- `json_string` (string, required): The JSON to extract from
- `path` (string, required): Path to extract (e.g., "user.name" or "users[0].email")

**Example:**
```json
{
  "json_string": "{\"users\": [{\"name\": \"John\", \"email\": \"john@example.com\"}]}",
  "path": "users[0].email"
}
```

**Output:**
```json
"john@example.com"
```

### 8. `compare_json`

Compare two JSON objects and show differences.

**Parameters:**
- `json1` (string, required): First JSON string
- `json2` (string, required): Second JSON string
- `ignore_order` (bool, optional): Ignore array order (default: false)

**Example:**
```json
{
  "json1": "{\"name\": \"John\", \"age\": 30}",
  "json2": "{\"name\": \"John\", \"age\": 31, \"city\": \"NYC\"}"
}
```

**Output:**
```
Found 2 difference(s):

1. Value changed at path 'age'
   Old: 30
   New: 31

2. Key added at path 'city'
   New: NYC
```

## Testing in ChatGPT

1. Install dependencies: `pip install -r requirements.txt`
2. Start the server: `python server.py`
3. In ChatGPT, go to Settings → Connectors → Add Local Connector
4. Configure the connector:
   - Name: "JSON Formatter"
   - Command: `python /path/to/json-formatter/server.py`
5. Test with prompts like:
   - "Format this JSON: {\"name\":\"John\",\"age\":30}"
   - "Minify this JSON to reduce file size: ..." 
   - "Convert this JSON to YAML: ..."
   - "Compare these two JSON objects: ... and ..."

## Use Cases

### Development
- **Code Formatting**: Format JSON config files in projects
- **API Testing**: Validate and format API responses
- **Data Migration**: Convert between JSON and YAML formats
- **Configuration Management**: Merge multiple config files

### Data Processing
- **ETL Pipelines**: Validate JSON data in pipelines
- **Data Analysis**: Extract specific fields from large JSON
- **Data Transformation**: Convert between data formats
- **Quality Assurance**: Validate JSON against schemas

### Documentation
- **API Documentation**: Format JSON examples
- **Schema Documentation**: Validate example data
- **Configuration Docs**: Convert between formats for clarity

### Debugging
- **Diff Analysis**: Compare API responses
- **Schema Validation**: Ensure data matches contracts
- **Data Inspection**: Extract and examine nested values

## JSONPath Examples

Extract data using dot notation or JSONPath:

```
users[0].name          → First user's name
users[0].emails[1]     → First user's second email
company.address.city   → Nested object access
products[2].price      → Third product's price
```

## JSON Schema Validation

Validate JSON against schemas for:
- Type checking (string, number, boolean, object, array)
- Required fields enforcement
- Value constraints (minimum, maximum, pattern)
- Array item validation
- Nested object validation

**Example Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "age": {"type": "integer", "minimum": 0, "maximum": 150},
    "email": {"type": "string", "format": "email"}
  },
  "required": ["name", "email"]
}
```

## Deep Merge vs Shallow Merge

**Deep Merge** (default):
- Recursively merges nested objects
- Preserves nested structure
- Combines values at all levels

**Shallow Merge**:
- Only merges top-level keys
- Replaces nested objects entirely
- Faster for simple objects

## Troubleshooting

**Issue**: "Invalid JSON" error
- Check for missing quotes, commas, or brackets
- Use the `validate_json` tool to get specific error location
- Ensure proper escaping of special characters

**Issue**: "Path not found" when extracting
- Verify the path exists in the JSON
- Use dot notation (user.name) or array indexing (users[0])
- Check for typos in key names

**Issue**: YAML conversion issues
- Ensure YAML is properly indented (spaces, not tabs)
- Check for special characters that need quoting
- Validate YAML syntax before converting

## Performance

- JSON parsing: O(n) where n is input size
- Formatting: O(n)
- Minification: O(n)
- Deep merge: O(n*m) where m is nesting depth
- Comparison: O(n) for shallow, O(n*m) for deep structures

## License

MIT

