from app import db
from app.api import bp
from app.models import User

from flask import current_app, request, jsonify

import jwt

import re


def bool_param(param) -> bool:
  if param.lower() == 'true':
      return True
  elif param.lower() == 'false':
      return False


def isAuth(request):
    try:
        authorization = request.headers['authorization']
    except:
        raise KeyError('Request failed because the authorization header was missing')
    
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(jwt=token, key=current_app.config['ACCESS_TOKEN_SECRET'], algorithms='HS256')
    except:
        raise ValueError('The current token is not valid')
    
    return payload


def validate(input):
  pattern = r'^[a-zA-Z0-9_-]+$'
  return re.match(pattern, input) is not None