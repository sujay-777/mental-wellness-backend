const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const adminAuth = require('../middleware/adminAuth');
const reminderScheduler = require('../services/reminderScheduler');
const Appointment = require('../models/Appointment');
const Therapist = require('../models/Therapist');
const ChatMessage = require('../models/ChatMessage');
const ChatLog = require('../models/ChatLog');

// Admin login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reminder scheduler status
router.get('/reminders/status', adminAuth, (req, res) => {
  try {
    const status = reminderScheduler.getStatus();
    res.json({
      success: true,
      status: status,
      isInitialized: reminderScheduler.isInitialized
    });
  } catch (error) {
    console.error('Error getting reminder status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manually trigger reminder check
router.post('/reminders/trigger', adminAuth, async (req, res) => {
  try {
    const { reminderType, hoursAhead } = req.body;
    
    if (!reminderType || hoursAhead === undefined) {
      return res.status(400).json({
        success: false,
        error: 'reminderType and hoursAhead are required'
      });
    }

    await reminderScheduler.triggerReminderCheck(reminderType, hoursAhead);
    
    res.json({
      success: true,
      message: `Reminder check triggered for ${reminderType} (${hoursAhead} hours ahead)`
    });
  } catch (error) {
    console.error('Error triggering reminder check:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get upcoming appointments for reminder testing
router.get('/reminders/upcoming', adminAuth, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const now = new Date();
    const futureTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));
    
    const appointments = await Appointment.find({
      startDateTime: {
        $gte: now,
        $lte: futureTime
      },
      status: 'confirmed'
    })
    .populate('userId', 'name email')
    .populate('therapistId', 'name specialization')
    .sort({ startDateTime: 1 });

    res.json({
      success: true,
      appointments: appointments,
      count: appointments.length,
      timeRange: {
        from: now.toISOString(),
        to: futureTime.toISOString(),
        hours: hours
      }
    });
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset reminder flags for testing
router.post('/reminders/reset/:appointmentId', adminAuth, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reminderType } = req.body;

    if (!reminderType) {
      return res.status(400).json({
        success: false,
        error: 'reminderType is required'
      });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        $set: { [`remindersSent.${reminderType}`]: false },
        $push: {
          reminderHistory: {
            type: `${reminderType}_reset`,
            sentAt: new Date(),
            success: true
          }
        }
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      message: `Reminder flag reset for ${reminderType}`,
      appointment: appointment
    });
  } catch (error) {
    console.error('Error resetting reminder flag:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get reminder history for an appointment
router.get('/reminders/history/:appointmentId', adminAuth, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    const appointment = await Appointment.findById(appointmentId)
      .populate('userId', 'name email')
      .populate('therapistId', 'name specialization');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      appointment: {
        id: appointment._id,
        startDateTime: appointment.startDateTime,
        status: appointment.status,
        user: appointment.userId,
        therapist: appointment.therapistId,
        remindersSent: appointment.remindersSent,
        reminderHistory: appointment.reminderHistory
      }
    });
  } catch (error) {
    console.error('Error fetching reminder history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get comprehensive statistics
router.get('/statistics', adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // User Statistics
    const totalUsers = await User.countDocuments({ role: 'user' });
    const newUsersThisMonth = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: startOfMonth }
    });
    const newUsersThisWeek = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: startOfWeek }
    });
    const newUsersToday = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: startOfDay }
    });

    // Therapist Statistics
    const totalTherapists = await Therapist.countDocuments();
    const activeTherapists = await Appointment.distinct('therapistId');
    const therapistStats = await Therapist.aggregate([
      {
        $lookup: {
          from: 'appointments',
          localField: '_id',
          foreignField: 'therapistId',
          as: 'appointments'
        }
      },
      {
        $project: {
          name: 1,
          specialization: 1,
          appointmentCount: { $size: '$appointments' },
          completedAppointments: {
            $size: {
              $filter: {
                input: '$appointments',
                cond: { $eq: ['$$this.status', 'completed'] }
              }
            }
          }
        }
      },
      { $sort: { appointmentCount: -1 } },
      { $limit: 10 }
    ]);

    // Appointment Statistics
    const totalAppointments = await Appointment.countDocuments();
    const appointmentsThisMonth = await Appointment.countDocuments({
      startDateTime: { $gte: startOfMonth }
    });
    const appointmentsThisWeek = await Appointment.countDocuments({
      startDateTime: { $gte: startOfWeek }
    });
    const appointmentsToday = await Appointment.countDocuments({
      startDateTime: { $gte: startOfDay }
    });

    // Appointment Status Breakdown
    const appointmentStatusStats = await Appointment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Session Type Breakdown
    const sessionTypeStats = await Appointment.aggregate([
      {
        $group: {
          _id: '$sessionType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly Appointment Trends (last 6 months)
    const monthlyTrends = await Appointment.aggregate([
      {
        $match: {
          startDateTime: {
            $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$startDateTime' },
            month: { $month: '$startDateTime' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Chat Statistics
    const totalChatMessages = await ChatMessage.countDocuments();
    const totalChatLogs = await ChatLog.countDocuments();
    const chatMessagesThisMonth = await ChatMessage.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Reminder Statistics
    const reminderStats = await Appointment.aggregate([
      {
        $project: {
          remindersSent: 1,
          reminderHistory: 1
        }
      },
      {
        $group: {
          _id: null,
          total24hReminders: {
            $sum: { $cond: ['$remindersSent.appointmentReminder24h', 1, 0] }
          },
          total1hReminders: {
            $sum: { $cond: ['$remindersSent.appointmentReminder1h', 1, 0] }
          },
          total15minReminders: {
            $sum: { $cond: ['$remindersSent.appointmentReminder15min', 1, 0] }
          }
        }
      }
    ]);

    // Revenue Statistics (if payment status is tracked)
    const paymentStats = await Appointment.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top Performing Therapists
    const topTherapists = await Appointment.aggregate([
      {
        $lookup: {
          from: 'therapists',
          localField: 'therapistId',
          foreignField: '_id',
          as: 'therapist'
        }
      },
      {
        $unwind: '$therapist'
      },
      {
        $group: {
          _id: '$therapistId',
          therapistName: { $first: '$therapist.name' },
          specialization: { $first: '$therapist.specialization' },
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          completionRate: {
            $multiply: [
              { $divide: ['$completedAppointments', '$totalAppointments'] },
              100
            ]
          }
        }
      },
      { $sort: { totalAppointments: -1 } },
      { $limit: 5 }
    ]);

    // Recent Activity
    const recentAppointments = await Appointment.find()
      .populate('userId', 'name email')
      .populate('therapistId', 'name specialization')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentUsers = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(5);

    // System Health
    const systemHealth = {
      reminderScheduler: reminderScheduler.getStatus(),
      databaseConnections: 'healthy', // You can add actual DB health check
      emailService: 'configured', // You can add actual email service check
      lastBackup: new Date().toISOString() // You can add actual backup tracking
    };

    res.json({
      success: true,
      statistics: {
        users: {
          total: totalUsers,
          newThisMonth: newUsersThisMonth,
          newThisWeek: newUsersThisWeek,
          newToday: newUsersToday
        },
        therapists: {
          total: totalTherapists,
          active: activeTherapists.length,
          topPerformers: topTherapists
        },
        appointments: {
          total: totalAppointments,
          thisMonth: appointmentsThisMonth,
          thisWeek: appointmentsThisWeek,
          today: appointmentsToday,
          statusBreakdown: appointmentStatusStats,
          sessionTypeBreakdown: sessionTypeStats,
          monthlyTrends: monthlyTrends
        },
        chat: {
          totalMessages: totalChatMessages,
          totalLogs: totalChatLogs,
          messagesThisMonth: chatMessagesThisMonth
        },
        reminders: {
          total24h: reminderStats[0]?.total24hReminders || 0,
          total1h: reminderStats[0]?.total1hReminders || 0,
          total15min: reminderStats[0]?.total15minReminders || 0
        },
        payments: {
          breakdown: paymentStats
        },
        recentActivity: {
          appointments: recentAppointments,
          users: recentUsers
        },
        systemHealth: systemHealth
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get appointment analytics
router.get('/analytics/appointments', adminAuth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const appointments = await Appointment.find({
      startDateTime: { $gte: startDate }
    }).populate('therapistId', 'name specialization');

    // Daily breakdown
    const dailyBreakdown = await Appointment.aggregate([
      {
        $match: {
          startDateTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$startDateTime' } }
          },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Therapist performance
    const therapistPerformance = await Appointment.aggregate([
      {
        $match: {
          startDateTime: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'therapists',
          localField: 'therapistId',
          foreignField: '_id',
          as: 'therapist'
        }
      },
      {
        $unwind: '$therapist'
      },
      {
        $group: {
          _id: '$therapistId',
          therapistName: { $first: '$therapist.name' },
          specialization: { $first: '$therapist.specialization' },
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          avgSessionDuration: { $avg: '$sessionDuration' } // If you track this
        }
      },
      {
        $addFields: {
          completionRate: {
            $multiply: [
              { $divide: ['$completedAppointments', '$totalAppointments'] },
              100
            ]
          },
          cancellationRate: {
            $multiply: [
              { $divide: ['$cancelledAppointments', '$totalAppointments'] },
              100
            ]
          }
        }
      },
      { $sort: { totalAppointments: -1 } }
    ]);

    res.json({
      success: true,
      period: period,
      totalAppointments: appointments.length,
      dailyBreakdown: dailyBreakdown,
      therapistPerformance: therapistPerformance
    });
  } catch (error) {
    console.error('Error fetching appointment analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user engagement analytics
router.get('/analytics/engagement', adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // User registration trends
    const userRegistrationTrends = await User.aggregate([
      {
        $match: {
          role: 'user',
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // User activity (users with appointments)
    const activeUsers = await Appointment.distinct('userId');
    const userActivityStats = await User.aggregate([
      {
        $lookup: {
          from: 'appointments',
          localField: '_id',
          foreignField: 'userId',
          as: 'appointments'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          createdAt: 1,
          appointmentCount: { $size: '$appointments' },
          lastAppointment: { $max: '$appointments.startDateTime' }
        }
      },
      {
        $match: {
          appointmentCount: { $gt: 0 }
        }
      },
      { $sort: { appointmentCount: -1 } },
      { $limit: 10 }
    ]);

    // Chat engagement
    const chatEngagement = await ChatLog.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$user.name' },
          chatSessions: { $sum: 1 },
          totalMessages: { $sum: { $size: '$messages' } }
        }
      },
      { $sort: { totalMessages: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      userRegistrationTrends: userRegistrationTrends,
      activeUsers: activeUsers.length,
      userActivityStats: userActivityStats,
      chatEngagement: chatEngagement
    });
  } catch (error) {
    console.error('Error fetching engagement analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 