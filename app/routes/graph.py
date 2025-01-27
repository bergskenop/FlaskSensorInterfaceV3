from flask import Blueprint, render_template, jsonify, redirect, url_for, request
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

        if 'data' not in graph_data[0] or 'label' not in graph_data[0] or graph_data[0]["label"] != "Desired flow":
            return jsonify({"error": "Invalid dataset: Missing or incorrect label."}), 400

        data_part = graph_data[0]["data"]
        app_state.data_points = graph_data[0]["data"]
        data_tuples = [(item["x"], item["y"]) for item in data_part]

        app_state.desired_flow_graph = Graph(data_tuples)
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
    return jsonify(app_state.data_points)