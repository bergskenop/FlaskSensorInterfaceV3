import json

from flask import Blueprint, jsonify, request, Response
from app.services.state import app_state
import time
import subprocess

sensor_bp = Blueprint('sensor', __name__)
SENSOR_DATA_PATH = 'app/config/sensor_data.json'
GRAPH_CONFIG_PATH = 'app/config/graph_config.json'

# Global flag to control the sensor loop
should_continue = True

def get_sensor_read_delay():
    """Gets the sensor read delay from the configuration file."""
    try:
        with open(GRAPH_CONFIG_PATH, 'r') as file:
            config = json.load(file)
            return config['sensor_read_delay']['value']
    except (FileNotFoundError, KeyError, json.JSONDecodeError):
        return 2  # Default delay if config can't be read

def read_sensor_data_from_file():
    """Reads the latest sensor data from JSON."""
    with open(SENSOR_DATA_PATH, 'r') as file:
        return json.load(file)

def sensor_data_generator():
    """Generator function for Server-Sent Events (SSE)."""
    global should_continue
    delay = get_sensor_read_delay()
    while should_continue:
        data = read_sensor_data_from_file()
        yield f"data: {json.dumps(data)}\n\n"
        time.sleep(delay)
    yield "data: {\"status\": \"stopped\"}\n\n"  # Send final message before stopping

@sensor_bp.route('/stream')
def stream():
    """Route that streams sensor data to the frontend."""
    global should_continue
    should_continue = True
    return Response(sensor_data_generator(), mimetype='text/event-stream')

@sensor_bp.route('/start_sensors', methods=['POST'])
def start_sensors():
    """Simulate starting the sensor reading process."""
    global should_continue
    should_continue = True
    return jsonify({'status': 'sensors started'})

@sensor_bp.route('/start-sensor-script', methods=['POST'])
def start_sensor_script():
    if not app_state.data_points:
        return jsonify({"error": "No temperature set"}), 400

    temperature = app_state.data_points[0]['y']
    app_state.start_time = time.time()

    try:
        subprocess.Popen(["python", "sensor_reader.py", str(temperature)])
        return jsonify({"message": "Monitoring started"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@sensor_bp.route('/start-measurement', methods=['GET'])
def get_temperature():
    return jsonify({})  # Maintain original empty response

@sensor_bp.route('/stop_sensors', methods=['POST'])
def stop_sensors():
    """Stop the sensor reading process."""
    global should_continue
    should_continue = False
    return jsonify({'status': 'sensors stopped'})