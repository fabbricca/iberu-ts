from app import db
from app.api import bp
from app.models import User

from flask import request, jsonify
from flask_login import current_user

from dotenv import dotenv_values

from datetime import datetime
from dateutil.relativedelta import relativedelta

import jwt

import os



basedir = os.path.abspath(os.path.dirname(__file__))
config = dotenv_values(os.path.join(basedir, '.env'))


def createAccessToken():
    try:
        return jwt.encode(payload={'userName': current_user.name,
                                   'exp': datetime.now().timestamp() + 900,
                                   'tokenVersion': current_user.token}, key=config['ACCESS_TOKEN_SECRET'])
    except:
        return None


def createRefreshToken():
    try:
        print(current_user.name)
        return jwt.encode(payload={'userName': current_user.name,
                                   'exp': datetime.now() +  relativedelta(days=7),
                                   'tokenVersion': current_user.token}, key=config['REFRESH_TOKEN_SECRET'])
    except:
        return None


def createTutorialToken():
    try:
        return jwt.encode(payload={'tokenName': current_user.name,
                                   'tokenVersion': current_user.token}, key=config['TUTORIAL_TOKEN_SECRET'])
    except:
        return jwt.encode(payload={'tokenName': 'Iberu-TS user',
                                   'tokenVersion': 'UchihaItachi'}, key=config['TUTORIAL_TOKEN_SECRET'])


def isAuth(request):
    try:
        authorization = request.headers['authorization']
    except:
        raise KeyError('Request failed because the authorization header was missing')
    
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(jwt=token, key=config['ACCESS_TOKEN_SECRET'], algorithms='HS256')
    except:
        raise ValueError('The current token is not valid')
    
    return payload


def revokeRefreshToken(user=current_user):
    user.token += 1
    db.session.commit()


@bp.route('/token_refresh', methods=['POST'])
def token_refresh():
    token = request.cookies.get('jid')
    if not token:
        return jsonify({'result': False, 'acessToken': ''})
    try:
        payload = jwt.decode(jwt=token, key=config['REFRESH_TOKEN_SECRET'], algorithms='HS256')
    except:
        return jsonify({'result': False, 'acessToken': ''})

    user = User.query.filter(User.name==payload['userName'])

    if not user:
        return jsonify({'result': False, 'acessToken': ''})
    
    try:
        if current_user.token != payload['tokenVersion']:
            return jsonify({'result': False, 'acessToken': ''})
    except:
        return jsonify({'result': False, 'acessToken': ''})

    return jsonify({'result': True, 'accessToken': createAccessToken()})




@bp.route('/token_uid', methods=['POST'])
def token_uid():
    return jsonify({'result': True, 'uidToken': createTutorialToken()})