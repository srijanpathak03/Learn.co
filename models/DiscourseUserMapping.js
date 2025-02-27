const mongoose = require('mongoose');

const discourseUserMappingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  discourseUserId: { type: Number, required: true },
  discourseUsername: { type: String, required: true },
  discoursePassword: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Add index for quick lookups
discourseUserMappingSchema.index({ userId: 1, communityId: 1 }, { unique: true });

module.exports = mongoose.model('DiscourseUserMapping', discourseUserMappingSchema); 