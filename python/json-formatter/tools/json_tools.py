"""JSON/YAML processing and validation utilities."""

import json
import yaml
from typing import Any, Dict, List, Tuple, Optional
from jsonschema import validate, ValidationError

def format_json(
    json_string: str,
    indent: int = 2,
    sort_keys: bool = False,
    ensure_ascii: bool = False
) -> Tuple[str, Dict[str, Any]]:
    """Format JSON with pretty printing."""
    
    try:
        data = json.loads(json_string)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {str(e)}")
    
    formatted = json.dumps(
        data,
        indent=indent,
        sort_keys=sort_keys,
        ensure_ascii=ensure_ascii
    )
    
    stats = {
        "original_size": len(json_string),
        "formatted_size": len(formatted),
        "lines": len(formatted.split('\n'))
    }
    
    return formatted, stats

def minify_json(json_string: str) -> Tuple[str, Dict[str, Any]]:
    """Minify JSON by removing all whitespace."""
    
    try:
        data = json.loads(json_string)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {str(e)}")
    
    minified = json.dumps(data, separators=(',', ':'))
    
    stats = {
        "original_size": len(json_string),
        "minified_size": len(minified),
        "reduction_percent": ((len(json_string) - len(minified)) / len(json_string)) * 100
    }
    
    return minified, stats

def validate_json(
    json_string: str,
    schema: Optional[Dict] = None
) -> Tuple[bool, str, Dict[str, Any]]:
    """Validate JSON syntax and optionally against a schema."""
    
    try:
        data = json.loads(json_string)
    except json.JSONDecodeError as e:
        return False, str(e), {
            "line": e.lineno,
            "column": e.colno
        }
    
    # If schema provided, validate against it
    if schema:
        try:
            validate(instance=data, schema=schema)
        except ValidationError as e:
            return False, str(e.message), {
                "path": list(e.path),
                "schema_path": list(e.schema_path)
            }
    
    # Get basic info about the JSON
    details = {
        "type": type(data).__name__
    }
    
    if isinstance(data, dict):
        details["keys"] = list(data.keys())
    elif isinstance(data, list):
        details["items"] = len(data)
    
    return True, "Valid JSON", details

def convert_json_to_yaml(
    json_string: str,
    default_flow_style: bool = False
) -> str:
    """Convert JSON to YAML format."""
    
    try:
        data = json.loads(json_string)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {str(e)}")
    
    yaml_output = yaml.dump(
        data,
        default_flow_style=default_flow_style,
        sort_keys=False,
        allow_unicode=True
    )
    
    return yaml_output

def convert_yaml_to_json(
    yaml_string: str,
    indent: int = 2
) -> str:
    """Convert YAML to JSON format."""
    
    try:
        data = yaml.safe_load(yaml_string)
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML: {str(e)}")
    
    json_output = json.dumps(data, indent=indent)
    
    return json_output

def merge_json(
    json_objects: List[str],
    deep_merge: bool = True
) -> Dict[str, Any]:
    """Merge multiple JSON objects."""
    
    if not json_objects:
        return {}
    
    # Parse all JSON objects
    parsed_objects = []
    for i, json_str in enumerate(json_objects):
        try:
            data = json.loads(json_str)
            if not isinstance(data, dict):
                raise ValueError(f"Object {i+1} is not a JSON object")
            parsed_objects.append(data)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in object {i+1}: {str(e)}")
    
    # Merge objects
    result = {}
    for obj in parsed_objects:
        if deep_merge:
            result = _deep_merge(result, obj)
        else:
            result.update(obj)
    
    return result

def _deep_merge(dict1: Dict, dict2: Dict) -> Dict:
    """Deep merge two dictionaries."""
    result = dict1.copy()
    
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    
    return result

def extract_json_path(json_string: str, path: str) -> Any:
    """Extract a value from JSON using dot notation or JSONPath."""
    
    try:
        data = json.loads(json_string)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {str(e)}")
    
    # Simple dot notation parser
    if path.startswith('$.'):
        path = path[2:]  # Remove $. prefix
    
    parts = path.split('.')
    current = data
    
    for part in parts:
        # Handle array indexing like users[0]
        if '[' in part and ']' in part:
            key, index_str = part.split('[')
            index = int(index_str.rstrip(']'))
            
            if key:
                current = current[key]
            current = current[index]
        else:
            if isinstance(current, dict):
                current = current.get(part)
            else:
                raise ValueError(f"Cannot access '{part}' on non-object")
        
        if current is None:
            raise ValueError(f"Path not found: {path}")
    
    return current

def compare_json(
    json1: str,
    json2: str,
    ignore_order: bool = False
) -> List[Dict[str, Any]]:
    """Compare two JSON objects and return differences."""
    
    try:
        data1 = json.loads(json1)
        data2 = json.loads(json2)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {str(e)}")
    
    differences = []
    _compare_values(data1, data2, '', differences, ignore_order)
    
    return differences

def _compare_values(
    val1: Any,
    val2: Any,
    path: str,
    differences: List[Dict[str, Any]],
    ignore_order: bool
) -> None:
    """Recursively compare two values."""
    
    if type(val1) != type(val2):
        differences.append({
            "type": "Type mismatch",
            "path": path or "root",
            "old_value": f"{type(val1).__name__}",
            "new_value": f"{type(val2).__name__}"
        })
        return
    
    if isinstance(val1, dict):
        # Compare keys
        keys1 = set(val1.keys())
        keys2 = set(val2.keys())
        
        # Keys only in val1
        for key in keys1 - keys2:
            differences.append({
                "type": "Key removed",
                "path": f"{path}.{key}" if path else key,
                "old_value": val1[key]
            })
        
        # Keys only in val2
        for key in keys2 - keys1:
            differences.append({
                "type": "Key added",
                "path": f"{path}.{key}" if path else key,
                "new_value": val2[key]
            })
        
        # Keys in both
        for key in keys1 & keys2:
            new_path = f"{path}.{key}" if path else key
            _compare_values(val1[key], val2[key], new_path, differences, ignore_order)
    
    elif isinstance(val1, list):
        if ignore_order:
            # Compare as sets (order-independent)
            if len(val1) != len(val2):
                differences.append({
                    "type": "Array length mismatch",
                    "path": path or "root",
                    "old_value": len(val1),
                    "new_value": len(val2)
                })
        else:
            # Compare order-dependent
            if len(val1) != len(val2):
                differences.append({
                    "type": "Array length mismatch",
                    "path": path or "root",
                    "old_value": len(val1),
                    "new_value": len(val2)
                })
            
            for i, (item1, item2) in enumerate(zip(val1, val2)):
                new_path = f"{path}[{i}]" if path else f"[{i}]"
                _compare_values(item1, item2, new_path, differences, ignore_order)
    
    else:
        # Primitive values
        if val1 != val2:
            differences.append({
                "type": "Value changed",
                "path": path or "root",
                "old_value": val1,
                "new_value": val2
            })

