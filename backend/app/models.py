from app import db, login

from flask import current_app, url_for, redirect
from flask_login import UserMixin

from sqlalchemy.orm import composite
from sqlalchemy.sql import func

from matplotlib import pyplot as plt
from functools import reduce

from dateutil.relativedelta import relativedelta
from datetime import datetime
from time import time

from werkzeug.security import generate_password_hash, check_password_hash
from hashlib import md5

import secrets

import jwt

import random

import os

FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'backend\\app\\static\\img')

SECONDS_IN_A_MONTH = 2592000
SECONDS_IN_A_DAY = 86400
TOKEN_RANDOM_MIN = 1653023
TOKEN_RANDOM_MAX = 163510368

class User(UserMixin, db.Model):
    __tablename__ = "user"
    id = db.Column(db.Integer, primary_key=True)
    password_hash = db.Column(db.String(128))
    name = db.Column(db.String(32))
    surname = db.Column(db.String(32))
    birthday = db.Column(db.Date)
    email = db.Column(db.String(64), unique=True)
    phone = db.Column(db.String(12), nullable=True)
    discord = db.Column(db.String(32), nullable=True)
    authenticated = db.Column(db.Boolean, default=False)
    token = db.Column(db.BigInteger, default=random.randint(TOKEN_RANDOM_MIN, TOKEN_RANDOM_MAX))
    invite = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    country_name = db.Column(db.String(32), db.ForeignKey("country.name"))
    transactions = db.relationship("Transaction", back_populates="user")
    indicator_color = db.relationship("IndicatorColor", back_populates="user")
    type = db.Column(db.String(50))

    __mapper_args__ = {
      "polymorphic_identity": "user",
      "polymorphic_on": type,
    }

    def set_password(self, password):
      self.password_hash = generate_password_hash(password)

    def check_password(self, password) -> bool:
      return check_password_hash(self.password_hash, password)

    def avatar(self, size):
      digest = md5(self.email.lower().encode("utf-8")).hexdigest()
      return "https://www.gravatar.com/avatar/{}?d=identicon&s={}".format(digest, size)
    
    def get_strategy_color(self, strategy):
      if not strategy: return False
      strategy_id = db.session.query(Strategy.id).filter(Strategy.name==strategy).first()[0]
      transaction = db.session.query(Transaction.id).filter((Transaction.product_id==strategy_id)&(Transaction.user_id==self.id)).order_by(Transaction.timestamp.desc()).first()
      if not transaction: return "#{}".format(secrets.token_hex(3))
      color = db.session.query(Subscription.color).filter(Subscription.transaction_id==transaction[0]).first()[0]
      return color if color else "#{}".format(secrets.token_hex(3))

    def set_strategy_color(self, color, strategy) -> bool:
      if not color or not strategy: return False
      strategy_id = db.session.query(Strategy.id).filter(Strategy.name==strategy).first()[0]
      transaction = db.session.query(Transaction.id).filter((Transaction.product_id==strategy_id)&(Transaction.user_id==self.id)).order_by(Transaction.timestamp.desc()).first()
      if not transaction: return False
      subscription = Subscription.query.filter(Subscription.transaction_id==transaction[0]).first()
      if not subscription: return False
      subscription[0].color = color
      return True

    def add_indicator_color(self, indicator):
      indicator_id = db.session.query(Indicator.id).filter(Indicator.name==indicator).first()[0]
      db.session.add(IndicatorColor(user_id=self.id, indicator_id=indicator_id))
      return indicator

    def get_indicator_color(self, indicator):
      if not indicator: return False
      indicator_id = db.session.query(Indicator.id).filter(Indicator.name==indicator).first()[0]
      color = db.session.query(IndicatorColor.color).filter((IndicatorColor.indicator_id==indicator_id)&(IndicatorColor.user_id==self.id)).first()  
      return color[0] if color else "#{}".format(secrets.token_hex(3))

    def set_indicator_color(self, color, indicator) -> bool:
      if not color or not indicator: return False
      indicator_id = db.session.query(Indicator.id).filter(Indicator.name==indicator).first()[0]
      indicator_color = IndicatorColor.query.filter((IndicatorColor.indicator_id==indicator_id)&(IndicatorColor.user_id==self.id)).first()
      return indicator_color.set_color(color) if indicator_color else self.set_indicator_color(color, self.add_indicator_color(indicator))


    def is_using(self, product, start=datetime.timestamp(datetime.now()), end=datetime.timestamp(datetime.now())) -> bool:
      return db.session.query(Subscription.id).filter((Subscription.user==self.id)&(Subscription.product==product)&(Subscription.subscription<=start)\
            &((Subscription.unsubscription==None)|(Subscription.unsubscription_timestamp>=end))).count() > 0
    
    def get_reset_password_token(self, expires_in=600):
      return jwt.encode(
          {"reset_password": self.username, "exp": time() + expires_in},
          current_app.config["SECRET_KEY"], algorithm="HS256")


    @staticmethod
    def verify_reset_password_token(token):
      try:
          id = jwt.decode(token, current_app.config["SECRET_KEY"],
                          algorithms=["HS256"])["reset_password"]
      except:
          return
      return User.query.get(id)


