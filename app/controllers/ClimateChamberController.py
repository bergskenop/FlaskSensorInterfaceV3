import json
import time
from app.models.mockClimateChamber import MockClimateChamber

SENSOR_DATA_PATH = 'app/config/sensor_data.json'

class ClimateChamberController(MockClimateChamber):
    """Handles the control logic of the climate chamber separately from hardware management."""

    def __init__(self):
        """Initialize the controller with access to the ClimateChamber instance and its config."""
        super().__init__()  # Ensures the singleton instance is used
        self.running = False  # Controls whether sensor_data_generator runs
        self._desired_graph = None # Stores instance of desired temperature graph

    def set_desired_graph(self, Graph):
        self._desired_graph = Graph

    def apply_heating_control(self, error: float):
        """Apply heating control logic based on the PID error value."""
        power = self._calculate_pid_power(error)
        print(f"\nClimateChamberController: Applying heating power {power}%")
        self.set_heating(power)

    def apply_cooling_control(self, error: float):
        """Apply cooling control logic based on the PID error value."""
        power = self._calculate_pid_power(-error)  # Negative error means too hot
        print(f"\nClimateChamberController: Applying cooling power {power}%")
        self.set_cooling(power)

    def _calculate_pid_power(self, error: float) -> float:
        """Simple proportional-only control for now (can be expanded to full PID)."""
        kp = self.config.kp  # Access configuration
        power = kp * error  # Proportional control (P-only)
        return max(0, min(100, power))  # Clamp power between 0% and 100%

    def start_sensor_stream(self):
        """Start the sensor data stream."""
        self.running = True
        print("\nClimateChamberController: Sensor stream started.")

    def stop_sensor_stream(self):
        """Stop the sensor data stream."""
        self.running = False
        print("\nClimateChamberController: Sensor stream stopped.")

    def sensor_data_generator(self):
        """Generator function for Server-Sent Events (SSE), now controlled via self.running."""
        delay = self.config.read_delay
        while self.running:
            try:
                with open(SENSOR_DATA_PATH, 'r') as file:
                    data = json.load(file)
                yield f"data: {json.dumps(data)}\n\n"
            except (FileNotFoundError, json.JSONDecodeError):
                yield "data: {\"error\": \"Failed to read sensor data\"}\n\n"
            time.sleep(delay)
        yield "data: {\"status\": \"stopped\"}\n\n"  # Send final message before stopping
