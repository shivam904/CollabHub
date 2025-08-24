import User from "../models/User.js";

// Create user profile (for first login)
const createUser = async (req, res) => {
  try {
    const { uid, email, displayName, profilePhoto } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ uid });
    if (user) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }
    
    // Create new user
    user = await User.create({ uid, email, displayName, profilePhoto });
    console.log('Created new user:', user.uid);
    
    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get user profile by Firebase UID
const getUserProfile = async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error getting user profile:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Update user profile by Firebase UID (creates user if not exists)
const updateUserProfile = async (req, res) => {
  try {
    const { uid } = req.params;
    const { displayName, bio, location, website, profilePhoto } = req.body;
    
    // Try to find and update existing user
    let user = await User.findOneAndUpdate(
      { uid },
      { $set: { displayName, bio, location, website, profilePhoto } },
      { new: true, runValidators: true }
    );
    
    // If user doesn't exist, create them
    if (!user) {
      user = await User.create({ 
        uid, 
        displayName, 
        bio, 
        location, 
        website, 
        profilePhoto 
      });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Helper: Create user if not exists (called on first login)
const createUserIfNotExists = async ({ uid, email, displayName, profilePhoto }) => {
  let user = await User.findOne({ uid });
  if (!user) {
    user = await User.create({ uid, email, displayName, profilePhoto });
  }
  return user;
};

export { createUser, getUserProfile, updateUserProfile, createUserIfNotExists };