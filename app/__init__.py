import os
from flask import Flask

def create_app():
    app = Flask(__name__, static_url_path='/static')
    app.secret_key = os.urandom(24)
    app.config['JSON_AS_ASCII'] = False

    # Absolute imports
    from app.routes.main import main_bp
    from app.routes.graph import graph_bp
    from app.routes.sensor import sensor_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(graph_bp)
    app.register_blueprint(sensor_bp)

    return app