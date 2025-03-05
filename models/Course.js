const courseSchema = new mongoose.Schema({
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Community'
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  thumbnail: String,
  createdBy: {
    uid: String,
    email: String
  },
  sections: [{
    title: String,
    videos: [{
      title: String,
      url: String,
      duration: String
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}); 