from app import db
from app import Config
from app.auth import bp
from app.models import User
from app.auth.email import send_password_reset_email
from app.api.tokens import createRefreshToken
from app.auth.forms import RegistrationForm, LoginForm, ResetPasswordRequestForm, ResetPasswordForm, ChangePasswordRequestForm
from werkzeug.urls import url_parse

from flask import request, render_template, flash, redirect, url_for, make_response
from flask_login import current_user, login_user, logout_user, login_required

from datetime import datetime

from oauthlib.oauth2 import WebApplicationClient

import requests
import json

client = WebApplicationClient(Config.GOOGLE_CLIENT_ID)


@bp.before_request
def before_request():
    if current_user.is_authenticated:
        current_user.last_seen = datetime.utcnow()
        db.session.commit()




@bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))

    form = LoginForm()
    if form.validate_on_submit():
        if '@' in form.username.data:
            user = User.query.filter_by(email=form.username.data).first()
        else:
            user = User.query.filter_by(username=form.username.data).first()

        if not user or not user.check_password(form.password.data):
            flash('Invalid username or password')
            return redirect(url_for('auth.login'))
        elif not user.password_hash:
            return redirect(url_for('auth.google'))

        login_user(user)

        next_page = request.args.get('next')
        if not next_page or url_parse(next_page).netloc != '':
            next_page = url_for('main.index')

        response = make_response(redirect(next_page))
        response.set_cookie(key='jid', value=createRefreshToken(), httponly=True)

        return response
    return render_template('auth/login.html', title='Sign In', form=form)




@bp.route('/google')
def google():
    google_provider_cfg = requests.get(Config.GOOGLE_DISCOVERY_URL).json()
    authorization_endpoint = google_provider_cfg['authorization_endpoint']
    request_uri = client.prepare_request_uri(
        authorization_endpoint,
        redirect_uri = request.base_url + "/callback",
        scope=["openid", "email", "profile"],
    )
    return redirect(request_uri)




@bp.route('/google/callback')
def callback():
    code = request.args.get("code")
    google_provider_cfg = requests.get(Config.GOOGLE_DISCOVERY_URL).json()
    token_endpoint = google_provider_cfg['token_endpoint']
    token_url, headers, body = client.prepare_token_request(
    token_endpoint,
    authorization_response=request.url,
    redirect_url=request.base_url,
    code=code
    )
    token_response = requests.post(
        token_url,
        headers=headers,
        data=body,
        auth=(Config.GOOGLE_CLIENT_ID, Config.GOOGLE_CLIENT_SECRET),
    )
    client.parse_request_body_response(json.dumps(token_response.json()))
    userinfo_endpoint = google_provider_cfg["userinfo_endpoint"]
    uri, headers, body = client.add_token(userinfo_endpoint)
    userinfo_response = requests.get(uri, headers=headers, data=body)
    if userinfo_response.json().get("email_verified"):
        users_email = userinfo_response.json()["email"]
        users_name = userinfo_response.json()["given_name"]
    else:
        return "User email not available or not verified by Google.", 400
    user = User.query.filter(User.email==users_email).first()
    if not user:
        db.session.add(User(username=users_name, email=users_email))
        db.session.commit()
        user = User.query.filter(User.email==users_email).first()
    login_user(user)
    next_page = request.args.get('next')
    if not next_page or url_parse(next_page).netloc != '':
        next_page = url_for('main.index')
    response = make_response(redirect(next_page))
    response.set_cookie(key='jid', value=createRefreshToken(), httponly=True)
    return response
    




@bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))




@bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(name=form.name.data,\
            surname=form.surname.data, email=form.email.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Congratulations, you are now a registered user!')
        login_user(user)
        next_page = request.args.get('next')
        if not next_page or url_parse(next_page).netloc != '':
            next_page = url_for('main.index')
        response = make_response(redirect(next_page))
        response.set_cookie(key='jid', value=createRefreshToken(), httponly=True, samesite='Strict')
        return response
    return render_template('auth/register.html', title='Register', form=form)




@bp.route('/reset_password_request', methods=['GET', 'POST'])
def reset_password_request():
  form = ResetPasswordRequestForm()
  if form.validate_on_submit():
      user = User.query.filter_by(email=form.email.data).first()
      if user:
          send_password_reset_email(user)
      flash('Check your email for the instructions to reset your password')
      return redirect(url_for('auth.login'))
  return render_template('auth/reset_password_request.html',
                          title='RESET PASSWORD', form=form)




@bp.route('/change_password_request', methods=['GET', 'POST'])
def change_password_request():
  form = ChangePasswordRequestForm()
  if form.validate_on_submit():
      user = User.query.filter_by(email=form.email.data).first()
      if user and user.check_password(form.password.data):
        send_password_reset_email(user)
      flash('Check your email for the instructions to reset your password')
      return redirect(url_for('auth.login'))
  return render_template('auth/reset_password_request.html',
                          title='RESET PASSWORD', form=form)




@bp.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    user = User.verify_reset_password_token(token)
    if not user:
        return redirect(url_for('main.index'))
    form = ResetPasswordForm()
    if form.validate_on_submit():
      user.set_password(form.password.data)
      db.session.commit()
      flash('Your password has been reset.')
      return redirect(url_for('auth.login'))
    context = {
        'current': 0,
    }
    return render_template('auth/reset_password.html', context=context, form=form)