@login.user_loader
def load_user(id):
  return User.query.get(id)


class Creator(User, db.Model):
  __tablename__ = "creator"
  id = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True)
  username = db.Column(db.String(48), unique=True)
  iban = db.Column(db.String(48), nullable=True)
  crypto_address = db.Column(db.String(96), nullable=True)
  authenticator = db.Column(db.Integer, db.ForeignKey("admin.id"), nullable=True)
  strategies = db.relationship("Strategy")
  
  __mapper_args__ = {
    "polymorphic_identity": "creator",
  }

  def delete_product(self, strategy) -> bool:
    try:
      strategy = Strategy.query.filter(Strategy.id==strategy).first()[0]
      strategy.creator = 1
      return True
    except:
      return False
    
  
class Admin(User, db.Model):
  __tablename__ = "admin"
  id = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True)
  db_username = db.Column(db.String(32), nullable=True)
  db_password = db.Column(db.String(128), nullable=True)

  __mapper_args__ = {
    "polymorphic_identity": "admin",
  }


class Api(db.Model):
  __tablename__ = "api"
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(64))
  api_key_hash = db.Column(db.String(256))
  api_secret_hash = db.Column(db.String(256))
  user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
  exchange_id = db.Column(db.Integer, db.ForeignKey("exchange.id"))
  exchange = db.relationship("Exchange")


class Performance(object):
  def __init__(self, tr, fr, wr, ror, hp, avgw, avgl, sr, md, acc, mx):
    self.time_range = tr
    self.frequency = fr
    self.winrate = wr
    self.rate_of_return = ror
    self.holding_period = hp
    self.avg_win = avgw
    self.avg_loss = avgl
    self.sharpe_ratio = sr
    self.maximum_drawdown = md
    self.accuracy = acc
    self.max_shares = mx
  
  def __composite_values__(self):
    return self.time_range, self.frequency, self.winrate, self.rate_of_return, self.holding_period, self.avg_win, self.avg_loss, self.sharpe_ratio,\
           self.maximum_drawdown, self.accuracy, self.max_shares
  
  def __eq__(self, other):
    return isinstance(other, Performance) and other.time_range == self.time_range, other.frequency == self.frequency, other.winrate == self.winrate,\
                                              other.rate_of_return == self.rate_of_return, other.holding_period == self.holding_period,\
                                              other.avg_win == self.avg_win, other.avg_loss == self.avg_loss, other.sharpe_ratio == self.sharpe_ratio,\
                                              other.maximum_drawdown == self.maximum_drawdown, other.accuracy == self.accuracy, other.max_shares == self.max_shares

  def __ne__(self, other):
        return not self.__eq__(other)

  def __repr__(self) -> str:
    performance = vars(self)
    performance['time_range'] = int(self.time_range.timestamp()) if isinstance(self.time_range, datetime) else int(datetime.now().timestamp() - self.time_range)
    return str(performance)


class Product(db.Model):
  __tablename__ = "product"
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(32), unique=True)
  price = db.Column(db.Float, default=0.0)
  description = db.Column(db.String(4096), nullable=True)
  created_timestamp = db.Column(db.Integer, default=datetime.now().timestamp())
  active = db.Column(db.Boolean, default=False)
  authenticator = db.Column(db.Integer, db.ForeignKey("admin.id"), nullable=True)
  users = db.relationship("Transaction", back_populates="product")
  type = db.Column(db.String(50))

  __mapper_args__ = {
    "polymorphic_identity": "product",
    "polymorphic_on": type,
  }


