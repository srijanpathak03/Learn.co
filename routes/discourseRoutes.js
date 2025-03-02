const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getCollections } = require('../mongoConnection');
const { ObjectId } = require('mongodb');
const axios = require('axios');
const crypto = require('crypto');
const DiscourseUserMapping = require('../models/DiscourseUserMapping');
const User = require('../models/User');
const querystring = require('querystring');

// Register user on Discourse
router.post('/register', async (req, res) => {
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

    // Since the user_id is not in the response, we need to fetch it using the admin API
    try {
      const adminUserResponse = await axios.get(
        `${community.discourse_url}/admin/users/list/active.json?filter=${username}`,
        {
          headers: {
            'Api-Key': process.env.DISCOURSE_API_KEY,
            'Api-Username': 'system'
          }
        }
      );

      console.log('Admin user search response:', adminUserResponse.data);
      
      // Find the user in the response
      const discourseUser = adminUserResponse.data.find(u => u.username === username);
      
      if (!discourseUser) {
        throw new Error('Could not find created user in admin API');
      }
      
      const discourseUserId = discourseUser.id;

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
    } catch (adminError) {
      console.error('Error fetching user from admin API:', adminError);
      
      // As a fallback, create a mapping with a placeholder ID that we'll update later
      const mappingData = {
        userId: user.uid,
        communityId: community._id,
        discourseUserId: -1, // Placeholder ID
        discourseUsername: username,
        discoursePassword: password
      };

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
        discourse_username: username,
        mapping_id: mapping._id,
        active: createResponse.data.active,
        message: createResponse.data.message,
        note: "User created but ID not retrieved. Will be updated on next login."
      });
    }

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

// Get discourse user
router.get('/user/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.query.userId;

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

// SSO login
router.get('/sso/:communityId', async (req, res) => {
  try {
    const { sso, sig } = req.query;
    const { communityId } = req.params;
    
    // Validate required parameters
    if (!sso || !sig) {
      return res.status(400).json({ success: false, message: 'Missing SSO parameters' });
    }

    // Get community details
    const { communityCollection } = await getCollections();
    const community = await communityCollection.findOne({ 
      _id: new ObjectId(communityId) 
    });

    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    // Get the SSO secret from environment variables
    const discourseSecret = process.env.DISCOURSE_SSO_SECRET || 'thisisassosecretforautomiviecreator';
    
    // Validate SSO signature
    const expectedSig = crypto.createHmac('sha256', discourseSecret).update(sso).digest('hex');

    if (sig !== expectedSig) {
      return res.status(400).json({ success: false, message: 'Invalid SSO signature' });
    }

    // Decode the SSO payload
    const decodedSSO = querystring.parse(Buffer.from(sso, 'base64').toString('utf8'));
    const nonce = decodedSSO.nonce;
    const returnSsoUrl = decodedSSO.return_sso_url;
    
    // Get user from session or request
    const userId = req.session?.userId || req.query.userId;
    
    if (!userId) {
      // Redirect to login page if user is not logged in
      return res.redirect(`/login?redirect=/discourse/sso/${communityId}?sso=${sso}&sig=${sig}`);
    }

    // Get user details
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get user mapping in Discourse
    const mapping = await DiscourseUserMapping.findOne({
      userId,
      communityId: new ObjectId(communityId)
    });

    if (!mapping) {
      return res.status(404).json({ success: false, message: 'User not registered with this community' });
    }

    // Generate SSO payload
    const userParams = {
      nonce,
      email: user.email,
      external_id: userId,
      username: mapping.discourseUsername,
      name: user.name || user.displayName,
      avatar_url: user.photoURL,
      admin: false,
      moderator: false
    };

    const payload = Buffer.from(querystring.stringify(userParams)).toString('base64');
    const newSig = crypto.createHmac('sha256', discourseSecret).update(payload).digest('hex');

    // Redirect user to Discourse with signed payload
    const redirectUrl = `${returnSsoUrl}?sso=${encodeURIComponent(payload)}&sig=${encodeURIComponent(newSig)}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Error in SSO login:', error);
    res.status(500).json({ success: false, message: 'SSO login failed', error: error.message });
  }
});

// Initiate SSO
router.get('/initiate-sso/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    const { communityCollection } = await getCollections();
    const community = await communityCollection.findOne({ _id: new ObjectId(communityId) });

    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }
    
    req.session = req.session || {};
    req.session.userId = userId;

    // Check if user has a mapping for this community
    const mapping = await DiscourseUserMapping.findOne({
      userId,
      communityId: new ObjectId(communityId)
    });

    if (!mapping) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not registered with this community. Please join the community first.' 
      });
    }

    // Generate the redirect URL to Discourse
    const redirectUrl = `${community.discourse_url}/session/sso_login`;
    
    // Return the redirect URL to the client
    res.json({ 
      success: true, 
      redirect_url: redirectUrl 
    });

  } catch (error) {
    console.error('Error initiating SSO:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initiate SSO',
      error: error.message 
    });
  }
});

module.exports = router; 