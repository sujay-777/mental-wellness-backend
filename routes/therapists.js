const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Therapist = require('../models/Therapist');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// @route   GET api/therapists
// @desc    Get all therapists with optional filtering
// @access  Public
router.get('/', async (req, res) => {
  console.log('GET /therapists route hit');
  try {
    const { specialization, availability, search } = req.query;
    console.log('Query parameters:', { specialization, availability, search });
    
    let query = {};

    // Add filters if provided
    if (specialization) {
      query.specialization = { $in: [specialization] };
    }
    if (availability) {
      query['availability.day'] = availability;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('MongoDB query:', query);
    const therapists = await Therapist.find(query)
      .select('-password')
      .sort({ name: 1 });
    
    console.log('Found therapists:', therapists.length);
    res.json(therapists);
  } catch (err) {
    console.error('Error in GET /therapists:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/therapists/:id
// @desc    Get therapist by ID
// @access  Public
router.get('/:id', async (req, res) => {
  console.log('GET /therapists/:id route hit');
  try {
    const therapist = await Therapist.findById(req.params.id)
      .select('-password');

    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    res.json(therapist);
  } catch (err) {
    console.error('Error in GET /therapists/:id:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/therapists
// @desc    Create a new therapist
// @access  Private/Admin
router.post('/', adminAuth, async (req, res) => {
  const { name, email, password, specialization, bio, experience, availability } = req.body;
  let therapist = await Therapist.findOne({ email });
  if (therapist) return res.status(400).json({ message: 'Therapist already exists' });
  therapist = new Therapist({ name, email, password, specialization, bio, experience, availability });
  await therapist.save();
  res.status(201).json(therapist);
});

// @route   PUT api/therapists/:id
// @desc    Update therapist
// @access  Private/Admin
router.put('/:id', adminAuth, async (req, res) => {
  const { name, specialization, bio, experience, availability } = req.body;
  const therapist = await Therapist.findById(req.params.id);
  if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
  if (name) therapist.name = name;
  if (specialization) therapist.specialization = specialization;
  if (bio) therapist.bio = bio;
  if (experience) therapist.experience = experience;
  if (availability) therapist.availability = availability;
  await therapist.save();
  res.json(therapist);
});

// @route   DELETE api/therapists/:id
// @desc    Delete therapist
// @access  Private/Admin
router.delete('/:id', adminAuth, async (req, res) => {
  const therapist = await Therapist.findByIdAndDelete(req.params.id);
  if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
  res.json({ message: 'Therapist deleted' });
});

// Therapist login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const therapist = await Therapist.findOne({ email });
    if (!therapist) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const isMatch = await therapist.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: therapist._id, role: 'therapist' },
      config.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({
      token,
      user: {
        id: therapist._id,
        _id: therapist._id,
        name: therapist.name,
        email: therapist.email,
        role: 'therapist',
        specialization: therapist.specialization,
        bio: therapist.bio,
        experience: therapist.experience
      }
    });
  } catch (err) {
    console.error('Therapist login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 