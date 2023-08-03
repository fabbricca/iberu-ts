from app import db
from app.main import bp
from app.main.forms import EditProfileForm
from app.models import Asset, Backtest, Candlestick, Country, Creator, Crypto, Exchange, Indicator, Strategy, StrategyAsset, StrategyIndicator, Trade, User

from .classes import MonthStrategyEarning

from dateutil.relativedelta import relativedelta

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.sql import text

from flask import current_app, render_template, redirect, url_for, request, send_from_directory, jsonify
from flask_login import current_user, login_required

from werkzeug.utils import secure_filename

from PIL import Image

import csv

import os

import imghdr

FOLDER = os.path.dirname(os.path.realpath(__file__))

CHART_TIME_SPAN = 120
LOOKBACK_PERIOD = 7
SECOND_IN_A_DAY = 86400
DAYS_IN_A_YEAR = 365
TIMEFRAME = {
  'scalping': 5,
  'intraday': 60,
  'swing': 1440,
}
TRADING_TYPE = ['scalping', 'intraday', 'swing']

ABBR_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
MONTH = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']


def validate_image(stream):
    header = stream.read(512)
    stream.seek(0)
    format = imghdr.what(None, header)
    if not format:
        return None
    return '.' + (format if format != 'jpeg' else 'jpg')


@bp.app_template_filter()
def abbr_month_name(month):
    return ABBR_MONTH[int(month) - 1]

@bp.app_template_filter()
def month_name(month):
    return MONTH[int(month) - 1]




@bp.route('/', methods=['GET'])
def index():
  data = []
  initial_t = (datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - relativedelta(months=1)).timestamp()
  strategies = text(f"""SELECT p.id, a.name, p.name, s.trading_type,
                               (SELECT COUNT(*) FROM trade t WHERE t.close_timestamp >= {initial_t} AND t.product_id = s.id AND t.percentage >= 0) AS count1,
                               (SELECT COUNT(*) FROM trade t WHERE t.close_timestamp >= {initial_t} AND t.product_id = s.id) AS count2,
                               (SELECT SUM(t.percentage) FROM trade t WHERE t.close_timestamp >= {initial_t} AND t.product_id = s.id) AS sum_percentage,
                               p.price
                        FROM (SELECT * FROM topstrategies ORDER BY CASE 
                                                                      WHEN percentage IS NULL THEN 1
                                                                      WHEN percentage < 0 THEN 2
                                                                      ELSE 0                   
                                                                   END, percentage DESC LIMIT 10) ts
                        JOIN product p ON ts.id = p.id
                        JOIN strategy s ON s.id = p.id
                        JOIN strategyasset sa ON sa.strategy_id = s.id
                        JOIN asset a ON a.id = sa.asset_id
                        GROUP BY p.id, a.name
                        ORDER BY CASE 
                                  WHEN sum_percentage IS NULL THEN 1
                                  WHEN sum_percentage < 0 THEN 2
                                  ELSE 0                   
                                 END, sum_percentage DESC;""").compile()
  strategies = [r for r in db.engine.execute(strategies)]
  unique_ids = list(set([s[0] for s in strategies]))
  for strategy in strategies:
    if strategy[0] in unique_ids:
      assets = [s[1] for s in strategies if s[0] == strategy[0]]
      unique_ids.remove(strategy[0])
      data.append(dict(zip(['id', 'asset', 'name', 'trading_type', 'win', 'total', 'performance', 'price'], strategy)))
      data[-1]['asset'] = ['/static/img/assets_icons/' + i.lower() + '.png' for i in assets]
      data[-1]['trading_type'] = TRADING_TYPE[data[-1]['trading_type']]
      if data[-1]['total'] == 0: data[-1]['total'] = 1
      if not data[-1]['performance']: data[-1]['performance'] = 0
  context = {
      'strategies_earning': data,
      'current': 0,
  }
  return render_template('index.html', context=context)




