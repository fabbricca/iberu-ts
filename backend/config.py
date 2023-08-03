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
  SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
      'sqlite:///' + os.path.join(basedir, 'app.db')
  SQLALCHEMY_TRACK_MODIFICATIONS = False
  MAIL_SERVER = os.environ.get('MAIL_SERVER')
  MAIL_PORT = int(os.environ.get('MAIL_PORT'))
  MAIL_USE_TLS = bool(os.environ.get('MAIL_USE_TLS'))
  MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
  MAIL_PASSWORD = os.environ.get('SENDGRID_API_KEY')
  MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')
  ADMINS = ['fabb.riccardo@gmail.com']
  LANGUAGES = ['en']
  CACHE_TYPE = "SimpleCache"
  CACHE_DEFAULT_TIMEOUT = 300
  GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
  GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
  GOOGLE_DISCOVERY_URL = ('https://accounts.google.com/.well-known/openid-configuration')
  MAX_LEVERAGE = 5
  MAX_CONTENT_LENGTH = 2 * 1024 * 1024
  UPLOAD_EXTENSIONS = ['.jpg', '.png']
  UPLOAD_PATH = os.path.join(basedir, 'app/static/img/avatars')