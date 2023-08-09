from app import db
from app.api import bp
from app.models import Asset, StrategyIndicator, Strategy, Trade, Candlestick, Exchange, StrategyAsset

import sqlalchemy as sa
from sqlalchemy import text, bindparam, func

from flask import jsonify, request
from flask_login import current_user, AnonymousUserMixin

from datetime import datetime
from dateutil import parser
from dateutil.relativedelta import relativedelta

import secrets

import numpy
from functools import reduce
from empyrical import max_drawdown

FIRST_ABSOLUTE_DATE = (datetime.now() - relativedelta(days=150)).timestamp()
ADD_HISTORICAL_CANDLESTICK_TIMESTAMP = 1296000
FIRSTDAY_TIMESTAMP = 2592000
SECOND_IN_A_MINUTE = 60
SECOND_IN_A_DAY = 86400
TIMEFRAME = [5, 60, 1440]


@bp.route('/lightweight_chart', methods=['POST'])
def lightweight_chart():
  html = f'''<script src="/static/node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>'''
  return html


@bp.route('/strategy', methods=['POST'])
def query_strategy():
  data = request.get_json()
  if data['strategy'] == 'null':
    return jsonify({'result': False})
  initial_t = (datetime.now() - relativedelta(months=1)).timestamp()
  strategy_name = data['strategy']
  strategies = text(
      """
      SELECT p.id, a.name, p.name, s.trading_type,
          (SELECT COUNT(*) FROM trade t WHERE t.close_timestamp >= :initial_t AND t.product_id = s.id AND t.percentage >= 0) AS count1,
          (SELECT COUNT(*) FROM trade t WHERE t.close_timestamp >= :initial_t AND t.product_id = s.id) AS count2,
          (SELECT SUM(t.percentage) FROM trade t WHERE t.close_timestamp >= :initial_t AND t.product_id = s.id) AS sum_percentage,
      p.price
      FROM (SELECT * FROM topstrategies ORDER BY CASE 
              WHEN percentage IS NULL THEN 1
              WHEN percentage < 0 THEN 2
              ELSE 0                   
          END, percentage DESC) ts
      JOIN product p ON ts.id = p.id
      JOIN strategy s ON s.id = p.id
      JOIN strategyasset sa ON sa.strategy_id = s.id
      JOIN asset a ON a.id = sa.asset_id
      WHERE p.name LIKE :strategy
      GROUP BY p.id, a.name
      ORDER BY CASE 
          WHEN sum_percentage IS NULL THEN 1
          WHEN sum_percentage < 0 THEN 2
          ELSE 0                   
      END, sum_percentage DESC;
      """
  )
  strategies = strategies.bindparams(initial_t=initial_t, strategy=f"%{strategy_name}%")
  strategies = [r for r in db.engine.execute(strategies)]
  unique_ids = list(set([s[0] for s in strategies]))
  html = ''
  for s in strategies:
    if s[2] in data['found']: continue
    if s[0] in unique_ids:
      asset = ''
      assets = [st[1] for st in strategies if st[0] == s[0]]
      unique_ids.remove(s[0])
      for a in assets:
        asset += f'''<div>
                        <img src="/static/img/assets_icons/{a}.png" class="multi icon" alt="{a} coin icon">
                     </div>'''
      html += f'''<tr class="{s[3]} query show">
            <td>
              <div class="hlist">
                {asset}
              </div>
            </td>
            <td>
              <a href="/strategy/{s[2]}">{s[2]}</a>
            </td>
            <td>
              {s[3]}
            </td>
            <td class="{"positive" if s[4] / s[5] >= 50 else "negative"}">
              {round(s[4] / s[5], 2)}%
            </td>
            <td class="{"positive" if s[6] >= 0 else "negative"}">
              {round(s[6], 2)}%
            </td>
            <td>
              {f'${s[7]}' if s[7] > 0 else 'Free'}
            </td>
            <td>
              <img src="/static/img/general_performance/{s[0]}.svg" class="chart-icon" alt="{s[2]} strategy icon">
            </td>'''
  return html




