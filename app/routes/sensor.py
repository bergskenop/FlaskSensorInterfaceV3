import json

from flask import Blueprint, jsonify, request, Response
from app.services.state import app_state
import time
import subprocess

sensor_bp = Blueprint('sensor', __name__)
SENSOR_DATA_PATH = 'app/config/sensor_data.json'

# Global flag to control the sensor loop
should_continue = True

def read_sensor_data():
    """Reads the latest sensor data from JSON."""
    with open(SENSOR_DATA_PATH, 'r') as file:
        return json.load(file)

def sensor_data_generator():
    """Generator function for Server-Sent Events (SSE)."""
    global should_continue
    while should_continue:
        data = read_sensor_data()
        yield f"data: {json.dumps(data)}\n\n"
        time.sleep(2)
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


@sensor_bp.route('/api/sensor-data', methods=['POST'])
def receive_sensor_data():
    data = request.get_json()
    with app_state.sensor_lock:
        app_state.sensor_readings.append({
            'x': data['elapsed'],
            'y': data['temperature']
        })
    return jsonify({"message": "Data received"}), 200


@sensor_bp.route('/get-sensor-data', methods=['GET'])
def get_sensor_data():
    with app_state.sensor_lock:
        return jsonify(app_state.sensor_readings)


@sensor_bp.route('/start-measurement', methods=['GET'])
def get_temperature():
    return jsonify({})  # Maintain original empty response

@sensor_bp.route('/stop_sensors', methods=['POST'])
def stop_sensors():
    """Stop the sensor reading process."""
    global should_continue
    should_continue = False
    return jsonify({'status': 'sensors stopped'})