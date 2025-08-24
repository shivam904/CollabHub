import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  sender: {
    userId: { type: String, required: true }, // Firebase UID
    name: { type: String, required: true },
    email: { type: String },
    profilePhoto: { type: String },
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying
messageSchema.index({ projectId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
