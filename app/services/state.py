from threading import Lock
from pathlib import Path
import os


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

        # Paths
        self.config_dir = Path('app/config')
        self.graph_config_path = self.config_dir / 'graph_config.json'
        self.control_config_path = self.config_dir / 'control_config.json'
        self.sensor_data_path = self.config_dir / 'sensor_data.json'

        # Ensure config directory exists
        os.makedirs(self.config_dir, exist_ok=True)

        # Create components using the factory
        self.config_manager = self._create_config_manager()
        self.climate_chamber = self._create_climate_chamber()
        self.controller = self._create_controller()

    def _create_config_manager(self):
        """Factory method for creating the config manager."""
        from app.models.config.ConfigManager import ConfigManager
        return ConfigManager(str(self.control_config_path))

    def _create_climate_chamber(self):
        """Factory method for creating the climate chamber implementation."""
        # Choose implementation based on environment
        if os.environ.get('ENVIRONMENT') == 'production':
            from app.models.ClimateChamber import ClimateChamber
            return ClimateChamber()
        else:
            from app.models.mock.MockClimateChamber import MockClimateChamber
            return MockClimateChamber()

    def _create_controller(self):
        """Factory method for creating the controller."""
        from app.controllers.ClimateChamberController import ClimateChamberController
        return ClimateChamberController(
            self.climate_chamber,
            self.config_manager.pid_config
        )

    def add_reading(self, sensor_name, reading):
        """Adds a new reading for a specific sensor."""
        with self.sensor_lock:
            if sensor_name not in self.sensor_readings:
                self.sensor_readings[sensor_name] = []
            self.sensor_readings[sensor_name].append(reading)

    def get_readings(self, sensor_name):
        """Returns all readings for a specific sensor."""
        with self.sensor_lock:
            return self.sensor_readings.get(sensor_name, []).copy()