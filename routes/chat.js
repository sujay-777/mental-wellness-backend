const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ChatMessage = require('../models/ChatMessage');

// @route   POST /api/chat/send
// @desc    Send a message between user and therapist
// @access  Private
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, receiverRole, message } = req.body;
    if (!receiverId || !receiverRole || !message) {
      return res.status(400).json({ error: 'receiverId, receiverRole, and message are required' });
    }
    // Determine sender role
    let senderRole = 'user';
    if (req.user && req.user.role === 'therapist') senderRole = 'therapist';
    const chatMessage = new ChatMessage({
      sender: { id: req.user._id, role: senderRole },
      receiver: { id: receiverId, role: receiverRole },
      message
    });
    await chatMessage.save();
    res.json({ success: true, chatMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/chat/conversation
// @desc    Get conversation between user and therapist
// @access  Private
router.get('/conversation', auth, async (req, res) => {
  try {
    const { userId, therapistId } = req.query;
    if (!userId || !therapistId) {
      return res.status(400).json({ error: 'userId and therapistId are required' });
    }
    // Find all messages between the user and therapist (both directions)
    const messages = await ChatMessage.find({
      $or: [
        { 'sender.id': userId, 'receiver.id': therapistId },
        { 'sender.id': therapistId, 'receiver.id': userId }
      ]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 