const express = require('express');
const router = express.Router();
const { getCollections } = require('../mongoConnection');
const { ObjectId } = require('mongodb');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Get all courses for a community
router.get('/communities/:id/courses', async (req, res) => {
  try {
    const { courseCollection } = await getCollections();
    const courses = await courseCollection
      .find({ communityId: new ObjectId(req.params.id) })
      .toArray();
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Error fetching courses' });
  }
});

// Create a new course
router.post('/communities/:id/courses', async (req, res) => {
  try {
    const { courseCollection } = await getCollections();
    const course = {
      ...req.body,
      communityId: new ObjectId(req.params.id),
      createdAt: new Date()
    };
    const result = await courseCollection.insertOne(course);
    res.status(201).json({ ...course, _id: result.insertedId });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Error creating course' });
  }
});

// Update a course
router.put('/communities/:communityId/courses/:courseId', async (req, res) => {
  try {
    const { courseCollection } = await getCollections();
    const courseId = new ObjectId(req.params.courseId);
    
    const result = await courseCollection.updateOne(
      { _id: courseId },
      { $set: { ...req.body, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Error updating course' });
  }
});

// Delete a course
router.delete('/communities/:communityId/courses/:courseId', async (req, res) => {
  try {
    const { courseCollection } = await getCollections();
    const courseId = new ObjectId(req.params.courseId);
    
    const result = await courseCollection.deleteOne({ _id: courseId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Error deleting course' });
  }
});

// Upload image to Cloudinary
router.post('/upload-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'course-thumbnails'
    });

    // Remove the temporary file
    fs.unlinkSync(req.file.path);

    res.json({ 
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    // Clean up the temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error uploading image' });
  }
});

// Upload video to Cloudinary
router.post('/upload-video', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'video',
      folder: 'course-videos'
    });

    // Remove the temporary file
    fs.unlinkSync(req.file.path);

    res.json({ 
      url: result.secure_url,
      public_id: result.public_id,
      duration: result.duration
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    // Clean up the temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error uploading video' });
  }
});

module.exports = router; 