@bp.route('/strategy/candlestick', methods=['POST'])
def get_strategy():
  data = request.get_json()
  if data['strategy'] == 'null':
    return jsonify({'result': False})
  try:
    strategy = Strategy.query.filter(Strategy.id==data['strategy']).first()
  except: 
    return jsonify({'result': False})
  firstday = datetime.now().replace(minute=0, second=0, microsecond=0).timestamp() - FIRSTDAY_TIMESTAMP
  asset = StrategyAsset.query.filter(StrategyAsset.strategy_id==strategy.id).order_by(StrategyAsset.asset_id)[:]
  trades = [t.__json__() for t in Trade.query.filter((Trade.product_id==strategy.id)&(Trade.close_timestamp>=firstday))]
  trades_result = [t for t, in db.session.query(Trade.percentage).filter((Trade.product_id==strategy.id)&(Trade.close_candlestick_id!=None))]
  color = current_user.get_strategy_color(strategy=strategy.name) if not isinstance(current_user, AnonymousUserMixin) else '#' + secrets.token_hex(3)
  if len(asset) == 1:
    asset = asset[0]
    timestamp = [t for t, in db.session.query(Candlestick.timestamp).filter((Candlestick.timestamp>=firstday)&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])&\
                                                                          (Candlestick.asset_id==asset.asset_id))]
    open = [o for o, in db.session.query(Candlestick.open).filter((Candlestick.timestamp>=firstday)&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])&\
                                                                  (Candlestick.asset_id==asset.asset_id))]
    high = [h for h, in db.session.query(Candlestick.high).filter((Candlestick.timestamp>=firstday)&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])&\
                                                                  (Candlestick.asset_id==asset.asset_id))]
    low = [l for l, in db.session.query(Candlestick.low).filter((Candlestick.timestamp>=firstday)&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])&\
                                                                (Candlestick.asset_id==asset.asset_id))]
    close = [c for c, in db.session.query(Candlestick.close).filter((Candlestick.timestamp>=firstday)&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])&\
                                                                    (Candlestick.asset_id==asset.asset_id))]
    volume = [v for v, in db.session.query(Candlestick.volume).filter((Candlestick.timestamp>=firstday)&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])&\
                                                                      (Candlestick.asset_id==asset.asset_id))]
    indicators = [i.__json__() for i in StrategyIndicator.query.filter(StrategyIndicator.strategy_id==strategy.id)]
    for indicator in indicators:
      indicator['color'] = (current_user.get_indicator_color(indicator=indicator['indicator']) if not isinstance(current_user, AnonymousUserMixin)\
                                                                                               else '#' + secrets.token_hex(3))
    result = {'symbol': Asset.query.filter(Asset.id==asset.asset_id).first().name.lower(),
              'timeframe': TIMEFRAME[strategy.trading_type],
              'date': timestamp,
              'open': open,
              'high': high,
              'low': low,
              'close': close,
              'volume': volume,
              'trades': trades,
              'trades_result': trades_result,
              'indicators': indicators,
              'color': color,}
  else:
    timestamp = [t for t, in db.session.query(Candlestick.timestamp).filter((Candlestick.timestamp>=firstday)&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])&\
                                                                            (Candlestick.timestamp%SECOND_IN_A_DAY==0)&(Candlestick.asset_id==asset[0].asset_id))]
    tad = text(f"""SELECT a.name, COUNT(tc.asset_id), a.color, a.symbol, a.id
                  FROM asset a LEFT JOIN strategyasset sa ON a.id = sa.asset_id
                  LEFT JOIN (SELECT c.asset_id 
                              FROM candlestick c JOIN trade t ON c.id = t.open_candlestick_id
                              WHERE t.product_id = {strategy.id}) tc ON a.id = tc.asset_id
                  WHERE sa.strategy_id = {strategy.id}
                  GROUP BY a.name, a.color, a.symbol, a.id""").compile()
    close = {a[0]: [c for c, in db.session.query(Candlestick.close).filter((Candlestick.timestamp>=firstday)&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])&\
                                                                           (Candlestick.timestamp%SECOND_IN_A_DAY==0)&(Candlestick.asset_id==a[4]))]\
            for a in db.engine.execute(tad)}
    tad = {a[0]: {'value': a[1], 'color': a[2], 'symbol': a[3]} for a in db.engine.execute(tad)}
    result = {'timeframe': TIMEFRAME[strategy.trading_type],
              'date': timestamp,
              'close': close,
              'trades': trades,
              'trades_result': trades_result,
              'indicators': [],
              'trades_asset_dist': tad,
              'color': color,}
  return jsonify(result)




