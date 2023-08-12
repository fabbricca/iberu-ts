from flask_wtf import FlaskForm, RecaptchaField
from app.models import User
from wtforms.validators import ValidationError, DataRequired, Email, EqualTo
from wtforms import StringField, PasswordField, BooleanField, SubmitField



class LoginForm(FlaskForm):
    username = StringField(('Username'), validators=[DataRequired()])
    password = PasswordField(('Password'), validators=[DataRequired()])
    submit = SubmitField(('LOGIN'))




class RegistrationForm(FlaskForm):
    name = StringField(('Name'), validators=[DataRequired()])
    surname = StringField(('Surname'), validators=[DataRequired()])
    email = StringField(('Email'), validators=[DataRequired(), Email()])
    password = PasswordField(('Password'), validators=[DataRequired()])
    rpassword = PasswordField(('Repeat Password'), validators=[DataRequired(), EqualTo('password')])
    recaptcha = RecaptchaField()
    submit = SubmitField(('REGISTER'))

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError(('Please use a different email address.'))




class ResetPasswordRequestForm(FlaskForm):
    email = StringField(('Email'), validators=[DataRequired(), Email()])
    submit = SubmitField(('REQUEST PASSWORD RESET'))




class ChangePasswordRequestForm(FlaskForm):
    email = StringField(('Email'), validators=[DataRequired(), Email()])
    password = PasswordField(('Password'), validators=[DataRequired()])
    submit = SubmitField(('REQUEST PASSWORD RESET'))




class ResetPasswordForm(FlaskForm):
    password = PasswordField(('Password'), validators=[DataRequired()])
    password2 = PasswordField(('Repeat Password'), validators=[DataRequired(),
                              EqualTo('password')])
    submit = SubmitField(('Request Password Reset'))