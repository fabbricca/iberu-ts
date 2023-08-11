from app import db
from app.api import bp
from app.models import Asset, StrategyIndicator, Strategy, Trade, Candlestick, Exchange, StrategyAsset

import sqlalchemy as sa
from sqlalchemy import text, bindparam, func

from flask import jsonify, request, current_app
from flask_login import current_user, AnonymousUserMixin

from datetime import datetime
from dateutil import parser
from dateutil.relativedelta import relativedelta

import secrets

from ..func import validate, bool_param

FIRST_ABSOLUTE_DATE = (datetime.now() - relativedelta(days=150)).timestamp()
ADD_HISTORICAL_CANDLESTICK_TIMESTAMP = 1296000
FIRSTDAY_TIMESTAMP = 2592000
SECOND_IN_A_MINUTE = 60
SECOND_IN_A_DAY = 86400
TIMEFRAME = [5, 60, 1440]


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




@bp.route('/strategies/<string:strategy>', methods=['GET'])
def strategies(strategy):
  if not validate(strategy) or not request.args.get('mstrategy'):
    return jsonify({'result': False,
                    'message': 'Invalid URI'})
  try:
    strategy = Strategy.query.filter(Strategy.id==strategy).first()
    mstrategy = bool_param(request.args.get('mstrategy'))
  except: 
    return jsonify({'result': False,
                    'message': 'Invalid strategy.'})
  if not request.args.get('timestamp'):
    ending_t = datetime.now().timestamp() - current_app.config['TIMESTAMP_DELAY']
    starting_t = ending_t - current_app.config['TIMESTAMP_DELAY']
    color = current_user.get_strategy_color(strategy=strategy.name) if not isinstance(current_user, AnonymousUserMixin) else '#' + secrets.token_hex(3)
    trades = [t.__json__() for t in Trade.query.filter((Trade.product_id==strategy.id)&(Trade.close_timestamp>=starting_t))]
    trades_result = [t for t, in db.session.query(Trade.percentage).filter((Trade.product_id==strategy.id)&(Trade.close_candlestick_id!=None))]
    if not mstrategy:
      uri = text("""SELECT c.symbol, s.trading_type FROM strategy s
                 JOIN trade t ON t.product_id = s.id
                 JOIN candlestick c ON t.open_candlestick_id = c.id
                 WHERE s.id = :strategy
                 LIMIT 1;""").bindparams(strategy=strategy.id) 
      uri = [f'{u0}_{TIMEFRAME[u1]}' for u0, u1 in db.engine.execute(uri)][0]
      indicators = [i.__json__() for i in StrategyIndicator.query.filter(StrategyIndicator.strategy_id==strategy.id)]
      for indicator in indicators:
        indicator['color'] = (current_user.get_indicator_color(indicator=indicator['indicator']) if not isinstance(current_user, AnonymousUserMixin)\
                                                                                               else '#' + secrets.token_hex(3))
      result = {'uri': uri,
                'trades': trades,
                'trades_result': trades_result,
                'indicators': indicators,
                'color': color,}
    else:
      tad = text(f"""SELECT a.name, COUNT(tc.asset_id), a.color, a.symbol, a.id, tc.symbol
                    FROM asset a LEFT JOIN strategyasset sa ON a.id = sa.asset_id
                    LEFT JOIN (SELECT c.asset_id, c.symbol
                                FROM candlestick c JOIN trade t ON c.id = t.open_candlestick_id
                                WHERE t.product_id = :strategy) tc ON a.id = tc.asset_id
                    WHERE sa.strategy_id = :strategy
                    GROUP BY a.name, a.color, a.symbol, a.id, tc.symbol""").bindparams(strategy=strategy.id)
      uris = [(a[5] if a[5] else a[3] + 'USDT') + '_' + str(TIMEFRAME[strategy.trading_type]) for a in db.engine.execute(tad)]
      tad = {a[0]: {'value': a[1], 'color': a[2], 'symbol': a[3]} for a in db.engine.execute(tad)}
      result = {'uri': uris,
                'trades': trades,
                'trades_result': trades_result,
                'trades_asset_dist': tad,
                'color': color,}
  else:
    ending_t = int(request.args.get('timestamp'))
    starting_t = ending_t - current_app.config['TIMESTAMP_DELAY']
    trades = [t.__json__() for t in Trade.query.filter((Trade.product_id==strategy.id)&(Trade.open_timestamp>=starting_t)&(Trade.open_timestamp<ending_t))]
    result = {'trades': trades,}
  return jsonify(result)