@bp.route('/strategy/historical-candlestick', methods=['POST'])
def get_candlestick():
  data = request.get_json()
  try:
    strategy = Strategy.query.filter(Strategy.id==data['strategy']).first()
  except:
    return jsonify({'result': False})
  data['end_period'] -= data['end_period'] % 300
  asset = StrategyAsset.query.filter(StrategyAsset.strategy_id==strategy.id).order_by(StrategyAsset.asset_id)[:]
  if len(asset) == 1:
    if FIRST_ABSOLUTE_DATE < data['end_period'] < datetime.now().timestamp():
      asset = asset[0]
      timestamp = [t for t, in db.session.query(Candlestick.timestamp).filter((Candlestick.timestamp<int(data['end_period']))&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])\
                                                                    &(Candlestick.timestamp>=int(data['end_period']-ADD_HISTORICAL_CANDLESTICK_TIMESTAMP))\
                                                                    &(Candlestick.asset_id==asset.asset_id))]
      open = [o for o, in db.session.query(Candlestick.open).filter((Candlestick.timestamp<int(data['end_period']))&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])\
                                                                    &(Candlestick.timestamp>=int(data['end_period']-ADD_HISTORICAL_CANDLESTICK_TIMESTAMP))\
                                                                    &(Candlestick.asset_id==asset.asset_id))]
      high = [h for h, in db.session.query(Candlestick.high).filter((Candlestick.timestamp<int(data['end_period']))&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])\
                                                                    &(Candlestick.timestamp>=int(data['end_period']-ADD_HISTORICAL_CANDLESTICK_TIMESTAMP))\
                                                                    &(Candlestick.asset_id==asset.asset_id))]
      low = [l for l, in db.session.query(Candlestick.low).filter((Candlestick.timestamp<int(data['end_period']))&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])\
                                                                    &(Candlestick.timestamp>=int(data['end_period']-ADD_HISTORICAL_CANDLESTICK_TIMESTAMP))\
                                                                    &(Candlestick.asset_id==asset.asset_id))]
      close = [c for c, in db.session.query(Candlestick.close).filter((Candlestick.timestamp<int(data['end_period']))&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])\
                                                                    &(Candlestick.timestamp>=int(data['end_period']-ADD_HISTORICAL_CANDLESTICK_TIMESTAMP))\
                                                                    &(Candlestick.asset_id==asset.asset_id))]
      volume = [v for v, in db.session.query(Candlestick.volume).filter((Candlestick.timestamp<int(data['end_period']))&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])\
                                                                    &(Candlestick.timestamp>=int(data['end_period']-ADD_HISTORICAL_CANDLESTICK_TIMESTAMP))\
                                                                    &(Candlestick.asset_id==asset.asset_id))]
      trades = [t.__json__() for t in Trade.query.filter((Trade.product_id==strategy.id)&(Trade.open_timestamp>=data['end_period']-ADD_HISTORICAL_CANDLESTICK_TIMESTAMP)\
                                                          &(Trade.open_timestamp<data['end_period']))]
      return jsonify({'date': timestamp,
                      'open': open,
                      'high': high,
                      'low': low,
                      'close': close,
                      'volume': volume,
                      'trades': trades,})
  else:
    timestamp = [t for t, in db.session.query(Candlestick.timestamp).filter((Candlestick.timestamp<int(data['end_period']))&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])\
                                                                    &(Candlestick.timestamp>=int(data['end_period']-ADD_HISTORICAL_CANDLESTICK_TIMESTAMP))\
                                                                    &(Candlestick.timestamp%SECOND_IN_A_DAY==0)&(Candlestick.asset_id==asset[0].asset_id))]
    close = {db.session.query(Asset.name).filter(Asset.id==a.asset_id).first()[0]: [c for c,\
             in db.session.query(Candlestick.close).filter((Candlestick.timestamp<int(data['end_period']))&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])\
                                                          &(Candlestick.timestamp>=int(data['end_period']-ADD_HISTORICAL_CANDLESTICK_TIMESTAMP))\
                                                          &(Candlestick.timestamp%SECOND_IN_A_DAY==0)&(Candlestick.asset_id==a.asset_id))]\
            for a in asset}
    trades = [t.__json__() for t in Trade.query.filter((Trade.product_id==strategy.id)&(Trade.open_timestamp>=data['end_period']-ADD_HISTORICAL_CANDLESTICK_TIMESTAMP)\
                                                          &(Trade.open_timestamp<data['end_period']))]
    return jsonify({'date': timestamp,
                    'close': close,
                    'trades': trades,})
  return jsonify({'result': False})




