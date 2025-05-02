import express from 'express'
import cors  from 'cors'
import fetch from 'node-fetch';
const app = express();

// ✅ Apply CORS middleware before any routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

console.log(1)
// ✅ Your route
app.post('/custom-endpoint', async (req, res) => {
    console.log(2)
    console.log(req)
    const  userData  = req.body;
  console.log('Received POST data:', userData.url);
  console.log('Received POST data:', userData.body);
  console.log('Received POST data:', userData.headers);
  try {
    console.log(3)
    const externalResponse = await fetch(userData.url, {
      method: 'POST',
      headers: userData.headers,
      body: userData.body,
    });

    const externalData = await externalResponse.json();

    res.status(200).json(externalData); // instead of nesting inside externalResponse
} catch (error) {
    console.log(4)
    console.error('Error during external API call:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
console.log(5)
// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
