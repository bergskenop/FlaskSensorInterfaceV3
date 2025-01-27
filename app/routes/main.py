from flask import Blueprint, render_template, redirect, url_for, request, flash
from app.services.state import app_state  # Changed from relative import
from app.services.config import load_config
import json

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return render_template('home.html')


@main_bp.route('/status')
def status():
    return 'Server is up and running', 200


@main_bp.route('/edit-config', methods=['GET', 'POST'])
def edit_config():
    if request.method == 'POST':
        try:
            new_config = {}
            for key, value in request.form.items():
                keys = key.split('.')
                current = new_config
                for k in keys[:-1]:
                    current = current.setdefault(k, {})
                current[keys[-1]] = try_convert(value)

            original_config = load_config(app_state.config_path)
            merged_config = deep_merge(original_config, new_config)

            with open(app_state.config_path, 'w') as f:
                json.dump(merged_config, f, indent=4)

            flash('Configuration updated successfully!', 'success')
        except Exception as e:
            flash(f'Error updating configuration: {str(e)}', 'error')
        return redirect(url_for('main.edit_config'))

    with open(app_state.config_path, 'r') as f:
        config_data = json.load(f)

    return render_template('configEditor.html', config=config_data)


@main_bp.route('/submit-temperature', methods=['POST'])
def submit_temperature():
    try:
        temperature = float(request.form['temperature'])
        config = load_config(app_state.config_path)
        min_temp = config['min_y']['value']
        max_temp = config['max_y']['value']

        if not (min_temp <= temperature <= max_temp):
            flash(f'Temperature must be between {min_temp}°C and {max_temp}°C', 'error')
            return redirect(url_for('main.index'))

        app_state.data_points = [{"x": 0, "y": temperature}]
        flash(f'Temperature set to {temperature}°C', 'success')
        return redirect(url_for('graph.display_graph'))

    except ValueError:
        flash('Invalid temperature value', 'error')
        return redirect(url_for('main.index'))


def try_convert(value):
    try:
        return int(value)
    except ValueError:
        try:
            return float(value)
        except ValueError:
            return value


def deep_merge(original, new):
    for key, value in new.items():
        if isinstance(value, dict) and key in original:
            original[key] = deep_merge(original[key], value)
        else:
            original[key] = value
    return original