@bp.route('/strategy/param_filter', methods=['POST'])
def param_filter():
  data = request.get_json()
  try:
    strategy = Strategy.query.filter(Strategy.id==data['strategy']).first()
    fee = Exchange.query.filter((Exchange.id==1))[0].spot_taker if strategy.leverage==1 else Exchange.query.filter((Exchange.id==1))[0].future_taker
    print(fee)
  except:
    return jsonify({'result': False})
  if not data['start_period'] and not data['end_period']:
    return jsonify({'result': False})
  data['start_period'] += ' 00:00:00'
  data['end_period'] += ' 00:00:00'
  try:
    data['start_period'] = parser.parse(data['start_period']).timestamp()
    data['end_period'] = parser.parse(data['end_period']).timestamp()
  except:
    return jsonify({'result': False})
  open_candlestick_id = db.session.query(Candlestick.id).filter((Candlestick.timestamp==data['start_period'])&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])\
                                                                &(Candlestick.crypto_id==strategy.crypto_id)).first()
  if not open_candlestick_id: 
    open_candlestick_id = db.session.query(Candlestick.id).filter((Candlestick.timestamp>=data['start_period'])&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])\
                                                                &(Candlestick.crypto_id==strategy.crypto_id)).limit(1).first()
  open_candlestick_id = open_candlestick_id[0]
  close_candlestick_id = db.session.query(Candlestick.id).filter((Candlestick.timestamp==data['end_period'])&(Candlestick.timeframe==TIMEFRAME[strategy.trading_type])\
                                                                &(Candlestick.crypto_id==strategy.crypto_id)).first()
  if not close_candlestick_id: close_candlestick_id = db.session.query(Candlestick.id).filter((Candlestick.timeframe==TIMEFRAME[strategy.trading_type])\
                                                                                              &(Candlestick.crypto_id==strategy.crypto_id)).order_by(Candlestick.id.desc()).limit(1).first()
  close_candlestick_id = close_candlestick_id[0]
  trades = [t.__json__() for t in Trade.query.filter((Trade.strategy_id==strategy.id)&(Trade.open_candlestick_id>=open_candlestick_id)\
                                                        &(Trade.open_candlestick_id<=close_candlestick_id))]
  winning_trades = db.session.query(sa.func.count(Trade.id)).filter((Trade.strategy_id==strategy.id)&(Trade.open_candlestick_id>=open_candlestick_id)\
                                                        &(Trade.open_candlestick_id<=close_candlestick_id)&(Trade.percentage>=0)).first()[0]
  winning_earnings = [t for t, in db.session.query(Trade.percentage).filter((Trade.strategy_id==strategy.id)&(Trade.open_candlestick_id>=open_candlestick_id)\
                                                        &(Trade.open_candlestick_id<=close_candlestick_id)&(Trade.percentage>=0))[:]]
  losing_earnings = [t for t, in db.session.query(Trade.percentage).filter((Trade.strategy_id==strategy.id)&(Trade.open_candlestick_id>=open_candlestick_id)\
                                                        &(Trade.open_candlestick_id<=close_candlestick_id)&(Trade.percentage<0))[:]]
  return jsonify({
    'total_trades': len(trades),
    'winning_trades': winning_trades,
    'winning_earnings': round(reduce(lambda x, y: x*y, [1 + e / 100 for e in winning_earnings]) - 1, 4) * 100 if winning_trades else 100,
    'losing_earnings': round(reduce(lambda x, y: x*y, [1 + e / 100 for e in losing_earnings]) - 1, 4) * 100 if len(trades) - winning_trades > 0 else 100,
    'winrate': round(100 * sum([t['result'] >= 0 for t in trades if t['result']]) / len(trades), 2) if len(trades) else 0,
    'trades_duration': round(sum([t['endDate'] - t['startDate'] for t in trades if t['endDate']]), 2) if len(trades) else 0,
    'maximum_drawdown': round(100 * max_drawdown(numpy.array([t['result'] / 100 for t in trades if t['result']])), 2) if len(trades) else 0,
    'rate_of_return': round(reduce(lambda x, y: x*y, [1 - (fee / 100) + t['result'] / 100 for t in trades if t['result']]) - 1, 2) * 100 if len(trades) else 100,
    'gross_profit': round(reduce(lambda x, y: x*y, [1 + t['result'] / 100 for t in trades if t['result']]) - 1, 2) * 100 if len(trades) else 100,
    'sharpe_ratio': round(numpy.std([t['result'] for t in trades if t['result']]), 2) if len(trades) else 0,
    'period': data['end_period'] - data['start_period']
  })