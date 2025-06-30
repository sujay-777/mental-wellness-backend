const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'bot', 'therapist'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    intent: {
      type: String,
      enum: ['greeting', 'anxiety', 'stress', 'depression', 'sleep', 'general', 'escalation'],
      default: 'general'
    },
    requiresEscalation: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['active', 'escalated', 'resolved'],
    default: 'active'
  },
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
chatLogSchema.index({ userId: 1, lastMessageAt: -1 });
chatLogSchema.index({ status: 1, requiresEscalation: 1 });

const ChatLog = mongoose.model('ChatLog', chatLogSchema);

module.exports = ChatLog; 