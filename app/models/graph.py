import json
from dataclasses import dataclass
from pathlib import Path

@dataclass
class GraphConfig:
    """Data class holding graph configuration parameters"""
    max_points: int
    min_x: int
    min_y: int
    max_y: int
    max_rico: float

class Graph:
    """Main graph model replicating original helper.py functionality"""
    def __init__(self, setpoints, config_path="graph_config.json"):
        self.setpoints = setpoints
        self.config = self._load_config(Path(config_path))
        self.valid_dataset = False
        self._validate_dataset()

    def _load_config(self, config_path) -> GraphConfig:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                config_data = json.load(f)
                return GraphConfig(
                    max_points=config_data["max_points"]["value"],
                    min_x=config_data["min_x"]["value"],
                    min_y=config_data["min_y"]["value"],
                    max_y=config_data["max_y"]["value"],
                    max_rico=config_data["max_rico"]["value"]
                )
        except (FileNotFoundError, KeyError, json.JSONDecodeError) as e:
            raise RuntimeError(f"Configuration error: {str(e)}")

    def _validate_dataset(self):
        """Replicate original validation logic"""
        # This matches the original placeholder validation
        self.valid_dataset = True

    def add_setpoint(self, x, y):
        """Add a new setpoint"""
        self.setpoints.append((x, y))

    def remove_setpoint(self, index):
        """Remove setpoint by index"""
        if 0 <= index < len(self.setpoints):
            del self.setpoints[index]
        else:
            raise IndexError("Invalid setpoint index")

    def clear_setpoints(self):
        """Clear all setpoints"""
        self.setpoints.clear()

    def __str__(self):
        """String representation matching original"""
        return f"Graph with setpoints: {self.setpoints}"