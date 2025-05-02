import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabaseUrl = 'https://tlatqijpqeyxshdjjllr.supabase.co';
const supabaseKey = process.env.SESSION_SECRET || "";

export const supabase = createClient(supabaseUrl, supabaseKey);
const require = createRequire(import.meta.url);
const FitbitStrategy = require('passport-fitbit-oauth2').FitbitOAuth2Strategy;

// Load .env
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Setup session middleware (required for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Fitbit strategy

// Serialize user into session
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Routes
app.get('/auth/fitbit',(req,res,next) => {
  
  const { email,redirect } = req.query;
  console.log(email,redirect)

  if (email && redirect) {
    // Save email to session so it's available in callback
    req.session.email = email;
    req.session.redirect = redirect;

  }
  passport.use(new FitbitStrategy({
    clientID: process.env.clientId,
    clientSecret: process.env.clientSecret,
    callbackURL: 'https://backendrepo-7lce.onrender.com/auth/fitbit/callback',
    scope: ['activity', 'heartrate', 'sleep', 'profile']
  },
  async (accessToken, refreshToken, profile,req, done) => {
    console.log('Fitbit Profile:', profile);
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);
    await supabase.from('tokens').upsert({email: req.session.email,accessToken: accessToken,refreshToken: refreshToken})

    // Normally you'd save this info to your DB here
    return done(null, { profile, accessToken, refreshToken });
  }
));

  next();
}, passport.authenticate('fitbit')

);

app.get('/auth/fitbit/callback',
  passport.authenticate('fitbit', { failureRedirect: '/auth/failed' }),
  async (req, res) => {
    // Successful auth

    const redirectUrl = `${req.session.redirect}?email=${encodeURIComponent(email)}`;
    console.log(redirectUrl)
    res.redirect(redirectUrl);

  }
);

app.get('/auth/failed', (req, res) => {
  res.status(401).json({ error: 'Authentication failed' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
