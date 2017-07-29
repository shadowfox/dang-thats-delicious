const passport = require('passport');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Login failed! Please try again',
  successRedirect: '/',
  successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now loged out!');
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