@bp.route('/user', methods=['GET'])
@login_required
def user():
    referral_code = current_user.name + '#' + str(ord(current_user.surname[0])) + str(ord(current_user.name[-1]))
    invites = db.session.query(sa.func.count(User.invite)).filter(User.invite==current_user.id).first()[0]
    current_timestamp = datetime.now().timestamp()
    discount = invites if invites < 5 else 5 + 0.25 * (invites - 5)
    active_subscriptions = text(f"""SELECT t.id, p.name as strategy, a1.name, s.subscription_timestamp as start, s.unsubscription_timestamp as end, 
                                    s.preferred_leverage as leverage, a2.name as quote
                                    FROM transaction t
                                    JOIN subscription s ON s.transaction_id = t.id
                                    JOIN product p ON t.product_id = p.id
                                    JOIN strategyasset sa ON sa.strategy_id = p.id
                                    JOIN asset a1 ON a1.id = sa.asset_id
                                    JOIN asset a2 ON a2.id = s.quote_id
                                    WHERE t.user_id = {current_user.id} AND s.unsubscription_timestamp > {current_timestamp} 
                                    GROUP BY t.id, p.name, a1.name, s.subscription_timestamp, s.unsubscription_timestamp, s.preferred_leverage, a2.name;""").compile()
    data = [r for r in db.engine.execute(active_subscriptions)]
    active_subscriptions = []
    unique_ids = list(set([s[0] for s in data]))
    for subscription in data:
      if subscription[0] in unique_ids:
        assets = [s[2] for s in data if s[0] == subscription[0]]
        unique_ids.remove(subscription[0])
        active_subscriptions.append(dict(zip(['transaction', 'strategy', 'asset', 'start', 'end', 'leverage', 'quote'], subscription)))
        active_subscriptions[-1]['asset'] = ['/static/img/assets_icons/' + i.lower() + '.png' for i in assets]
        active_subscriptions[-1]['start'] = datetime.fromtimestamp(active_subscriptions[-1]['start']).strftime('%Y-%m-%d %H:%M:%S')
        active_subscriptions[-1]['end'] = datetime.fromtimestamp(active_subscriptions[-1]['end']).strftime('%Y-%m-%d %H:%M:%S')
        active_subscriptions[-1]['quote'] = '/static/img/assets_icons/' + active_subscriptions[-1]['quote'].lower() + '.png'
    ended_subscriptions = text(f"""SELECT t.id, p.name as strategy, a1.name, s.subscription_timestamp as start, s.unsubscription_timestamp as end, 
                                    s.preferred_leverage as leverage, a2.name as quote
                                    FROM transaction t
                                    JOIN subscription s ON s.transaction_id = t.id
                                    JOIN product p ON t.product_id = p.id
                                    JOIN strategyasset sa ON sa.strategy_id = p.id
                                    JOIN asset a1 ON a1.id = sa.asset_id
                                    JOIN asset a2 ON a2.id = s.quote_id
                                    WHERE t.user_id = {current_user.id} AND s.unsubscription_timestamp <= {current_timestamp} 
                                    GROUP BY t.id, p.name, a1.name, s.subscription_timestamp, s.unsubscription_timestamp, s.preferred_leverage, a2.name;""").compile()
    data = [r for r in db.engine.execute(ended_subscriptions)]
    ended_subscriptions = []
    unique_ids = list(set([s[0] for s in data]))
    for subscription in data:
      if subscription[0] in unique_ids:
        assets = [s[2] for s in data if s[0] == subscription[0]]
        unique_ids.remove(subscription[0])
        ended_subscriptions.append(dict(zip(['transaction', 'strategy', 'asset', 'start', 'end', 'leverage', 'quote'], subscription)))
        ended_subscriptions[-1]['asset'] = ['/static/img/assets_icons/' + i.lower() + '.png' for i in assets]
        ended_subscriptions[-1]['start'] = datetime.fromtimestamp(ended_subscriptions[-1]['start']).strftime('%Y-%m-%d %H:%M:%S')
        ended_subscriptions[-1]['end'] = datetime.fromtimestamp(ended_subscriptions[-1]['end']).strftime('%Y-%m-%d %H:%M:%S')
        ended_subscriptions[-1]['quote'] = '/static/img/assets_icons/' + ended_subscriptions[-1]['quote'].lower() + '.png'
    initial_t = (datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - relativedelta(months=1)).timestamp()
    strategies = text(f"""SELECT p.id, a.name, p.name, s.trading_type,
                          (SELECT COUNT(*) FROM trade t
                                           JOIN transaction tr ON tr.product_id = t.product_id
                                           JOIN subscription su ON su.transaction_id = tr.id
                                           WHERE su.subscription_timestamp >= {initial_t} AND t.open_timestamp >= su.subscription_timestamp
                                           AND t.product_id = s.id AND t.percentage >= 0 AND u.id = tr.user_id) AS count1,
                          (SELECT COUNT(*) FROM trade t
                                           JOIN transaction tr ON tr.product_id = t.product_id
                                           JOIN subscription su ON su.transaction_id = tr.id
                                           WHERE su.subscription_timestamp >= {initial_t} AND t.open_timestamp >= su.subscription_timestamp
                                           AND t.product_id = s.id AND u.id = tr.user_id) AS count2,
                          (SELECT SUM(t.percentage) FROM trade t
                                           JOIN transaction tr ON tr.product_id = t.product_id
                                           JOIN subscription su ON su.transaction_id = tr.id
                                           WHERE su.subscription_timestamp >= {initial_t} AND t.product_id = s.id AND t.open_timestamp >= su.subscription_timestamp
                                           AND u.id = tr.user_id) AS sum_percentage,
                          p.price
                          FROM (SELECT * FROM topstrategies ORDER BY CASE 
                                                                      WHEN percentage IS NULL THEN 1
                                                                      WHEN percentage < 0 THEN 2
                                                                      ELSE 0                   
                                                                   END, percentage DESC LIMIT 10) ts
                          JOIN product p ON ts.id = p.id
                          JOIN transaction tr ON tr.product_id = p.id
                          JOIN user u ON u.id = tr.user_id
                          JOIN strategy s ON s.id = p.id
                          JOIN strategyasset sa ON sa.strategy_id = s.id
                          JOIN asset a ON a.id = sa.asset_id
                          GROUP BY p.id, a.name, u.id
                          ORDER BY CASE 
                                  WHEN sum_percentage IS NULL THEN 1
                                  WHEN sum_percentage < 0 THEN 2
                                  ELSE 0                   
                                 END, sum_percentage DESC""").compile()
    strategies = [r for r in db.engine.execute(strategies)]
    unique_ids = list(set([s[0] for s in strategies]))
    for strategy in strategies:
      if strategy[0] in unique_ids:
        assets = [s[1] for s in strategies if s[0] == strategy[0]]
        unique_ids.remove(strategy[0])
        data.append(dict(zip(['id', 'asset', 'name', 'trading_type', 'win', 'total', 'performance', 'price'], strategy)))
        data[-1]['asset'] = ['/static/img/assets_icons/' + i.lower() + '.png' for i in assets]
        data[-1]['trading_type'] = TRADING_TYPE[data[-1]['trading_type']]
        if data[-1]['total'] == 0: data[-1]['total'] = 1
        if not data[-1]['performance']: data[-1]['performance'] = 0
    form = EditProfileForm()
    context = {
        'current': 0,
        'referral_code': referral_code,
        'invites': invites,
        'discount': discount if discount < 10 else 10,
        'active_subscriptions': active_subscriptions,
        'ended_subscriptions': ended_subscriptions,
        'strategies_earning': data,
    }
    return render_template('user.html', context=context, form=form)




