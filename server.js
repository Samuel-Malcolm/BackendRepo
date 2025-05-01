import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

// ✅ Apply CORS middleware before any routes
app.use(cors()); // Allows all origins by default
app.use(express.json());

// ✅ Your route
app.post('/custom-endpoint', async (req, res) => {
  const { userData } = req.body;
  console.log('Received POST data:', userData);

  try {
    const externalResponse = await fetch(userData.url, {
      method: 'POST',
      headers: userData.headers,
      body: userData.body,
    });

    const externalData = await externalResponse.json();

    res.status(200).json({
      message: 'Data received and processed successfully!',
      externalResponse: externalData,
    });
  } catch (error) {
    console.error('Error during external API call:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
