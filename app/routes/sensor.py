import json

from flask import Blueprint, jsonify, request, Response
from app import app_state
import time
import subprocess

sensor_bp = Blueprint('sensor', __name__)

@sensor_bp.route('/stream')
def stream():
    """Route that streams sensor data to the frontend using the ClimateChamberController instance."""
    app_state.climateChamberController.start_sensor_stream()  # Start the stream
    return Response(app_state.climateChamberController.sensor_data_generator(), mimetype='text/event-stream')

@sensor_bp.route('/start_sensors', methods=['POST'])
def start_sensors():
    """Simulate starting the sensor reading process."""
    return jsonify({'status': 'sensors started'})

@sensor_bp.route('/stop_sensors', methods=['POST'])
def stop_sensors():
    """Stop the sensor reading process."""
    app_state.climateChamberController.stop_sensor_stream()  # Stop the stream
    return jsonify({'status': 'sensors stopped'})