@bp.route('/user/edit', methods=['POST'])
@login_required
def user_edit():
  form = EditProfileForm()
  if form.validate_on_submit():
    if form.name.data:
      current_user.name = form.name.data
    if form.surname.data:
      current_user.surname = form.surname.data
    if form.phone.data:
      current_user.phone = form.phone.data
    if form.discord.data:
      current_user.discord = form.discord.data
    db.session.commit()
  return redirect(url_for('main.user'))




@bp.route('/strategy')
def ssearch():
  data = []
  initial_t = (datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - relativedelta(months=1)).timestamp()
  strategies = text(f"""SELECT p.id, a.name, p.name, s.trading_type,
                               (SELECT COUNT(*) FROM trade t WHERE t.close_timestamp >= {initial_t} AND t.product_id = s.id AND t.percentage >= 0) AS count1,
                               (SELECT COUNT(*) FROM trade t WHERE t.close_timestamp >= {initial_t} AND t.product_id = s.id) AS count2,
                               (SELECT SUM(t.percentage) FROM trade t WHERE t.close_timestamp >= {initial_t} AND t.product_id = s.id) AS sum_percentage,
                               p.price
                        FROM (SELECT * FROM topstrategies ORDER BY CASE 
                                                                      WHEN percentage IS NULL THEN 1
                                                                      WHEN percentage < 0 THEN 2
                                                                      ELSE 0                   
                                                                   END, percentage DESC LIMIT 5) ts
                        JOIN product p ON ts.id = p.id
                        JOIN strategy s ON s.id = p.id
                        JOIN strategyasset sa ON sa.strategy_id = s.id
                        JOIN asset a ON a.id = sa.asset_id
                        GROUP BY p.id, a.name
                        ORDER BY CASE 
                                  WHEN sum_percentage IS NULL THEN 1
                                  WHEN sum_percentage < 0 THEN 2
                                  ELSE 0                   
                                 END, sum_percentage DESC;""").compile()
  strategies = [r for r in db.engine.execute(strategies)]
  unique_ids = list(set([s[0] for s in strategies]))
  for strategy in strategies:
    if strategy[0] in unique_ids:
      assets = [s[1] for s in strategies if s[0] == strategy[0]]
      unique_ids.remove(strategy[0])
      data.append(dict(zip(['id', 'asset', 'name', 'trading_type', 'win', 'total', 'performance', 'price'], strategy)))
      data[-1]['asset'] = ['/static/img/assets_icons/' + i.lower() + '.png' for i in assets]
      data[-1]['trading_type'] = TRADING_TYPE[data[-1]['trading_type']]
      if data[-1]['total'] == 0: data[-1]['total'] = 1
      if not data[-1]['performance']: data[-1]['performance'] = 0
  strategies_e = [s.__json__(assets = True) for s in Strategy.query.filter().order_by(Strategy.rate_of_return.desc()).limit(25)]
  for s in strategies_e:
      s['trading_type'] = TRADING_TYPE[s['trading_type']]
  context = {
      'top_performer': data,
      'strategies_earning': strategies_e,
      'current': 0,
  }
  return render_template('ssearch.html', context=context)




