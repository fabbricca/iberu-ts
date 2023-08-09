from app import db
from app.api import bp
from app.models import Indicator, Product, Subscription, Transaction, Asset, Api, Exchange

from .tokens import isAuth

from sqlalchemy.sql import text

from flask import current_app, jsonify, request
from flask_login import current_user, login_required

from datetime import datetime
from dateutil.relativedelta import relativedelta

import re


CHART_TIME_SPAN = 120
SECONDS_IN_A_DAY = 86400



@bp.route('/user', methods=['POST'])
@login_required
def get_user():
  trades = []
  dates = []
  query = text(f"""SELECT tr.percentage, tr.close_timestamp
                   FROM transaction t
                   JOIN user u ON t.user_id = u.id
                   JOIN subscription s ON s.transaction_id = t.id
                   JOIN strategy st ON t.product_id = st.id
                   JOIN trade tr ON tr.product_id = st.id
                   WHERE tr.open_timestamp >= s.subscription_timestamp AND tr.open_timestamp < s.unsubscription_timestamp AND u.id = {current_user.id}
                   GROUP BY tr.percentage, tr.close_timestamp
                   ORDER BY tr.close_timestamp;""").compile()
  data = db.engine.execute(query)
  for r in data:
    trades.append(r[0])
    dates.append(r[1])
  query = text(f"""SELECT a.name, COUNT(*)
                   FROM transaction t
                   JOIN user u ON t.user_id = u.id
                   JOIN strategy st ON t.product_id = st.id
                   JOIN strategyasset sa ON sa.strategy_id = st.id
                   JOIN asset a ON sa.asset_id = a.id
                   WHERE u.id = {current_user.id}
                   GROUP BY a.name;""").compile()
  assets = {r[0]: r[1] for r in db.engine.execute(query)}
  query = text(f"""SELECT p.name, COUNT(*)
                   FROM transaction t
                   JOIN user u ON t.user_id = u.id
                   JOIN product p ON t.product_id = p.id
                   WHERE u.id = {current_user.id}
                   GROUP BY p.name;""").compile()
  strategies = {r[0]: r[1] for r in db.engine.execute(query)}
  result = {
    "values": trades,
    "dates": dates,
    "strategies": strategies,
    "assets": assets,
    "startDate": dates[0] - SECONDS_IN_A_DAY if dates else (datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - relativedelta(years=1)).timestamp(),
    "endDate": datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp(),
  }
  return jsonify(result)




@bp.route('/user/subscription', methods=['POST'])
@login_required
def user_subscription():
  if not isAuth(request):
    return jsonify({'result': False})
  data = request.get_json()
  for s in data:
    try:
      strategy = db.session.query(Product.id).filter(Product.name==s['strategy']).first()[0]
      transaction = db.session.query(Transaction.id).filter((Transaction.user_id==current_user.id)
                                                          &(Transaction.product_id==strategy)).order_by(Transaction.timestamp.desc()).first()[0]
      subscription = Subscription.query.filter((Subscription.transaction_id==transaction)&(Subscription.unsubscription_timestamp>datetime.now().timestamp())).first()
      if s['capital']:
        subscription.capital = int(s['capital'])
        db.session.commit()
      if s['leverage']:
        subscription.preferred_leverage = int(s['leverage']) if int(s['leverage']) < current_app.config['MAX_LEVERAGE'] else current_app.config['MAX_LEVERAGE']
        db.session.commit()
      if s['quote']:
        quote = Asset.query.filter(Asset.name.ilike(s['quote'])).first()
        if quote and quote.id != subscription.quote_id:
          subscription.quote_id = quote.id
          db.session.commit()
      if s['api']:
        api = Api.query.filter(Api.name==s['api']).first()
        if api and api.id != subscription.api_id:
          subscription.api_id = api.id
          db.session.commit()
      if s['status']:
        if s['status'] == 'false':
          subscription.active = False
        elif s['status'] == 'true' and subscription.unsubscription_timestamp > datetime.now().timestamp() and subscription.api_id:
          subscription.active = True
        db.session.commit()
    except:
      pass
  return jsonify({'result': True})




@bp.route('/user/delete_api', methods=['POST'])
def user_delete_api():
  if not isAuth(request):
    return jsonify({'result': False})
  data = request.get_json()
  api = Api.query.filter((Api.name==data['api'])&(Api.user_id==current_user.id)).first()
  if api:
    current_timestamp = datetime.now().timestamp()
    active_subscription = text(f"""UPDATE subscription s
                                    SET s.api_id = NULL, s.active = 0
                                    WHERE s.api_id = {api.id} AND s.unsubscription_timestamp > {current_timestamp};""").compile()
    db.engine.execute(active_subscription)
    db.session.delete(api)
    db.session.commit()
  return jsonify({'result': True})




@bp.route('/user/create_api', methods=['POST'])
def user_create_api():
  if not isAuth(request):
    return jsonify({'result': False})
  data = request.get_json()
  exchange = Exchange.query.filter(Exchange.name==data['exchange']).first()
  if exchange and data['api'] != 'null':
    db.session.add(Api(name=data['api'][:9], api_key=data['api_key'], api_secret=data['api_secret'], user_id=current_user.id, exchange_id=exchange.id))
    db.session.commit()
    return jsonify({'result': True})
  return jsonify({'result': False})




@bp.route('/user/color', methods=['POST'])
def color():
  if request.method == 'POST' and isAuth(request):
    for d in request.get_json():
      if 'strategy' in d:
        s = Product.query.filter(Product.id==d['strategy']).first()
        if s and re.search(r'^#(?:[0-9a-fA-F]{3}){1,2}$', d['color']):
          current_user.set_strategy_color(strategy=s.name, color=d['color'])
      elif 'indicator' in d:
        i = Indicator.query.filter(Indicator.name==d['indicator']).first()
        if i and re.search(r'^#(?:[0-9a-fA-F]{3}){1,2}$', d['color']):
          current_user.set_indicator_color(indicator=i.name, color=d['color'])
    db.session.commit()
    return jsonify({'result': True})
  
  return jsonify({'result': False})