import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true }, // Firebase UID - index defined separately
  email: { type: String, required: true }, // Email - index defined separately
  displayName: { type: String },
  bio: { type: String, default: '' },
  location: { type: String, default: '' },
  website: { type: String, default: '' },
  profilePhoto: { type: String }, // URL to profile photo
  
  // Performance tracking
  lastActive: { type: Date, default: Date.now },
  loginCount: { type: Number, default: 0 },
  
  // Preferences for optimization
  preferences: {
    theme: { type: String, default: 'light' },
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  // Optimize JSON output
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Strategic indexes for ultra-fast queries
UserSchema.index({ uid: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ lastActive: -1 }); // For recent users queries
UserSchema.index({ displayName: 'text' }); // Text search on display name
UserSchema.index({ createdAt: -1 }); // For newest users
UserSchema.index({ loginCount: -1 }); // For most active users

// Compound indexes for complex queries
UserSchema.index({ lastActive: -1, loginCount: -1 }); // Active and frequent users

// Instance methods for performance
UserSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  this.loginCount += 1;
  return this.save();
};

// Static methods for optimized queries
UserSchema.statics.findActiveUsers = function(limit = 10) {
  return this.find({})
    .sort({ lastActive: -1 })
    .limit(limit)
    .select('uid email displayName profilePhoto lastActive')
    .lean(); // Use lean() for better performance
};

UserSchema.statics.searchUsers = function(query, limit = 10) {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .select('uid email displayName profilePhoto')
    .lean();
};

const User = mongoose.models.User || mongoose.model('User', UserSchema); 
export default User;