@bp.route('/strategy/<string:name>')
def strategy(name):
    strategy = Strategy.query.filter(Strategy.name==name).first_or_404()
    creator = Creator.query.filter(Creator.id==Strategy.creator_id).first()
    backtest = Backtest.query.filter(Backtest.id==strategy.backtest_id).first()
    assets = [a.__json__() for a in strategy.assets]
    external_indicators = sum([ei.indicator.external_chart for ei in strategy.indicators])
    earning_m = []
    pie_chart = []
    subscription_required = strategy.price > 0
    if subscription_required:
        try:
            subscription_required *= current_user.is_using(strategy.id)
        except:
            subscription_required = False
    else:
        subscription_required = True
    for i in range(0, LOOKBACK_PERIOD - 1):
        starting_t = (datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=1) - relativedelta(month = LOOKBACK_PERIOD - i)).timestamp()
        ending_t = (datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - relativedelta(month = LOOKBACK_PERIOD - i + 1)).timestamp()
        trades = [t.__json__(timestamp=False, asset=True) for t in Trade.query.filter((Trade.product_id==strategy.id)&(Trade.close_timestamp>=starting_t)&(Trade.close_timestamp<ending_t))]
        winrate = Trade.query.filter((Trade.product_id==strategy.id)&(Trade.close_timestamp>=starting_t)&(Trade.close_timestamp<ending_t)&(Trade.percentage>=0)).count()
        winrate = winrate * 100 / len(trades) if len(trades) else 1
        long = db.session.query(sa.func.count(Trade.percentage)).filter((Trade.product_id==strategy.id)&(Trade.close_timestamp>=starting_t)\
                                &(Trade.close_timestamp<ending_t)&(Trade.position==True)).first()[0]
        earning = db.session.query(sa.func.sum(Trade.percentage)).filter((Trade.product_id==strategy.id)&(Trade.close_timestamp>=starting_t)\
                                   &(Trade.close_timestamp<ending_t)).first()[0]
        earning_m.append(MonthStrategyEarning(len(earning_m), datetime.fromtimestamp(starting_t), earning if earning else 0, round(winrate, 2), long, trades).__json__())
    long_win = [t.__json__() for t in Trade.query.filter((Trade.product_id==strategy.id)&(Trade.position==True)&(Trade.percentage>=0))]
    long_loss = [t.__json__() for t in Trade.query.filter((Trade.product_id==strategy.id)&(Trade.position==True)&(Trade.percentage<0))]
    short_win = [t.__json__() for t in Trade.query.filter((Trade.product_id==strategy.id)&(Trade.position==False)&(Trade.percentage>=0))]
    short_loss = [t.__json__() for t in Trade.query.filter((Trade.product_id==strategy.id)&(Trade.position==False)&(Trade.percentage<0))]
    strategy_trades = len(long_win) + len(long_loss) + len(short_win) + len(short_loss)
    win_net = round(sum([l['result'] for l in long_win]) + sum([s['result'] for s in short_win]), 3)
    loss_net = round(sum([l['result'] for l in long_loss]) + sum([s['result'] for s in short_loss]), 3)    
    backtest_net = round(backtest.rate_of_return * (backtest.time_range / SECOND_IN_A_DAY) / DAYS_IN_A_YEAR)
    months = relativedelta(datetime.now(), datetime.fromtimestamp(strategy.created_timestamp)).months
    profit_factor = round((win_net) / abs(loss_net), 2) if loss_net else 1
    pie_chart.append(int( 100 * strategy.sharpe_ratio / (backtest.sharpe_ratio if backtest.sharpe_ratio != 0 else 1)))
    pie_chart.append(int( 100 * ((win_net + loss_net) / (strategy_trades if strategy_trades else 1)) / (backtest.frequency * (backtest.time_range / SECOND_IN_A_DAY))))
    pie_chart.append(int( 100 * abs(strategy.rate_of_return / (backtest.rate_of_return if backtest.rate_of_return != 0 else 1))))
    pie_chart.append(int( 100 * strategy.winrate / (strategy.winrate if strategy.winrate != 0 else 1)))
    context = {
        'earnings': earning_m,
        'asset': assets,
        'indicators': external_indicators,
        'creator': creator.username,
        'strategy': strategy.name,
        'price': strategy.price,
        'type': strategy.trading_type,
        'description': strategy.description,
        'performance': vars(strategy.performance),
        'backtest': vars(backtest.performance),
        'created': datetime.fromtimestamp(strategy.created_timestamp).strftime('%Y-%m-%d %H:%M:%S'),
        'updated': datetime.fromtimestamp(strategy.updated).strftime('%Y-%m-%d %H:%M:%S') if strategy.updated else None,
        'profit_factor': profit_factor,
        'percentage': pie_chart,
        'total_long': len(long_win) + len(long_loss),
        'long_net': round(sum([l['result'] for l in long_win]) + sum([l['result'] for l in long_loss]), 2),
        'long_win': round(sum([l['result'] for l in long_win]), 2) / len(long_win) if len(long_win) else 0,
        'long_loss': round(sum([l['result'] for l in long_loss]), 2) * 100 / len(long_loss) if len(long_loss) else 0,
        'long_ratio': len(long_win) / len(long_loss) if len(long_loss) != 0 else 0,
        'total_short': len(short_win) + len(short_loss),
        'short_net': round(sum([s['result'] for s in short_win]) + sum([s['result'] for s in short_loss]), 2),
        'short_win': round(sum([s['result'] for s in short_win]), 2) / len(short_win) if len(short_win) else 0,
        'short_loss': round(sum([s['result'] for s in short_loss]), 2) / len(short_loss) if len(short_loss) else 0,
        'short_ratio': len(short_win) / len(short_loss) if len(short_loss) != 0 else 0,
        'win_net': win_net,
        'loss_net': loss_net,
        'trades_net': win_net + loss_net,
        'backtest_net': backtest_net,
        'leverage': strategy.leverage,
        'duration_timestamp': datetime.now().timestamp() - strategy.created_timestamp,
        'minimum_budget_required': round(strategy.price * (months + 1) * 100 / strategy.rate_of_return, 2) if months and strategy.rate_of_return > 0 else 0
    }
    if len(assets) == 1:
      return render_template('strategy.html', strategy=strategy.id, context=context)
    tad = text("""SELECT a.asset_id, COUNT(*) FROM (SELECT c.asset_id FROM candlestick c JOIN trade t ON c.id = t.open_candlestick_id
            WHERE t.product_id = 1) a GROUP BY a.asset_id""").compile()
    tad = [{a[0]: a[1]} for a in db.engine.execute(tad)]
    context.update({"trades_asset_dist": tad})
    return render_template('mstrategy.html', strategy=strategy.id, context=context)




