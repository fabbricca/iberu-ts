from app import db
from app import cache
from app.stream import bp
from app.models import Asset, Candlestick, Strategy

from config import Config

from flask import Response, redirect, url_for, jsonify

import time
from datetime import datetime

from sqlalchemy import func

import mysql.connector

from threading import Thread

SECONDS_IN_A_MINUTE = 60

BASIC_STREAM_DURATION = 7200
SLEEP = 3
TIMEFRAME = {
  'scalping': 5,
  'intraday': 60,
  'swing': 1440,
}

def _get_candlestick(asset_id, timeframe):
    db = mysql.connector.connect(host=Config.HOST, user=Config.USER, password=Config.PASSWORD, database=Config.DATABASE)
    cursor = db.cursor()
    while datetime.now().timestamp() <= (cache.get(f'{asset_id}@{timeframe}') if cache.get(f'{asset_id}@{timeframe}') != None else 0):
        candlestick_time = int(datetime.now().timestamp() - (datetime.now().timestamp() % (timeframe * SECONDS_IN_A_MINUTE)))
        get_latest_candlestick = """SELECT * FROM candlestick WHERE timestamp=%s AND asset_id=%s AND timeframe=%s;"""
        values = (candlestick_time, asset_id, timeframe)
        cursor.execute(get_latest_candlestick, values)
        candlestick = cursor.fetchall()
        db.commit()
        if len(candlestick) > 0 and len(candlestick[0]) > 0:
            candlestick = "{" + f'"result": "True", "timestamp": "{candlestick[0][3]}", "open": "{candlestick[0][5]}", "high": "{candlestick[0][6]}", "low": "{candlestick[0][7]}", "close": "{candlestick[0][8]}"' + "}"
            cache.set(f'{asset_id}@{timeframe}@candlestick', candlestick)
        else:
            result = '{"result": "False"}'
            cache.set(f'{asset_id}@{timeframe}@candlestick', result)
        time.sleep(SLEEP - (datetime.now().timestamp() % SLEEP))

def get_candlestick(asset_id, timeframe):
    print('no go boy')
    end_stream = cache.get(f'{asset_id}@{timeframe}')
    while datetime.now().timestamp() <= end_stream:
        try:
            yield f'''data: {cache.get(f'{asset_id}@{timeframe}@candlestick')}\n\n'''
        except GeneratorExit:
            return
        except:
            print('no data')
            pass
        time.sleep(SLEEP)


@bp.route('/<string:asset>/<int:timeframe>')
def asset(asset, timeframe):
    try:
        asset_id = db.session.query(Asset.id).filter(func.lower(Asset.name)==asset.lower()).first()[0]
    except:
        return '', 204
    loop_expiration = cache.get(f'{asset_id}@{timeframe}')
    if loop_expiration == None or loop_expiration <= datetime.now().timestamp():
        print('started a new ', asset, '/', timeframe , ', ends at', datetime.now().timestamp() + BASIC_STREAM_DURATION)
        cache.set(f'{asset_id}@{timeframe}', datetime.now().timestamp() + BASIC_STREAM_DURATION, timeout=0)
        Thread(target = _get_candlestick, args = (asset_id, timeframe)).start()
    else:
        print('sticked to the old one')
        cache.set(f'{asset_id}@{timeframe}', datetime.now().timestamp() + BASIC_STREAM_DURATION, timeout=0)
    return Response(get_candlestick(asset_id, timeframe), mimetype='text/event-stream')




def _get_trade(strategy_id):
    db = mysql.connector.connect(host=Config.HOST, user=Config.USER, password=Config.PASSWORD, database=Config.DATABASE)
    cursor = db.cursor()
    open_trade = False
    strategy_id = strategy_id
    while datetime.now().timestamp() <= (cache.get(f'{strategy_id}') if cache.get(f'{strategy_id}') != None else 0):
        get_latest_trade = f"""SELECT * FROM trade WHERE product_id={strategy_id} AND close_candlestick_id IS NULL;"""
        cursor.execute(get_latest_trade)
        trade = cursor.fetchall()
        db.commit()
        if len(trade) > 0 and len(trade[0]) > 0:
            get_latest_candlestick = f"""SELECT timestamp FROM candlestick WHERE id={trade[0][2]};"""
            cursor.execute(get_latest_candlestick)
            candlestick = cursor.fetchall()
            db.commit()
            open_trade = True
            trade = "{" + f'"result": "True", "open": "{candlestick[0][0]}", "position": "{trade[0][3]}", "price": "{trade[0][4]}", "tp": "{trade[0][5]}", "sl": "{trade[0][6]}"' + "}"
            cache.set(f'{strategy_id}@trade', trade)
        else:
            if open_trade == True:
                open_trade = False
                get_latest_trade = f"""SELECT percentage FROM trade WHERE product_id={strategy_id} ORDER BY id DESC LIMIT 1;"""
                cursor.execute(get_latest_trade)
                trade = cursor.fetchall()
                result = '{' + f'"result": "True", "close": "True", "percentage": "{trade[0][0]}"' + '}'
                cache.set(f'{strategy_id}@trade', result)
            else:
                result = '{"result": "False"}'
                cache.set(f'{strategy_id}@trade', result)
        time.sleep(SLEEP - (datetime.now().timestamp() % SLEEP))

def get_trade(strategy_id):
    print('no go boy')
    end_stream = cache.get(f'{strategy_id}')
    while datetime.now().timestamp() <= end_stream:
        try:
            yield f'''data: {cache.get(f'{strategy_id}@trade')}\n\n'''
        except GeneratorExit:
            return
        except:
            print('no data')
            pass
        time.sleep(SLEEP)


@bp.route('/<int:strategy_id>')
def trade(strategy_id):
    strategy = Strategy.query.filter(Strategy.id==strategy_id).first()
    if not strategy: return jsonify({'result': False})
    loop_expiration = cache.get(f'{strategy_id}')
    if loop_expiration == None or loop_expiration <= datetime.now().timestamp():
        cache.set(f'{strategy_id}', datetime.now().timestamp() + BASIC_STREAM_DURATION, timeout=0)
        Thread(target = _get_trade, args = ([strategy.id])).start()
    else:
        print('sticked to the old one')
        cache.set(f'{strategy_id}', datetime.now().timestamp() + BASIC_STREAM_DURATION, timeout=0)
    return Response(get_trade(strategy.id), mimetype='text/event-stream')


@bp.route('/clear')
def clear():
    cache.clear()
    return redirect(url_for('main.index'))