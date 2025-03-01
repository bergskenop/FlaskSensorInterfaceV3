from threading import Lock
from pathlib import Path
from app.controllers.ClimateChamberController import ClimateChamberController

class AppState:
    """Global singleton for project-wide state management."""
    _instance = None
    _lock = Lock()  # Ensure thread safety when initializing

    def __new__(cls):
        """Ensures only one instance of AppState is created."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:  # Double-check inside lock
                    cls._instance = super(AppState, cls).__new__(cls)
                    cls._instance._init_state()  # Safe to call now
        return cls._instance

    def _init_state(self):
        """Initializes instance variables (only runs once)."""
        self.sensor_readings = {}
        self.sensor_lock = Lock()
        self.data_points = []
        self.desired_flow_graph = None
        self.desired_flow_points = None
        self.start_time = None
        self.graph_config_path = Path('app/config/graph_config.json')
        self.control_config_path = Path('app/config/control_config.json')
        self.climateChamberController = ClimateChamberController()

    def add_reading(self, sensor_name, reading):
        """Adds a new reading for a specific sensor."""
        if sensor_name not in self.sensor_readings:
            self.sensor_readings[sensor_name] = []
        self.sensor_readings[sensor_name].append(reading)

    def get_readings(self, sensor_name):
        """Returns all readings for a specific sensor."""
        return self.sensor_readings.get(sensor_name, [])

