const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getCollections } = require('../mongoConnection');
const { ObjectId } = require('mongodb');
const axios = require('axios');

// Add these constants at the top of your file
const DISCOURSE_URL = process.env.DISCOURSE_URL;
const DISCOURSE_API_KEY = process.env.DISCOURSE_API_KEY;
const DISCOURSE_API_USERNAME = 'system';

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  photoURL: String,
  username: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  communities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
  createdCommunities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }]
});

const User = mongoose.model('User', userSchema);

// GET route to fetch all active communities
router.get("/get-communities", async (req, res) => {
    try {
        const { communityCollection } = await getCollections();
        
        const allCommunities = await communityCollection
            .find({ status: 'active' })
            .sort({ created_at: -1 })
            .toArray();

        res.json(allCommunities);
    } catch (error) {
        console.error('Error fetching communities:', error);
        res.status(500).json({
            message: "Error fetching communities",
            status: "error",
        });
    }
});

// GET route to fetch a specific community by ID
router.get("/community/:id", async (req, res) => {
    try {
        const { communityCollection } = await getCollections();
        const communityId = req.params.id;

        const community = await communityCollection.findOne({
            _id: new ObjectId(communityId)
        });

        if (!community) {
            return res.status(404).json({
                message: "Community not found",
                status: "fail",
            });
        }

        res.json(community);
    } catch (error) {
        console.error('Error fetching community:', error);
        res.status(500).json({
            message: "Error fetching community",
            status: "error",
        });
    }
});

// POST route to create a new community
router.post("/create-community", async (req, res) => {
    try {
        const { communityCollection } = await getCollections();
        const {
            name,
            description,
            category,
            discourse_url,
            creator
        } = req.body;

        // Validate required fields
        if (!name || !description || !category || !discourse_url || !creator) {
            return res.status(400).json({
                message: "Missing required fields",
                status: "fail",
            });
        }

        const newCommunity = {
            name,
            description,
            category,
            discourse_url,
            creator,
            members_count: 0,
            created_at: new Date(),
            status: 'active',
            slug: name.toLowerCase().replace(/\s+/g, '-')
        };

        const result = await communityCollection.insertOne(newCommunity);

        res.status(201).json({
            message: "Community created successfully",
            status: "success",
            communityId: result.insertedId,
        });
    } catch (error) {
        console.error('Error creating community:', error);
        res.status(500).json({
            message: "Error creating community",
            status: "error",
        });
    }
});


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

// Add a new endpoint to verify token
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

router.post('/user', async (req, res) => {
  try {
    const { email, name, photoURL, username } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      return res.json({ 
        success: true, 
        user 
      });
    }

    // Create new user
    user = new User({
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
