from app import db
from app.api import bp
from app.models import Asset, Candlestick

import sqlalchemy as sa

from flask import jsonify, request, current_app

from datetime import datetime
from dateutil.relativedelta import relativedelta

from ..func import validate

SECOND_IN_A_DAY = 86400
TIMEFRAME = [5, 60, 1440]


@bp.route('/candlesticks/<string:asset>', methods=['GET', 'POST'])
def candlesticks(asset):
  asset, timeframe = asset.split('_')
  if not validate(asset):
    return jsonify({'result': False,
                    'message': 'Invalid URI'})
  timeframe = int(timeframe)
  asset = asset.upper()
  ending_t = int(request.args.get('timestamp')) if request.args.get('timestamp') else datetime.now().timestamp() - current_app.config['TIMESTAMP_DELAY']
  starting_t = ending_t - current_app.config['TIMESTAMP_DELAY']
  if starting_t < (datetime.now() - relativedelta(days=150)).timestamp():
    return jsonify({'result': False,
                    'message': 'Date too old'})
  if request.method == 'GET':
    timestamp = [t for t, in db.session.query(Candlestick.timestamp).filter((Candlestick.timestamp>=starting_t)&(Candlestick.timestamp<ending_t)\
                                                                            &(Candlestick.timeframe==timeframe)&(Candlestick.symbol==asset))]
    open = [o for o, in db.session.query(Candlestick.open).filter((Candlestick.timestamp>=starting_t)&(Candlestick.timestamp<ending_t)\
                                                                            &(Candlestick.timeframe==timeframe)&(Candlestick.symbol==asset))]
    high = [h for h, in db.session.query(Candlestick.high).filter((Candlestick.timestamp>=starting_t)&(Candlestick.timestamp<ending_t)\
                                                                            &(Candlestick.timeframe==timeframe)&(Candlestick.symbol==asset))]
    low = [l for l, in db.session.query(Candlestick.low).filter((Candlestick.timestamp>=starting_t)&(Candlestick.timestamp<ending_t)\
                                                                            &(Candlestick.timeframe==timeframe)&(Candlestick.symbol==asset))]
    close = [c for c, in db.session.query(Candlestick.close).filter((Candlestick.timestamp>=starting_t)&(Candlestick.timestamp<ending_t)\
                                                                            &(Candlestick.timeframe==timeframe)&(Candlestick.symbol==asset))]
    volume = [v for v, in db.session.query(Candlestick.volume).filter((Candlestick.timestamp>=starting_t)&(Candlestick.timestamp<ending_t)\
                                                                            &(Candlestick.timeframe==timeframe)&(Candlestick.symbol==asset))]
    result = {'result': True,
              'date': timestamp,
              'open': open,
              'high': high,
              'low': low,
              'close': close,
              'volume': volume,}
  if request.method == 'POST':
    dictionary = {}
    timestamp = [t for t, in db.session.query(Candlestick.timestamp).filter((Candlestick.timestamp>=starting_t)&(Candlestick.timestamp<ending_t)\
                                                                           &(Candlestick.timeframe==timeframe)&(Candlestick.timestamp%SECOND_IN_A_DAY==0)\
                                                                           &(Candlestick.symbol==asset))]
    data = request.get_json()
    assets = data['uri']
    for a in assets:
      asset, timeframe = a.split('_')
      close = db.session.query(Candlestick.close, Candlestick.asset_id).filter((Candlestick.timestamp>=starting_t)&(Candlestick.timestamp<ending_t)\
                                                                              &(Candlestick.timeframe==timeframe)&(Candlestick.timestamp%SECOND_IN_A_DAY==0)\
                                                                              &(Candlestick.symbol==asset.upper()))
      key = Asset.query.filter(Asset.id==close[0][1]).first()
      close = [c0 for c0, c1 in close]
      dictionary.update({key.name: close})
    result = {'result': True,
              'date': timestamp,
              'close': dictionary,}
  return jsonify(result)