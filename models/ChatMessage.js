const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sender: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ['user', 'therapist'], required: true }
  },
  receiver: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ['user', 'therapist'], required: true }
  },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema); 