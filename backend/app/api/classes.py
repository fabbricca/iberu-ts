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