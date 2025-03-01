import json
import os
from pathlib import Path

class ControlConfig:
    """Handles loading and storing control configuration values."""

    CONFIG_PATH = Path("app/config/control_config.json")

    def __init__(self):
        """Initialize and load configuration from file."""
        self.kp = 0.0
        self.ki = 0.0
        self.kd = 0.0
        self.read_delay = 2
        self._load_config()

    def _load_config(self, config_path=CONFIG_PATH):
        """Read configuration from the JSON file and store values."""
        config_path = config_path.resolve()
        print(f"File exists? {config_path.exists()}")
        print(f"File size: {config_path.stat().st_size} bytes")
        try:
            with open(config_path, 'r') as f:
                print(f"Editing config file at: {config_path}")
                config_data = json.load(f)
                self.kp = float(config_data["kp"]["value"])
                self.ki = float(config_data["ki"]["value"])
                self.kd = float(config_data["kd"]["value"])
                self.read_delay = float(config_data["sensor_read_delay"]["value"])
                print(f"\nControlConfig: Loaded config - kp={self.kp}, ki={self.ki}, kd={self.kd}, read_delay={self.read_delay}")
                f.close()
        except (FileNotFoundError, KeyError, json.JSONDecodeError, ValueError) as e:
            raise RuntimeError(f"Configuration error: {str(e)}")

    def reload_config(self):
        self._load_config(Path("app/config/control_config.json"))