@bp.route('/retrieve_avatar')
@login_required
def retrieve_avatar():
    for ext in current_app.config['UPLOAD_EXTENSIONS']:
      avatar_filename = f"{current_user.id}{ext}"
      if os.path.exists(os.path.join(current_app.config['UPLOAD_PATH'], avatar_filename)):
        return send_from_directory(current_app.config['UPLOAD_PATH'], avatar_filename)
    return redirect(current_user.avatar(128))




@bp.route('/delete_avatar', methods=['POST'])
@login_required
def delete_avatar():
    for ext in current_app.config['UPLOAD_EXTENSIONS']:
      avatar_filename = f"{current_user.id}{ext}"
      if os.path.exists(os.path.join(current_app.config['UPLOAD_PATH'], avatar_filename)):
          os.remove(os.path.join(current_app.config['UPLOAD_PATH'], avatar_filename))
    return redirect(url_for('main.user'))




@bp.route('/upload_avatar', methods=['POST'])
@login_required
def upload_avatar():
  uploaded_file = request.files['file']
  filename = secure_filename(uploaded_file.filename)
  if filename != '':
      for ext in current_app.config['UPLOAD_EXTENSIONS']:
        avatar_filename = f"{current_user.id}{ext}"
        if os.path.exists(os.path.join(current_app.config['UPLOAD_PATH'], avatar_filename)):
           os.remove(os.path.join(current_app.config['UPLOAD_PATH'], avatar_filename))
      file_ext = os.path.splitext(filename)[1]
      if file_ext not in current_app.config['UPLOAD_EXTENSIONS'] or file_ext != validate_image(uploaded_file.stream):
          return "Invalid image", 400
      uploaded_file.save(os.path.join(current_app.config['UPLOAD_PATH'], str(current_user.id) + file_ext))
      image = Image.open(os.path.join(current_app.config['UPLOAD_PATH'], str(current_user.id) + file_ext))
      if image.width <= image.height:
        crop = (image.height - image.width) / 2
        crop_area = (0, crop, image.width, image.height - crop)
      else:
        crop = (image.width - image.height) / 2
        crop_area = (crop, 0, image.width - crop, image.height)
      cropped_image = image.crop(crop_area)
      cropped_image.save(os.path.join(current_app.config['UPLOAD_PATH'], str(current_user.id) + file_ext))  
  return redirect(url_for('main.user'))
    



