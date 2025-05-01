import express from 'express';
import fetch from 'node-fetch'; // If you want to make external requests like to Fitbit's API
import cors from 'cors'; // or const cors = require('cors');

// Initialize express app

const app = express();

app.use(cors({
  origin: '*', // your Netlify domain
  methods: ['POST', 'GET', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

// POST request handler
app.post('/custom-endpoint', async (req, res) => {
  // Extract data from the incoming request body
  const { userData } = req.body;

  // Log the incoming data to the console (you can replace this with actual processing)
  console.log('Received POST data:', userData);

  // Example: Sending a POST request to an external API (optional)
  try {
    const externalResponse = await fetch(userData.url, {
      method: 'POST',
      headers: await userData.headers,
      body: await userData.body,
    });

    const externalData = await externalResponse.json();

    // Respond back to the client with the external data or a custom message
    res.status(200).json({
      message: 'Data received and processed successfully!',
      externalResponse: externalData,
    });
  } catch (error) {
    // Error handling
    console.error('Error during external API call:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
