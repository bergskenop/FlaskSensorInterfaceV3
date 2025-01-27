import json
from pathlib import Path

def load_config(config_path):
    """Exact replica of original load_graph_config()"""
    with open(config_path, 'r') as f:
        return json.load(f)

def save_config(config_path, data):
    """Replacement for file writing in edit_config"""
    with open(config_path, 'w') as f:
        json.dump(data, f, indent=4)

def deep_merge(original, new):
    """Direct copy from original FlaskApp.py"""
    for key, value in new.items():
        if isinstance(value, dict) and key in original:
            original[key] = deep_merge(original[key], value)
        else:
            original[key] = value
    return original

def try_convert(value):
    """Direct copy from original FlaskApp.py"""
    try:
        return int(value)
    except ValueError:
        try:
            return float(value)
        except ValueError:
            return value