@bp.route('/UchihaItachi')
def uchihaItachi():
    month_t = int((datetime.now().replace(day=1, hour=0, minute=0, second=0) - relativedelta(month=1)).timestamp())
    db.session.add(Country(name='Italy'))
    db.session.add(Country(name='United Kingdom'))
    db.session.commit()
    db.session.add(Creator(id=1, username='fabb', email='fabb.riccardo@gmail.com', name='Riccardo', surname='Fabbian', country_name='Italy'))
    db.session.add(Creator(id=2, username='Tommy', email='shelby.thomas@gmail.com', name='Thomas', surname='Shelby', country_name='United Kingdom'))
    db.session.commit()
    db.session.add(Crypto(id=1, name='Bitcoin', symbol='BTC', color='#F7931A'))
    db.session.add(Crypto(id=2, name='Ethereum', symbol='ETH', color='#3C3C3D'))
    db.session.add(Crypto(id=3, name='Solana', symbol='SOL', color='#00FFBD'))
    db.session.add(Crypto(id=4, name='TetherUSD', symbol='USDT', color='#26A17B'))
    db.session.commit()
    db.session.add(Exchange(id=1, name='Binance', margin_maker=0.07, future_maker=0.07))
    db.session.commit()
    db.session.add(Indicator(id=1, name='rsi', external_chart=1))
    db.session.add(Indicator(id=2, name='macd', external_chart=1))
    db.session.add(Indicator(id=3, name='sma', external_chart=0))
    db.session.commit()
    db.session.add(Strategy(id=1, name='Linear Regression', creator_id=1, price=7.99, trading_type=0))
    db.session.add(Strategy(id=2, name='Awesome Oscillator', creator_id=2, price=0.0, trading_type=0))
    db.session.add(Strategy(id=3, name='Random Forest', creator_id=1, price=6.99, trading_type=0))
    db.session.add(Strategy(id=4, name='Bollinger Bands', creator_id=2, price=0.0, trading_type=0))
    db.session.add(Strategy(id=5, name='Rsi & Macd', creator_id=1, price=5, trading_type=0)),
    db.session.add(Strategy(id=6, name='Rsi & Ema', creator_id=2, price=4.5, trading_type=0))
    db.session.add(Strategy(id=7, name='BLSH', creator_id=2, price=0.0, trading_type=0))
    db.session.add(Strategy(id=8, name='NoFOMC', creator_id=1, price=9.99, trading_type=0))
    db.session.commit()
    db.session.add(StrategyIndicator(id=1, strategy_id=1, indicator_id=1, parameter='{"close":"14"}'))
    db.session.add(StrategyIndicator(id=2, strategy_id=5, indicator_id=2, parameter='{"close":"14"}'))
    db.session.add(StrategyIndicator(id=3, strategy_id=2, indicator_id=3, parameter='{"close":"200"}'))
    db.session.commit()
    db.session.add(StrategyAsset(id=1, strategy_id=1, asset_id=2))
    db.session.add(StrategyAsset(id=2, strategy_id=2, asset_id=3))
    db.session.add(StrategyAsset(id=3, strategy_id=3, asset_id=1))
    db.session.commit()
    i = 0
    with open(FOLDER + '/bitcoin.csv') as file:
        reader = csv.reader(file)
        for r in reader:
            i += 1
            db.session.add(Candlestick(id=i, asset_id=1, symbol='BTCUSDT', timestamp=int(r[1])/1000, timeframe=5, open=r[2], high=r[3], low=r[4], close=r[5], volume=r[6]))
    with open(FOLDER + '/ethereum.csv') as file:
        reader = csv.reader(file)
        for r in reader:
            i += 1
            db.session.add(Candlestick(id=i, asset_id=2, symbol='ETHUSDT', timestamp=int(r[1])/1000, timeframe=5, open=r[2], high=r[3], low=r[4], close=r[5], volume=r[6]))
    with open(FOLDER + '/solana.csv') as file:
        reader = csv.reader(file)
        for r in reader:
            i += 1
            db.session.add(Candlestick(id=i, asset_id=3, symbol='SOLUSDT', timestamp=int(r[1])/1000, timeframe=5, open=r[2], high=r[3], low=r[4], close=r[5], volume=r[6]))
    db.session.commit()        
    db.session.add(Trade(id=1, product_id=3, open_timestamp=1689444650, open_candlestick_id=56363, position=0, open_value=30296, take_profit=30110.75, stop_loss=304337.25, close_timestamp=1689474637, close_candlestick_id=56462, percentage=0.61))
    db.session.add(Trade(id=2, product_id=3, open_timestamp=1689590709, open_candlestick_id=56850, position=1, open_value=30086.54, take_profit=30305.12, stop_loss=29943.27, close_timestamp=1689602436, close_candlestick_id=56889, percentage=0.73))
    db.session.commit()
    s = Strategy.query.all()
    for strategy in s:
        strategy.create_thumbnail(months=1)
        strategy.create_thumbnail(days=7)
    view = text(f"""CREATE OR REPLACE VIEW topstrategies AS SELECT s.id, SUM(percentage) AS percentage
                    FROM strategy s LEFT JOIN (SELECT t.product_id, t.percentage AS percentage 
                        FROM trade t 
                        WHERE t.close_timestamp>={str(month_t)}) t ON t.product_id = s.id
                    GROUP BY s.id ORDER BY percentage DESC;""").compile()
    db.engine.execute(view)
    #topstrategy view will be dropped and recreated whenever a new trade is closed
    return redirect(url_for('main.index'))