class Strategy(Product, db.Model):
  __tablename__ = "strategy"
  id = db.Column(db.Integer, db.ForeignKey("product.id"), primary_key=True)
  fee = db.Column(db.Float, default=0.45)
  trading_type = db.Column(db.Integer)
  leverage = db.Column(db.Integer, default=1)
  time_range = db.Column(db.Integer, default=datetime.now().timestamp())
  frequency = db.Column(db.Float, default=0)
  winrate = db.Column(db.Float, default=0)
  rate_of_return = db.Column(db.Float, default=0)
  holding_period = db.Column(db.Float, default=0)
  average_win = db.Column(db.Float, default=0)
  average_loss = db.Column(db.Float, default=0)
  sharpe_ratio = db.Column(db.Float, default=0)
  maximum_drawdown = db.Column(db.Float, default=0)
  accuracy = db.Column(db.Float, default=0)
  max_shares = db.Column(db.Float, default=1)
  source_code = db.Column(db.String(256))
  updated = db.Column(db.Integer, onupdate=datetime.now().timestamp())
  position = db.Column(db.Integer, nullable=False, default=-1)
  telegram = db.Column(db.String(64))
  discord = db.Column(db.String(64))
  backtest_id = db.Column(db.Integer, db.ForeignKey("backtest.id"))
  creator_id = db.Column(db.Integer, db.ForeignKey("creator.id"))
  assets = db.relationship("StrategyAsset", back_populates="strategy")
  indicators = db.relationship("StrategyIndicator", back_populates="strategy")

  performance = composite(Performance, time_range, frequency, winrate, rate_of_return, holding_period, average_win, average_loss,\
                          sharpe_ratio, maximum_drawdown, accuracy, max_shares)

  __mapper_args__ = {
    "polymorphic_identity": "strategy",
  } 

  def performances(self):
    backtest = Backtest.query.filter(Backtest.id==self.backtest_id).first()[0]
    return self.performance, backtest.performance

  def create_thumbnail(self, months=12) -> bool:
    folder = 'general_performance' if months == 12 else 'month_performance'
    current_t = datetime.now().timestamp()
    looping_t = (datetime.now().replace(hour=0, minute=0, second=0) - relativedelta(months=months)).timestamp()
    earning = []
    while looping_t < current_t:
      earning.append(sum([e for e, in db.session.query(Trade.percentage).filter((Trade.product_id==self.id)&(Trade.close_timestamp>=looping_t)
                                                                      &(Trade.close_timestamp<looping_t + SECONDS_IN_A_DAY))]))
      if len(earning) > 1: earning[-1] += earning[-2]
      looping_t += SECONDS_IN_A_DAY
    color = '#ec5454' if earning[-1] < 0 else '#24a49c'
    plt.switch_backend('agg')
    plt.figure().set_figheight(0.5)
    plt.axis('off')
    plt.plot([i for i in range(0, len(earning))], earning, color=color)
    plt.savefig(FOLDER + f'\\{folder}\\{self.id}.svg', transparent = True)
    return True

  def __json__(self, assets = False, indicators = False, **kwargs):
    dictionary = {}
    if assets:
      dictionary.update({"asset": [a.__json__() for a in self.assets]})
    if indicators:
      dictionary.update({"indicator": [i.__json__() for i in self.indicators]})
    if not kwargs:
      dictionary.update(vars(self))
      dictionary.__delitem__('_sa_instance_state')
      return dictionary
    for k in range(len(kwargs)):
      try:
        dictionary[list(kwargs.keys())[k]] = self.__getattribute__(list(kwargs.values())[k])
      except:
        pass
    dictionary.__delitem__('_sa_instance_state')
    return dictionary


class Backtest(Product, db.Model):
  __tablename__ = "backtest"
  id = db.Column(db.Integer, db.ForeignKey("product.id"), primary_key=True)
  time_range = db.Column(db.Integer, default=datetime.now().timestamp())
  frequency = db.Column(db.Float, default=0)
  winrate = db.Column(db.Float, default=0)
  rate_of_return = db.Column(db.Float, default=0)
  holding_period = db.Column(db.Float, default=0)
  average_win = db.Column(db.Float, default=0)
  average_loss = db.Column(db.Float, default=0)
  sharpe_ratio = db.Column(db.Float, default=0)
  maximum_drawdown = db.Column(db.Float, default=0)
  accuracy = db.Column(db.Float, default=0)
  max_shares = db.Column(db.Float, default=1)
  pdf = db.Column(db.String(256))
  user_id = db.Column(db.Integer, db.ForeignKey("user.id"))

  performance = composite(Performance, time_range, frequency, winrate, rate_of_return, holding_period, average_win, average_loss,\
                          sharpe_ratio, maximum_drawdown, accuracy, max_shares)
  
  __mapper_args__ = {
    "polymorphic_identity": "backtest",
  } 
  

