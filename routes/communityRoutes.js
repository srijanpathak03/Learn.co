const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getCollections } = require('../mongoConnection');
const { ObjectId } = require('mongodb');
const axios = require('axios');
const crypto = require('crypto');
const DiscourseUserMapping = require('../models/DiscourseUserMapping');
const User = require('../models/User'); // Add this at the top with other imports

// Add these constants at the top of your file
const DISCOURSE_URL = process.env.DISCOURSE_URL;
const DISCOURSE_API_KEY = process.env.DISCOURSE_API_KEY;
const DISCOURSE_API_USERNAME = 'system';

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

// Register user on Discourse
router.post('/discourse/register', async (req, res) => {
  try {
    const { communityId, user } = req.body;
    const { communityCollection } = await getCollections();
    
    // Get community details to get Discourse URL
    const community = await communityCollection.findOne({ 
      _id: new ObjectId(communityId) 
    });

    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    // Create consistent username
    const baseUsername = user.email.split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');

    const timestamp = Date.now().toString(36);
    const username = `${baseUsername}_${timestamp}`.substring(0, 20);

    const password = Array.from(crypto.randomBytes(16))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 20);

    // Add logging for Discourse API request
    console.log('Making Discourse API request:', {
      url: `${community.discourse_url}/users.json`,
      username,
      email: user.email,
      name: user.displayName || user.name
    });

    // Create the user
    const createResponse = await axios.post(
      `${community.discourse_url}/users.json`,
      {
        name: user.displayName || user.name,
        email: user.email,
        password: password,
        username: username,
        active: true,
        approved: true
      },
      {
        headers: {
          'Api-Key': process.env.DISCOURSE_API_KEY,
          'Api-Username': 'system',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Create user response:', createResponse.data);

    if (!createResponse.data.success) {
      throw new Error(createResponse.data.message || 'Failed to create Discourse user');
    }

    // Get user details using the username
    console.log('Fetching user details for:', username);
    const userResponse = await axios.get(
      `${community.discourse_url}/users/${username}.json`,
      {
        headers: {
          'Api-Key': process.env.DISCOURSE_API_KEY,
          'Api-Username': 'system'
        }
      }
    );

    console.log('User details response:', userResponse.data);

    if (!userResponse.data.user || !userResponse.data.user.id) {
      throw new Error('Failed to fetch user details from Discourse');
    }

    const discourseUserId = userResponse.data.user.id;

    // Create the mapping with required fields
    const mappingData = {
      userId: user.uid,
      communityId: community._id,
      discourseUserId: discourseUserId,
      discourseUsername: username,
      discoursePassword: password
    };

    console.log('Creating DiscourseUserMapping:', {
      userId: mappingData.userId,
      communityId: mappingData.communityId,
      discourseUserId: mappingData.discourseUserId,
      discourseUsername: mappingData.discourseUsername
    });

    const mapping = new DiscourseUserMapping(mappingData);
    await mapping.save();

    // Update user's communities array
    await User.findOneAndUpdate(
      { email: user.email },
      { $addToSet: { communities: community._id } }
    );

    // Update community's member count
    await communityCollection.updateOne(
      { _id: community._id },
      { $inc: { members_count: 1 } }
    );

    res.json({
      success: true,
      discourse_user_id: discourseUserId,
      discourse_username: username,
      mapping_id: mapping._id,
      active: createResponse.data.active,
      message: createResponse.data.message
    });

  } catch (error) {
    console.error('Error in Discourse registration process:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    // If there's a validation error from Discourse
    if (error.response?.data?.errors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.response.data.errors
      });
    }

    // For other errors
    res.status(500).json({ 
      success: false, 
      message: error.message,
      details: error.response?.data
    });
  }
});

// Update this route
router.get('/discourse/user/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.query.userId; // Get userId from query params instead of req.user

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find the mapping
    const mapping = await DiscourseUserMapping.findOne({
      userId,
      communityId: new ObjectId(communityId)
    });

    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'User not registered with this community'
      });
    }

    // Get the community to get the Discourse URL
    const { communityCollection } = await getCollections();
    const community = await communityCollection.findOne({
      _id: new ObjectId(communityId)
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Get fresh Discourse user details
    const discourseResponse = await axios.get(
      `${community.discourse_url}/users/${mapping.discourseUsername}.json`,
      {
        headers: {
          'Api-Key': process.env.DISCOURSE_API_KEY,
          'Api-Username': 'system'
        }
      }
    );

    res.json({
      success: true,
      discourseUser: {
        id: mapping.discourseUserId,
        username: mapping.discourseUsername,
        ...discourseResponse.data.user
      }
    });
  } catch (error) {
    console.error('Error fetching discourse user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching discourse user'
    });
  }
});

// Add this new endpoint
router.post('/community/join', async (req, res) => {
  try {
    const { communityId, userId, user } = req.body;
    const { communityCollection } = await getCollections();

    console.log('Join request received:', { communityId, userId, user });

    // Check if community exists
    const community = await communityCollection.findOne({ 
      _id: new ObjectId(communityId) 
    });

    if (!community) {
      return res.status(404).json({ 
        success: false, 
        message: 'Community not found' 
      });
    }

    // Get the discourse mapping
    const mapping = await DiscourseUserMapping.findOne({
      userId,
      communityId: new ObjectId(communityId)
    });

    if (!mapping) {
      console.log('No discourse mapping found');
      return res.status(400).json({
        success: false,
        message: 'Discourse user mapping not found'
      });
    }

    console.log('Found discourse mapping:', mapping);

    // Try to find existing user by uid (not email)
    let dbUser = await User.findOne({ uid: userId });

    try {
      if (dbUser) {
        console.log('Updating existing user');
        // Update existing user
        dbUser = await User.findOneAndUpdate(
          { uid: userId },
          { 
            $addToSet: { 
              communities: new ObjectId(communityId),
              discourseUsers: {
                communityId: new ObjectId(communityId),
                discourseUserId: mapping.discourseUserId,
                discourseUsername: mapping.discourseUsername
              }
            }
          },
          { new: true }
        );
      } else {
        console.log('Creating new user');
        // Create new user
        dbUser = new User({
          uid: userId,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          communities: [new ObjectId(communityId)],
          discourseUsers: [{
            communityId: new ObjectId(communityId),
            discourseUserId: mapping.discourseUserId,
            discourseUsername: mapping.discourseUsername
          }]
        });
        await dbUser.save();
      }

      // Update community's member count
      await communityCollection.updateOne(
        { _id: new ObjectId(communityId) },
        { $inc: { members_count: 1 } }
      );

      // Get fresh Discourse user details
      const discourseResponse = await axios.get(
        `${community.discourse_url}/users/${mapping.discourseUsername}.json`,
        {
          headers: {
            'Api-Key': process.env.DISCOURSE_API_KEY,
            'Api-Username': 'system'
          }
        }
      );

      res.json({
        success: true,
        message: 'Successfully joined community',
        discourseUser: discourseResponse.data.user,
        mapping: {
          discourseUserId: mapping.discourseUserId,
          discourseUsername: mapping.discourseUsername
        },
        user: dbUser
      });
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('Error in join process:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to join community',
      details: error.response?.data || error
    });
  }
});

module.exports = router;
