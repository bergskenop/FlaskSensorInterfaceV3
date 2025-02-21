from flask import Blueprint, render_template, jsonify, redirect, url_for, request

from app.services.config import load_config
from app.services.state import app_state  # Absolute import
from app.models.graph import Graph        # Absolute import

graph_bp = Blueprint('graph', __name__)

@graph_bp.route('/setup-graph')
def setup_graph():
    return render_template('setupGraph.html')

@graph_bp.route('/store-graph-data', methods=['POST'])
def store_graph_data():
    try:
        graph_data = request.get_json()
        if not graph_data:
            return jsonify({"error": "No data received"}), 400

        tuple_list = [(point['x'], point['y']) for point in graph_data[0]['data']]

        app_state.desired_flow_graph = Graph(tuple_list)
        if app_state.desired_flow_graph.valid_dataset:
            return redirect(url_for('graph.display_graph'))
        return jsonify({"error": "Invalid dataset: Data does not meet required criteria."}), 400

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@graph_bp.route('/display-graph')
def display_graph():
    return render_template('displayGraph.html')

@graph_bp.route('/get-stored-graph-data', methods=['GET'])
def get_stored_graph_data():
    config = load_config(app_state.config_path)
    
    # Convert Graph object's setpoints to the format expected by frontend
    desired_path = None
    if app_state.desired_flow_graph:
        # Convert tuples to {x, y} format
        desired_path = [{"x": x, "y": y} for x, y in app_state.desired_flow_graph.setpoints]
        
    return jsonify({
        'desired_path': desired_path,
        'data': app_state.data_points,
        'config': {
            'max_rico': config.get('max_rico', {}).get('value')
        }
    })