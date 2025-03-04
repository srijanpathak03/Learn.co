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
    
    // Check if user is already registered
    const existingMapping = await DiscourseUserMapping.findOne({
      userId: user.uid,
      communityId: new ObjectId(communityId)
    });

    if (existingMapping) {
      return res.json({
        success: true,
        discourseUser: {
          id: existingMapping.discourseUserId,
          username: existingMapping.discourseUsername
        }
      });
    }

    // If not registered, continue with registration
    const { communityCollection } = await getCollections();
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

    // Create the user in Discourse
    const createResponse = await axios.post(
      `${community.discourse_url}/users.json`,
      {
        name: user.displayName || user.name,
        email: user.email,
        password: crypto.randomBytes(16).toString('hex'),
        username: username,
        active: true,
        approved: true
      },
      {
        headers: {
          'Api-Key': process.env.DISCOURSE_API_KEY,
          'Api-Username': 'system'
        }
      }
    );

    if (!createResponse.data.success) {
      throw new Error(createResponse.data.message || 'Failed to create Discourse user');
    }

    // Get the user ID from admin API
    const adminUserResponse = await axios.get(
      `${community.discourse_url}/admin/users/list/active.json?filter=${username}`,
      {
        headers: {
          'Api-Key': process.env.DISCOURSE_API_KEY,
          'Api-Username': 'system'
        }
      }
    );

    const discourseUser = adminUserResponse.data.find(u => u.username === username);
    
    if (!discourseUser) {
      throw new Error('Could not find created user in admin API');
    }

    // Create the mapping
    const mapping = new DiscourseUserMapping({
      userId: user.uid,
      communityId: community._id,
      discourseUserId: discourseUser.id,
      discourseUsername: username
    });

    await mapping.save();

    res.json({
      success: true,
      discourseUser: {
        id: discourseUser.id,
        username: username
      }
    });

  } catch (error) {
    console.error('Error in Discourse registration:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
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
          'Api-Username': mapping.discourseUsername
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
    // const { communityId } = req.params;
    const communityId = new mongoose.Types.ObjectId('67c06f258d237ac66f25c765');
    console.log("SSO",sso)
    console.log("SIG:",sig)
    console.log('Received communityId:', communityId);

    if (!sso || !sig) {
      return res.status(400).json({ success: false, message: 'Missing SSO parameters' });
    }
    const { communityCollection } = await getCollections();
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid community ID format' 
      });
    }
    
    const community = await communityCollection.findOne({ 
      _id: new ObjectId(communityId) 
    });

    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }
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
    // const userId = req.session?.userId || req.query.userId;
    const userId = 'gkLbkS5zXDMoKRMSng6jJ0oCu8Y2';
    
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
    // Validate communityId format before creating ObjectId
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
    // const redirectUrl = `${returnSsoUrl}?sso=${encodeURIComponent(payload)}&sig=${encodeURIComponent(newSig)}`;
    // const redirectUrl = `http://forum.local/session/sso_login?sso=${encodeURIComponent(payload)}&sig=${encodeURIComponent(newSig)}`;
    const redirectUrl = `${community.discourse_url}/session/sso_login?sso=${encodeURIComponent(payload)}&sig=${encodeURIComponent(newSig)}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Error in SSO login:', error);
    res.status(500).json({ success: false, message: 'SSO login failed', error: error.message });
  }
});

// // Initiate SSO
// router.get('/initiate-sso/:communityId', async (req, res) => {
//   try {
//     // const { communityId } = req.params;
//     const communityId = new mongoose.Types.ObjectId('67c06f258d237ac66f25c765');

//     console.log("Using hardcoded communityId:", communityId);

//     const { userId } = req.query;

//     if (!userId) {
//       return res.status(400).json({ success: false, message: 'User ID is required' });
//     }
    
//     // Validate communityId format before creating ObjectId
//     if (!mongoose.Types.ObjectId.isValid(communityId)) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Invalid community ID format' 
//       });
//     }
    
//     const { communityCollection } = await getCollections();
//     const community = await communityCollection.findOne({ _id: new ObjectId(communityId) });

//     if (!community) {
//       return res.status(404).json({ success: false, message: 'Community not found' });
//     }
    
//     req.session = req.session || {};
//     req.session.userId = userId;

//     // Check if user has a mapping for this community
//     const mapping = await DiscourseUserMapping.findOne({
//       userId,
//       communityId: new ObjectId(communityId)
//     });

//     if (!mapping) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'User not registered with this community. Please join the community first.' 
//       });
//     }

//     // Create a nonce (random value)
//     const nonce = crypto.randomBytes(16).toString('hex');
    
//     // Create the return URL (your server endpoint that will handle the SSO callback)
//     const returnUrl = `${req.protocol}://${req.get('host')}/discourse/sso/${communityId}`;
    
//     // Create the payload
//     const payload = {
//       nonce: nonce,
//       return_sso_url: returnUrl,
//       external_id: userId
//     };
    
//     // Base64 encode and URL encode the payload
//     const base64Payload = Buffer.from(querystring.stringify(payload)).toString('base64');
    
//     // Get the SSO secret from environment variables
//     const discourseSecret = process.env.DISCOURSE_SSO_SECRET || 'thisisassosecretforautomiviecreator';
    
//     // Create the signature
//     const sig = crypto.createHmac('sha256', discourseSecret).update(base64Payload).digest('hex');
    
//     // Generate the redirect URL to Discourse with SSO parameters
//     const redirectUrl = `${community.discourse_url}/session/sso_login?sso=${encodeURIComponent(base64Payload)}&sig=${sig}`;
    
//     // Return the redirect URL to the client
//     res.json({ 
//       success: true, 
//       redirect_url: redirectUrl 
//     });

//   } catch (error) {
//     console.error('Error initiating SSO:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Failed to initiate SSO',
//       error: error.message 
//     });
//   }
// });

module.exports = router; 