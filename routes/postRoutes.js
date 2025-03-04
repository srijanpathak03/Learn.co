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

// Create a new topic
router.post('/create-topic', async (req, res) => {
    try {
        const { title, raw, category_id } = req.body;
        const userMapping = await DiscourseUserMapping.findOne({ userId: req.user._id });
        
        if (!userMapping) {
            return res.status(404).json({ error: 'Discourse user mapping not found' });
        }

        const response = await axios.post(
            `${process.env.DISCOURSE_URL}/posts.json`,
            {
                title,
                raw,
                category: category_id,
            },
            {
                headers: {
                    'Api-Key': process.env.DISCOURSE_API_KEY,
                    'Api-Username': userMapping.discourse_username,
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error creating topic:', error);
        res.status(500).json({ error: 'Failed to create topic' });
    }
});

// Create a reply to a topic
router.post('/create-reply', async (req, res) => {
    try {
        const { topic_id, raw } = req.body;
        const userMapping = await DiscourseUserMapping.findOne({ userId: req.user._id });

        if (!userMapping) {
            return res.status(404).json({ error: 'Discourse user mapping not found' });
        }

        const response = await axios.post(
            `${process.env.DISCOURSE_URL}/posts.json`,
            {
                topic_id,
                raw,
            },
            {
                headers: {
                    'Api-Key': process.env.DISCOURSE_API_KEY,
                    'Api-Username': userMapping.discourse_username,
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error creating reply:', error);
        res.status(500).json({ error: 'Failed to create reply' });
    }
});

// Like a post
router.post('/like-post/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userMapping = await DiscourseUserMapping.findOne({ userId: req.user._id });

        if (!userMapping) {
            return res.status(404).json({ error: 'Discourse user mapping not found' });
        }

        const response = await axios.post(
            `${process.env.DISCOURSE_URL}/post_actions.json`,
            {
                id,
                post_action_type_id: 2, // 2 is the action type for "like"
            },
            {
                headers: {
                    'Api-Key': process.env.DISCOURSE_API_KEY,
                    'Api-Username': userMapping.discourse_username,
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ error: 'Failed to like post' });
    }
});

module.exports = router;
