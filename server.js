import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';

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
passport.use(new FitbitStrategy({
    clientID: process.env.FITBIT_CLIENT_ID,
    clientSecret: process.env.FITBIT_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['activity', 'heartrate', 'sleep', 'profile']
  },
  (accessToken, refreshToken, profile, done) => {
    console.log('Fitbit Profile:', profile);
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);
    // Normally you'd save this info to your DB here
    return done(null, { profile, accessToken, refreshToken });
  }
));

// Serialize user into session
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Routes
app.get('/auth/fitbit', passport.authenticate('fitbit'));

app.get('/auth/fitbit/callback',
  passport.authenticate('fitbit', { failureRedirect: '/auth/failed' }),
  (req, res) => {
    // Successful auth
    res.json({
      message: 'Fitbit authentication successful!',
      user: req.user
    });
  }
);

app.get('/auth/failed', (req, res) => {
  res.status(401).json({ error: 'Authentication failed' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
