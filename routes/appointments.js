const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Appointment = require('../models/Appointment');
const { sendAppointmentConfirmation, sendAppointmentCancellation } = require('../services/emailService');

// Get all appointments for the logged-in user or therapist
router.get('/', auth, async function(req, res) {
  try {
    console.log('Appointments query:', { userId: req.user._id, therapistId: req.user._id });
    console.log('User role:', req.user.role);
    console.log('User ID:', req.user._id);
    
    let query = {};
    if (req.user.role === 'therapist') {
      // Therapist: show appointments assigned to them
      query.therapistId = req.user._id;
    } else {
      // User: show their appointments
      query.userId = req.user._id;
    }
    
    const appointments = await Appointment.find(query)
      .populate('therapistId', 'name specialization')
      .populate('userId', 'name email')
      .sort({ startDateTime: 1 });
    
    console.log('Found appointments:', appointments.length);
    res.json(appointments);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new appointment
router.post('/', auth, async function(req, res) {
  try {
    const { therapistId, startDateTime, sessionType, notes } = req.body;

    const appointment = new Appointment({
      userId: req.user._id,
      therapistId,
      startDateTime,
      sessionType,
      notes,
      status: 'pending'
    });

    await appointment.save();
    
    // Populate user and therapist data for email
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('userId', 'name email')
      .populate('therapistId', 'name specialization');
    
    // Send confirmation email to user
    try {
      await sendAppointmentConfirmation(
        populatedAppointment,
        populatedAppointment.userId,
        populatedAppointment.therapistId
      );
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the request if email fails
    }
    
    res.status(201).json(appointment);
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an appointment
router.put('/:id', auth, async function(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Authorization: user or therapist
    if (req.user.role === 'user' && appointment.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'therapist' && appointment.therapistId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { startDateTime, sessionType, notes, status } = req.body;
    
    appointment.startDateTime = startDateTime || appointment.startDateTime;
    appointment.sessionType = sessionType || appointment.sessionType;
    appointment.notes = notes || appointment.notes;
    appointment.status = status || appointment.status;

    await appointment.save();
    res.json(appointment);
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel an appointment
router.delete('/:id', auth, async function(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Authorization: user or therapist
    if (req.user.role === 'user' && appointment.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'therapist' && appointment.therapistId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Populate user and therapist data for email before deleting
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('userId', 'name email')
      .populate('therapistId', 'name specialization');

    await appointment.deleteOne();

    // Send cancellation email to user
    try {
      await sendAppointmentCancellation(
        populatedAppointment,
        populatedAppointment.userId,
        populatedAppointment.therapistId
      );
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    console.error('Error cancelling appointment:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept an appointment
router.put('/:id/accept', auth, async function(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (req.user.role !== 'therapist' || appointment.therapistId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    appointment.status = 'confirmed';
    await appointment.save();

    // Populate user and therapist data for email
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('userId', 'name email')
      .populate('therapistId', 'name specialization');

    // Send confirmation email to user
    try {
      await sendAppointmentConfirmation(
        populatedAppointment,
        populatedAppointment.userId,
        populatedAppointment.therapistId
      );
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    res.json(appointment);
  } catch (err) {
    console.error('Error accepting appointment:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all appointments
router.get('/admin/all', adminAuth, async (req, res) => {
  const appointments = await Appointment.find({})
    .populate('therapistId', 'name specialization')
    .populate('userId', 'name email')
    .sort({ startDateTime: 1 });
  res.json(appointments);
});

// Admin: Update appointment
router.put('/admin/:id', adminAuth, async (req, res) => {
  const { startDateTime, sessionType, notes, status } = req.body;
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (startDateTime) appointment.startDateTime = startDateTime;
  if (sessionType) appointment.sessionType = sessionType;
  if (notes) appointment.notes = notes;
  if (status) appointment.status = status;
  await appointment.save();
  res.json(appointment);
});

// Admin: Delete appointment
router.delete('/admin/:id', adminAuth, async (req, res) => {
  const appointment = await Appointment.findByIdAndDelete(req.params.id);
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  res.json({ message: 'Appointment deleted' });
});

module.exports = router; 