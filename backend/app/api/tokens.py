from app import db
from app.api import bp
from app.models import User

from flask import current_app, request, jsonify
from flask_login import current_user

from datetime import datetime
from dateutil.relativedelta import relativedelta

import jwt

from ..func import isAuth


def createAccessToken():
    try:
        return jwt.encode(payload={'userName': current_user.name,
                                   'userId': current_user.id,
                                   'exp': datetime.now().timestamp() + 900,
                                   'tokenVersion': current_user.token}, key=current_app.config['ACCESS_TOKEN_SECRET'])
    except:
        return None


def createRefreshToken():
    try:
        print(current_user.name)
        return jwt.encode(payload={'userName': current_user.name,
                                   'userId': current_user.id,
                                   'exp': datetime.now() +  relativedelta(days=7),
                                   'tokenVersion': current_user.token}, key=current_app.config['REFRESH_TOKEN_SECRET'])
    except:
        return None


def createTutorialToken():
    try:
        return jwt.encode(payload={'userName': current_user.name,
                                   'userId': current_user.id,
                                   'tokenVersion': current_user.token}, key=current_app.config['TUTORIAL_TOKEN_SECRET'])
    except:
        return jwt.encode(payload={'userName': 'Iberu-TS user',
                                   'userId': 0,
                                   'tokenVersion': 'UchihaItachi'}, key=current_app.config['TUTORIAL_TOKEN_SECRET'])


def revokeRefreshToken(user=current_user):
    user.token += 1
    db.session.commit()


@bp.route('/tokens/token_refresh', methods=['GET'])
def token_refresh():
    token = request.cookies.get('jid')
    if not token:
        return jsonify({'result': False, 'accessToken': ''})
    try:
        payload = jwt.decode(jwt=token, key=current_app.config['REFRESH_TOKEN_SECRET'], algorithms='HS256')
    except:
        return jsonify({'result': False, 'accessToken': ''})

    user = User.query.filter(User.id==payload['userId'])

    if not user:
        return jsonify({'result': False, 'accessToken': ''})
    
    try:
        if current_user.token != payload['tokenVersion']:
            return jsonify({'result': False, 'accessToken': ''})
    except:
        return jsonify({'result': False, 'accessToken': ''})

    return jsonify({'result': True, 'accessToken': createAccessToken()})




@bp.route('/tokens/token_uid', methods=['POST'])
def token_uid():
    return jsonify({'result': True, 'uidToken': createTutorialToken()})