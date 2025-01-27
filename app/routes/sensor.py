from flask import Blueprint, jsonify, request
from app.services.state import app_state
import time
import subprocess

sensor_bp = Blueprint('sensor', __name__)


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