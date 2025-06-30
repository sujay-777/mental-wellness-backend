const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
// const Chatbot = require('../../chatbot/chatbot');
const Chatbot = require('../chatbot')
const ChatLog = require('../models/ChatLog');
const adminAuth = require('../middleware/adminAuth');
const ChatMessage = require('../models/ChatMessage');

const chatbot = new Chatbot();

// @route   POST api/chatbot/message
// @desc    Send message to chatbot
// @access  Private
router.post('/message', auth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Process message with chatbot (await the async method)
    const result = await chatbot.processMessage(message);
    
    // Ensure we have a valid response
    if (!result || !result.response) {
      console.error('Invalid chatbot response:', result);
      return res.status(500).json({ error: 'Chatbot error' });
    }

    // Find or create chat log
    let chatLog = await ChatLog.findOne({ 
      userId: req.user._id,
      status: 'active'
    });

    if (!chatLog) {
      chatLog = new ChatLog({
        userId: req.user._id,
        messages: []
      });
    }

    // Add user message
    chatLog.messages.push({
      role: 'user',
      content: message,
      intent: result.intent || 'general',
      requiresEscalation: result.requiresEscalation || false
    });

    // Add bot response
    chatLog.messages.push({
      role: 'bot',
      content: result.response,
      intent: result.intent || 'general'
    });

    // Update chat log status if escalation is needed
    if (result.requiresEscalation) {
      chatLog.status = 'escalated';
    }

    chatLog.lastMessageAt = new Date();
    await chatLog.save();

    res.json({
      response: result.response,
      requiresEscalation: result.requiresEscalation
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET api/chatbot/history
// @desc    Get chat history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const chatLogs = await ChatLog.find({ userId: req.user._id })
      .sort({ lastMessageAt: -1 })
      .limit(10);

    res.json(chatLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET api/chatbot/logs
// @desc    Get all chat logs (therapist/admin only)
// @access  Private
router.get('/logs', auth, async (req, res) => {
  try {
    // Only allow therapists or admins
    if (req.user.role !== 'therapist' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const chatLogs = await ChatLog.find({})
      .populate('userId', 'name email')
      .sort({ lastMessageAt: -1 })
      .limit(50); // limit for performance
    res.json(chatLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Delete chat log
router.delete('/logs/:id', adminAuth, async (req, res) => {
  const log = await ChatLog.findByIdAndDelete(req.params.id);
  if (!log) return res.status(404).json({ message: 'Chat log not found' });
  res.json({ message: 'Chat log deleted' });
});

module.exports = router; 
