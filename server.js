app.get('/auth/fitbit', (req, res, next) => {
  const email = req.query.email;
  const redirect = req.query.redirect;

  console.log("Email:", email, "Redirect:", redirect);

  req.session.email = email || "";
  req.session.redirect = redirect || "";

  next(); // Continue to passport.authenticate
}, passport.authenticate('fitbit'));

// OAuth callback
app.get('/auth/fitbit/callback',
  passport.authenticate('fitbit', { failureRedirect: '/auth/failed' }),
  async (req, res) => {
    const { profile, accessToken, refreshToken } = req.user;
    const { email, redirect } = req.session;

    await supabase.from('tokens').upsert({
      email,
      accessToken,
      refreshToken
    });

    const redirectUrl = `${redirect}?email=${encodeURIComponent(email)}&fitbitId=${profile.id}`;
    res.redirect(redirectUrl);
  }
);