class StrategyAsset(db.Model):
  __tablename__ = "strategyasset"
  id = db.Column(db.Integer, primary_key=True)
  strategy_id = db.Column(db.Integer, db.ForeignKey("strategy.id"))
  asset_id = db.Column(db.Integer, db.ForeignKey("asset.id"))
  strategy = db.relationship("Strategy", back_populates="assets")
  asset = db.relationship("Asset", back_populates="strategies")

  def __json__(self, **kwargs):
    if not kwargs:
      return {"strategy": self.strategy.id,
              "name": db.session.query(Asset.name).filter(Asset.id==self.asset_id).first()[0],
              "icon": '/static/img/assets_icons/' + db.session.query(Asset.name).filter(Asset.id==self.asset_id).first()[0].lower() + '.png'}
    dict = {}
    for k in range(len(kwargs)):
      try:
        dict[list(kwargs.keys())[k]] = self.__getattribute__(list(kwargs.values())[k])
      except:
        pass
    return dict
  

class StrategyIndicator(db.Model):
  __tablename__ = "strategyindicator"
  id = db.Column(db.Integer, primary_key=True)
  parameter = db.Column(db.String(128))
  strategy_id = db.Column(db.Integer, db.ForeignKey("strategy.id"))
  indicator_id = db.Column(db.Integer, db.ForeignKey("indicator.id"))
  strategy = db.relationship("Strategy", back_populates="indicators")
  indicator = db.relationship("Indicator", back_populates="strategies")

  def __json__(self, **kwargs):
    if not kwargs:
      return {"strategy": self.strategy.id,
              "indicator": self.indicator.name,
              "chart": self.indicator.external_chart,
              "params": self.parameter}
    dict = {}
    for k in range(len(kwargs)):
      try:
        dict[list(kwargs.keys())[k]] = self.__getattribute__(list(kwargs.values())[k])
      except:
        pass
    return dict


class Indicator(db.Model):
  __tablename__ = "indicator"
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(32))
  external_chart = db.Column(db.Boolean, default=False)
  strategies = db.relationship("StrategyIndicator", back_populates="indicator")


class IndicatorColor(db.Model):
  __tablename__ = "indicatorcolor"
  id = db.Column(db.Integer, primary_key=True)
  color = db.Column(db.String(10))
  user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
  indicator_id = db.Column(db.Integer, db.ForeignKey("indicator.id"))
  user = db.relationship("User", back_populates="indicator_color")

  def set_color(self, color):
    self.color = color


class Transaction(db.Model):
  __tablename__ = "transaction"
  id = db.Column(db.Integer, primary_key=True)
  timestamp = db.Column(db.Integer, default=datetime.now().timestamp())
  price = db.Column(db.Float)
  promo = db.Column(db.String(16), nullable=True)
  status = db.Column(db.SmallInteger)
  user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
  product_id = db.Column(db.Integer, db.ForeignKey("product.id"))
  product = db.relationship("Product", back_populates="users")
  user = db.relationship("User", back_populates="transactions")


class Subscription(db.Model):
  __tablename__ = "subscription"
  id = db.Column(db.Integer, primary_key=True)
  subscription_timestamp = db.Column(db.Integer, default=datetime.now().timestamp())
  unsubscription_timestamp = db.Column(db.Integer, nullable=True)
  auto_renewal = db.Column(db.Boolean, default=False)
  preferred_leverage = db.Column(db.Integer, default=1)
  color = db.Column(db.String(10))
  quote_id = db.Column(db.Integer, db.ForeignKey("asset.id"))
  api_id = db.Column(db.Integer, db.ForeignKey("api.id"))
  transaction_id = db.Column(db.Integer, db.ForeignKey("transaction.id"))

  def set_auto_renewal(self, value) -> bool:
    if not isinstance(value, bool) or not value: return False
    self.auto_renewal = value
    db.session.commit()
    return True
  
  def set_unsubscription(self, timestamp) -> bool:
    self.unsubscription_timestamp = timestamp
    db.session.commit()
    return True

  def set_leverage(self, leverage) -> bool:
    self.preferred_leverage = leverage
    db.session.commit()
    return True
  
  def _json_(self) -> dict:
    return {"strategy": db.session.query(Strategy.name).filter(Strategy.id==db.session.query(Transaction.product_id).filter(Transaction.id==self.transaction_id).first()[0]).first()[0],
            "start": datetime.fromtimestamp(self.subscription_timestamp).strftime('%d-%m-%Y'),
            "end": datetime.fromtimestamp(self.unsubscription_timestamp).strftime('%d-%m-%Y'),
            "asset": db.session.query(Asset.name).filter(Asset.id==db.session.query(Strategy.asset_id).filter(Strategy.id==self.product_id).first()[0]).first()[0].lower(),
            "leverage": self.preferred_leverage,}


