import mongoose from 'mongoose';

const ProjectInviteSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
  createdBy: { type: String, required: true }, // uid of inviter
  usedBy: { type: String, default: null }, // uid of user who used the invite
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 3) } // 3 days
});

const ProjectInvite = mongoose.models.ProjectInvite || mongoose.model('ProjectInvite', ProjectInviteSchema);
export default ProjectInvite; 