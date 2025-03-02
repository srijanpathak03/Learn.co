const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');

// Add these constants at the top of your file
const DISCOURSE_URL = process.env.DISCOURSE_URL;
const DISCOURSE_API_KEY = process.env.DISCOURSE_API_KEY;
const DISCOURSE_API_USERNAME = 'system';

// Login route
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    
    const response = await axios.post(`${DISCOURSE_URL}/session`, {
      login,
      password
    }, {
      headers: {
        'Api-Key': DISCOURSE_API_KEY,
        'Api-Username': DISCOURSE_API_USERNAME,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.error) {
      return res.status(401).json({
        success: false,
        message: response.data.error
      });
    }

    const userResponse = await axios.get(`${DISCOURSE_URL}/users/${login}.json`, {
      headers: {
        'Api-Key': DISCOURSE_API_KEY,
        'Api-Username': DISCOURSE_API_USERNAME
      }
    });

    res.json({
      success: true,
      user: userResponse.data.user,
      token: response.data.token
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    
    // Call Discourse API to create user
    const response = await axios.post(`${DISCOURSE_URL}/users`, {
      name,
      email,
      username,
      password,
      active: true,
      approved: true
    }, {
      headers: {
        'Api-Key': DISCOURSE_API_KEY,
        'Api-Username': DISCOURSE_API_USERNAME,
        'Content-Type': 'application/json'
      }
    });

    // Check if the response contains validation errors
    if (response.data.success === false || (response.data.user && response.data.user.errors)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: response.data.user.errors
      });
    }

    res.json({
      success: true,
      user: response.data.user,
      token: response.data.user_api_key
    });
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    res.status(400).json({
      success: false,
      message: error.response?.data?.errors || 'Registration failed'
    });
  }
});

// Verify token route
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // Verify token with Discourse
    const response = await axios.get(`${DISCOURSE_URL}/session/current.json`, {
      headers: {
        'User-Api-Key': token,
        'Api-Key': DISCOURSE_API_KEY,
        'Api-Username': DISCOURSE_API_USERNAME
      }
    });

    res.json({
      success: true,
      user: response.data.current_user
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// User creation/update route
router.post('/user', async (req, res) => {
  try {
    const { uid, email, name, photoURL, username } = req.body;
    
    if (!email || !name || !uid) {
      return res.status(400).json({
        success: false,
        message: 'Email, name, and uid are required'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ uid });
    
    if (user) {
      return res.json({ 
        success: true, 
        user 
      });
    }

    // Create new user
    user = new User({
      uid,
      email,
      name,
      photoURL,
      username: username || email.split('@')[0],
      communities: [],
      createdCommunities: []
    });

    await user.save();
    
    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
});

module.exports = router; 