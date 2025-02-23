from threading import Lock
from pathlib import Path

class AppState:
    """Replaces global variables from original FlaskApp.py"""
    def __init__(self):
        self.sensor_readings = {}
        self.sensor_lock = Lock()
        self.data_points = []
        self.desired_flow_graph = None
        self.desired_flow_points = None
        self.start_time = None
        self.config_path = Path('app\config\graph_config.json')

    def add_reading(self, sensor_name, reading):
        """Adds a new reading for a specific sensor."""
        if sensor_name not in self.sensor_readings:
            self.sensor_readings[sensor_name] = []
        self.sensor_readings[sensor_name].append(reading)

    def get_readings(self, sensor_name):
        """Returns all readings for a specific sensor."""
        return self.sensor_readings.get(sensor_name, [])

# Single instance replaces original globals
app_state = AppState()