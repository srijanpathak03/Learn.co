const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb+srv://balpreet:ct8bCW7LDccrGAmQ@cluster0.2pwq0w2.mongodb.net/discourseDB")
  .then(() => console.log('Connected to MongoDB successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// Make db connection available to routes
app.locals.db = mongoose.connection;

// Import routes
const communityRoutes = require('./routes/communityRoutes');
const authRoutes = require('./routes/authRoutes');
const discourseRoutes = require('./routes/discourseRoutes');
const payment = require('./routes/payment');


// Use routes
app.use('/', communityRoutes);
app.use('/', authRoutes);
app.use('/discourse', discourseRoutes); // All discourse routes will be prefixed with /discourse
app.use('/', payment);



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
