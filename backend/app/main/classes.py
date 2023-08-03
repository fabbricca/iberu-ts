class Performance():
  def __init__(self, performance, name=None, winrate=0, long=0, longwr=0, short=0, shortwr=0, date=None) -> None:
    self.name = name
    self.performance = performance
    self.winrate = winrate
    self.long = long
    self.longwr = longwr
    self.short = short
    self.shortwr = shortwr
    self.date = date

  def __str__(self) -> str:
    return str(self.performance)


class UnseenTrades():
  def __init__(self, timestamp, strategy, position, open_value, result) -> None:
    self.timestamp = timestamp
    self.strategy = strategy
    self.position = position
    self.open_value = open_value
    self.result = result

  def __str__(self) -> str:
    return str(self.result)


class StrategyInfo():
  def __init__(self, name, performance, author='null', price='null', type='null', created='null', color='null') -> None:
    self.name = name
    self.author = author
    self.price = price
    self.type = type
    self.color = color
    self.update = created
    self.performance = performance

  def __json__(self, **kwargs) -> dict:
    if kwargs:
      dict = {}
      for k in kwargs.values():
        try:
          dict[k] = self.__getattribute__(k)
        except:
          pass
      return dict
    return {'name': self.name,
            'author': self.author,
            'price': self.price,
            'type': self.type,
            'color': self.color,
            'created': self.update,
            'performance': self.performance}

  def __str__(self) -> str:
    return str(self.name)


class UserInfo():
  def __init__(self, username, performance=None, messages='null') -> None:
    self.username = username
    self.performance = [performance]
    self.created = []
    self.messages = messages

  def add_strategy(self, strategy):
    self.created.append(strategy.__json__())
  
  def __json__(self) -> dict:
    return {'username': self.username,
            'performance': self.performance,
            'strategiescreated': self.created,
            'messages': self.messages}

  def __str__(self) -> str:
    return str(self.username)


class UserPerformance():
  def __init__(self, period='1M') -> None:
    self.dates = []
    self.period = period
    self.earnings = []

  def __str__(self) -> str:
    return str(self.earnings)


class MonthStrategyEarning():
  def __init__(self, id, startperiod, earning, winrate, longtrades, trades) -> None:
    self.id = id
    self.start_period = startperiod
    self.earning = earning
    self.winrate = winrate
    self.long_trades = longtrades
    self.trades = trades

  def __json__(self) -> dict:
    return {'id': self.id,
            'startPeriod': self.start_period,
            'earning': self.earning,
            'winrate': self.winrate,
            'longTrades': self.long_trades,
            'trades': self.trades}
  
