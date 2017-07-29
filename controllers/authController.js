const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Login failed! Please try again',
  successRedirect: '/',
  successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out!');
  res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
  // First check if the user is authenticated
  if (req.isAuthenticated()) {
    next();
    return;
  }

  req.flash('error', 'Oops! You must be logged in to do that');
  res.redirect('/login');
}

exports.forgot = async (req, res) => {
  // See if user exists with this email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash('error', 'No account with that email exists!');
    return res.redirect('/login');
  }

  // Set reset token and expiry on the account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000
  await user.save();

  // Send an email with the token
  const resetUrl = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user,
    subject: 'Password Reset',
    resetUrl,
    filename: 'password-reset',
  });

  req.flash('success', 'You have been emailed a password reset link.');

  // redirect to the login page
  return res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash('error', 'Invalid or expired password reset token');
    return res.redirect('/login');
  }

  res.render('reset', { title: 'Reset Your Password'});
};

exports.confirmedPasswords = (req, res, next)  => {
  if (req.body.password === req.body['password-confirm']) {
    next();
    return;
  }

  req.flash('error', 'Passwords do not match!');
  res.redirect('back');
};

exports.update = async (req, res)  => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash('error', 'Invalid or expired password reset token');
    return res.redirect('/login');
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);

  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();

  await req.login(updatedUser);
  req.flash('success', 'Your password has been reset!');
  res.redirect('/');
};