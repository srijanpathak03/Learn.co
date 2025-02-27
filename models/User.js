const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: String,
  photoURL: String,
  username: String,
  communities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
  createdCommunities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
  createdAt: { type: Date, default: Date.now },
  discourseUsers: [{
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
    discourseUserId: Number,
    discourseUsername: String
  }]
});

// Drop any existing indexes and create only the ones we want
userSchema.index({ uid: 1 }, { unique: true });
userSchema.index({ uid: 1, 'discourseUsers.communityId': 1 });

// Add this to drop the email unique index if it exists
userSchema.pre('save', async function() {
  try {
    await mongoose.model('User').collection.dropIndex('email_1');
  } catch (error) {
    // Index might not exist, that's okay
  }
});

const User = mongoose.model('User', userSchema);

// Drop the email index when the model is compiled
(async () => {
  try {
    await User.collection.dropIndex('email_1');
  } catch (error) {
    // Index might not exist, that's okay
  }
})();

module.exports = User; 