const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config({ path: './.env.temp' });
const communityRoutes = require('./routes/communityRoutes');
const { connect } = require('./mongoConnection')

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
    origin: ["http://localhost:5173","http://localhost:8103","http://localhost:8502","https://amcbe.onrender.com", "https://autoshortsfrontend.vercel.app", "http://localhost:3000", "http://localhost:3001",  "http://localhost:3002", "https://automoviecreator.com"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    headers: ["Content-Type", "Authorization"]
}));

app.use(communityRoutes);

async function startServer() {
  try {
    await connect();
    console.log('Connected to MongoDB successfully.');
     const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

startServer();
