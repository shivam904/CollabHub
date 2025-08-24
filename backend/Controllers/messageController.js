import Message from '../models/Message.js';
import Project from '../models/Project.js';

// Get messages for a project
export const getProjectMessages = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.uid; // From Firebase token

    console.log('📖 Loading messages:', { projectId, userId, page, limit });

    // Verify user has access to project
    const project = await Project.findById(projectId);
    if (!project || !project.hasPermission(userId, 'read')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to project messages'
      });
    }

    // Get messages with pagination
    const messages = await Message.find({ projectId })
      .sort({ createdAt: -1 }) // Most recent first
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Reverse to show oldest first for chat display
    const reversedMessages = messages.reverse();

    console.log(`✅ Loaded ${reversedMessages.length} messages for project ${projectId}`);

    res.status(200).json({
      success: true,
      data: {
        messages: reversedMessages,
        currentPage: parseInt(page),
        totalPages: Math.ceil(await Message.countDocuments({ projectId }) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;
    const userId = req.user.uid; // From Firebase token
    const userName = req.user.name || req.user.displayName || req.user.email;
    const userEmail = req.user.email;
    const userPhoto = req.user.picture;

    console.log('💬 Sending message:', { projectId, userId, userName, messageLength: message?.length });

    // Validate message
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    if (message.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message too long (max 1000 characters)'
      });
    }

    // Verify user has access to project (read access is sufficient for chat)
    const project = await Project.findById(projectId);
    if (!project || !project.hasPermission(userId, 'read')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to send message'
      });
    }

    // Create message
    const newMessage = await Message.create({
      projectId,
      sender: {
        userId,
        name: userName,
        email: userEmail,
        profilePhoto: userPhoto
      },
      message: message.trim()
    });

    console.log('✅ Message created successfully:', newMessage._id);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: newMessage
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};