class Candlestick(db.Model):
  __tablename__ = "candlestick"
  id = db.Column(db.Integer, primary_key=True)
  symbol = db.Column(db.String(12))
  timestamp = db.Column(db.Integer)
  timeframe = db.Column(db.Integer, default=5)
  open = db.Column(db.Float)
  high = db.Column(db.Float)
  low = db.Column(db.Float)
  close = db.Column(db.Float)
  volume = db.Column(db.Float)
  asset_id = db.Column(db.Integer, db.ForeignKey("asset.id"))

  def __json__(self, **kwargs) -> dict:
    if not kwargs:
      return {"time": self.timestamp,
              "timeframe": self.timeframe,
              "open": self.open,
              "high": self.high,
              "low": self.low,
              "close": self.close}
    dict = {}
    for k in range(len(kwargs)):
      try:
        dict[list(kwargs.keys())[k]] = self.__getattribute__(list(kwargs.values())[k])
      except:
        pass
    return dict
  

class Trade(db.Model):
  __tablename__ = "trade"
  id = db.Column(db.Integer, primary_key=True)
  position = db.Column(db.Boolean, default=True)
  open_timestamp = db.Column(db.Integer, default=datetime.now().timestamp())
  close_timestamp =db.Column(db.Integer, default=datetime.now().timestamp())
  open_value = db.Column(db.Float)
  take_profit = db.Column(db.Float)
  stop_loss = db.Column(db.Float)
  percentage = db.Column(db.Float, nullable=True)
  open_candlestick_id = db.Column(db.Integer, db.ForeignKey("candlestick.id"))
  close_candlestick_id = db.Column(db.Integer, db.ForeignKey("candlestick.id"), nullable=True)
  product_id = db.Column(db.Integer, db.ForeignKey("product.id"))
  open_candlestick = db.relationship("Candlestick", foreign_keys="Trade.open_candlestick_id")
  close_candlestick = db.relationship("Candlestick", foreign_keys="Trade.close_candlestick_id")

  def __json__(self, timestamp=True, asset=False, **kwargs):
    if not kwargs:
      startDate = self.open_candlestick.timestamp if timestamp else datetime.fromtimestamp(self.open_candlestick.timestamp)
      if self.close_candlestick:
        endDate = self.close_candlestick.timestamp if timestamp else datetime.fromtimestamp(self.close_candlestick.timestamp)
      else:
        endDate = None
      asset = Asset.query.filter(Asset.id==self.open_candlestick.asset_id).first().__json__() if asset else None
      return {"startDate": startDate,
              "endDate": endDate,
              "position": self.position,
              "openPrice": self.open_value,
              "takeProfit": self.take_profit,
              "stopLoss": self.stop_loss,
              "result": self.percentage,
              "asset": asset}
    dict = {}
    for k in range(len(kwargs)):
      try:
        dict[list(kwargs.keys())[k]] = self.__getattribute__(list(kwargs.values())[k])
      except:
        pass
    return dict


class Asset(db.Model):
  __tablename__ = "asset"
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(32), unique=True)
  symbol = db.Column(db.String(5), unique=True)
  color = db.Column(db.String(10))
  strategies = db.relationship("StrategyAsset", back_populates="asset")

  def __json__(self, **kwargs):
    if not kwargs:
      return vars(self)
    dict = {}
    for k in range(len(kwargs)):
      try:
        dict[list(kwargs.keys())[k]] = self.__getattribute__(list(kwargs.values())[k])
      except:
        pass
    return dict


class Crypto(Asset, db.Model):
  __tablename__ = "crypto"

  

class Exchange(db.Model):
  __tablename__ = "exchange"
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(32), unique=True)
  spot_taker = db.Column(db.Float, default=0.1)
  spot_maker = db.Column(db.Float, default=0.1)
  margin_taker = db.Column(db.Float, default=0.1)
  margin_maker = db.Column(db.Float, default=0.1)
  future_taker = db.Column(db.Float, default=0.1)
  future_maker = db.Column(db.Float, default=0.1)
  country = db.relationship("CountryExchange", back_populates="exchange")


class Country(db.Model):
  __tablename__ = "country"
  name = db.Column(db.String(48), primary_key=True)
  exchange = db.relationship("CountryExchange", back_populates="country")


class CountryExchange(db.Model):
  __tablename__ = "countryexchange"
  id = db.Column(db.Integer, primary_key=True)
  spot = db.Column(db.Boolean)
  margin = db.Column(db.Boolean)
  future = db.Column(db.Boolean)
  country_name = db.Column(db.String(32), db.ForeignKey("country.name"))
  exchange_id = db.Column(db.Integer, db.ForeignKey("exchange.id"))
  country = db.relationship("Country", back_populates="exchange")
  exchange = db.relationship("Exchange", back_populates="country")