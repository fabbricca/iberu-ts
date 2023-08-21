import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))


class Config(object):
  HOST = os.environ.get('HOST')
  USER = os.environ.get('USER')
  PASSWORD = os.environ.get('PASSWORD')
  DATABASE = os.environ.get('DATABASE')
  SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
  API_KEY = os.environ.get('API_KEY').encode('utf-8')
  API_SECRET = os.environ.get('API_SECRET').encode('utf-8')
  SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
      'sqlite:///' + os.path.join(basedir, 'app.db')
  SQLALCHEMY_TRACK_MODIFICATIONS = False
  MAIL_SERVER = os.environ.get('MAIL_SERVER')
  MAIL_PORT = int(os.environ.get('MAIL_PORT') or 25)
  MAIL_USE_TLS = False if os.environ.get('MAIL_USE_TLS') == 'False' else True
  MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
  MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
  MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')
  ADMINS = ['fabb.riccardo@gmail.com']
  LANGUAGES = ['en']
  CACHE_TYPE = "SimpleCache"
  CACHE_DEFAULT_TIMEOUT = 300
  GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
  GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
  GOOGLE_DISCOVERY_URL = ('https://accounts.google.com/.well-known/openid-configuration')
  MAX_LEVERAGE = 5
  MAX_AVATAR_CONTENT_LENGTH = 2 * 1024 * 1024
  MAX_STRATEGIES_CONTENT_LENGTH = 5 * 1024 * 1024
  IMAGE_UPLOAD_EXTENSIONS = ['.jpg', '.png']
  AVATAR_UPLOAD_PATH = os.path.join(basedir, 'app/static/img/avatars')
  STRATEGIES_UPLOAD_EXTENSIONS = ['.py', '.c', '.cpp', '.txt']
  STRATEGIES_UPLOAD_PATH = os.path.join(basedir, 'app/static/strategies')
  TIMESTAMP_DELAY = 1296000
  ACCESS_TOKEN_SECRET = os.environ.get('ACCESS_TOKEN_SECRET')
  REFRESH_TOKEN_SECRET = os.environ.get('REFRESH_TOKEN_SECRET')
  TUTORIAL_TOKEN_SECRET = os.environ.get('TUTORIAL_TOKEN_SECRET')
  STRATEGIES_PER_PAGE = 25
  RECAPTCHA_PUBLIC_KEY = os.environ.get('RECAPTCHA_PUBLIC_KEY')
  RECAPTCHA_PRIVATE_KEY = os.environ.get('RECAPTCHA_PRIVATE_KEY')
  RECAPTCHA_USE_SSL = False
  RECAPTCHA_OPTIONS = {'theme':'black'}
  SESSION_COOKIE_SAMESITE = 'Strict'