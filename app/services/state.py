from threading import Lock
from pathlib import Path

class AppState:
    """Replaces global variables from original FlaskApp.py"""
    def __init__(self):
        self.sensor_readings = []
        self.sensor_lock = Lock()
        self.data_points = []
        self.desired_flow_graph = None
        self.start_time = None
        self.config_path = Path('app\config\graph_config.json')

# Single instance replaces original globals
app_state = AppState()