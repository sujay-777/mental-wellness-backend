const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: true
  },
  startDateTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  sessionType: {
    type: String,
    enum: ['video', 'audio', 'chat'],
    required: true
  },
  notes: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'refunded'],
    default: 'pending'
  },
  // Reminder tracking
  remindersSent: {
    appointmentReminder24h: { type: Boolean, default: false },
    appointmentReminder1h: { type: Boolean, default: false },
    appointmentReminder15min: { type: Boolean, default: false }
  },
  reminderHistory: [{
    type: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    success: { type: Boolean, required: true },
    error: { type: String }
  }]
}, {
  timestamps: true
});

// Index for efficient querying
appointmentSchema.index({ userId: 1, startDateTime: 1 });
appointmentSchema.index({ therapistId: 1, startDateTime: 1 });
appointmentSchema.index({ startDateTime: 1, status: 1 }); // For reminder queries

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment; 