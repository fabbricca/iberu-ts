from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField, TextAreaField, PasswordField
from wtforms.validators import ValidationError, DataRequired, Email, Optional, Length
from app.models import User




class EmptyForm(FlaskForm):
  submit = SubmitField('Submit')




class MessageForm(FlaskForm):
  body = TextAreaField(('Say something'), validators=[DataRequired(), Length(min=1, max=256)])
  submit = SubmitField(('Submit'))




class EditProfileForm(FlaskForm):
  name = StringField(('Name'), validators=[Optional()])
  surname = StringField(('Surname'), validators=[Optional()])
  phone = StringField(('Phone Number'), validators=[Optional()])
  discord = StringField(('Discord'), validators=[Optional()])
  submit = SubmitField(('Submit'))




class EditCProfileForm(FlaskForm):
  username = StringField(('Username'), validators=[DataRequired()])
  name = StringField(('Name'), validators=[DataRequired()])
  surname = StringField(('Surname'), validators=[DataRequired()])
  phone = StringField(('Phone Number'), validators=[DataRequired()])
  discord = StringField(('Discord'), validators=[DataRequired()])
  submit = SubmitField(('Submit'))

  def __init__(self, original_username, *args, **kwargs):
    super(EditCProfileForm, self).__init__(*args, **kwargs)
    self.original_username = original_username

  def validate_username(self, username):
    if username.data != self.original_username:
        user = User.query.filter_by(username=self.username.data).first()
        if user is not None:
            raise ValidationError('Please use a different username.')
            



class ChangePasswordRequestForm(FlaskForm):
    email = StringField(('Email'), validators=[DataRequired(), Email()])
    password = PasswordField(('Password'), validators=[DataRequired()])
    submit = SubmitField(('Change password'))