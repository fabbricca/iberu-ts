from flask import Blueprint, request, jsonify

bp = Blueprint('api', __name__)
@bp.before_request
def validate_content_type_json():
  if request.headers.get('Content-Type') != 'application/json':
    return jsonify({'error': 'Invalid Content-Type. Expected application/json.'}), 400

from app.api import users, errors, tokens, strategy, candlestick