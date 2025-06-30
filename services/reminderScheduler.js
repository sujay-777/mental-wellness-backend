const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Therapist = require('../models/Therapist');
const { sendAppointmentReminder } = require('./emailService');
const config = require('../config/config');

class ReminderScheduler {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  // Initialize all scheduled jobs
  init() {
    if (this.isInitialized) {
      console.log('Reminder scheduler already initialized');
      return;
    }

    console.log('Initializing reminder scheduler...');

    // Schedule 24-hour reminders (runs every hour, checks for appointments 24 hours from now)
    if (config.REMINDER_24H) {
      this.schedule24HourReminders();
    }

    // Schedule 1-hour reminders (runs every 15 minutes, checks for appointments 1 hour from now)
    if (config.REMINDER_1H) {
      this.schedule1HourReminders();
    }

    // Schedule 15-minute reminders (runs every 5 minutes, checks for appointments 15 minutes from now)
    if (config.REMINDER_15MIN) {
      this.schedule15MinuteReminders();
    }

    this.isInitialized = true;
    console.log('Reminder scheduler initialized successfully');
  }

  // Schedule 24-hour reminders
  schedule24HourReminders() {
    const job = cron.schedule('0 * * * *', async () => {
      console.log('Running 24-hour reminder check...');
      await this.sendReminders('appointmentReminder24h', 24);
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.set('24h', job);
    console.log('24-hour reminders scheduled');
  }

  // Schedule 1-hour reminders
  schedule1HourReminders() {
    const job = cron.schedule('*/15 * * * *', async () => {
      console.log('Running 1-hour reminder check...');
      await this.sendReminders('appointmentReminder1h', 1);
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.set('1h', job);
    console.log('1-hour reminders scheduled');
  }

  // Schedule 15-minute reminders
  schedule15MinuteReminders() {
    const job = cron.schedule('*/5 * * * *', async () => {
      console.log('Running 15-minute reminder check...');
      await this.sendReminders('appointmentReminder15min', 0.25); // 15 minutes = 0.25 hours
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.set('15min', job);
    console.log('15-minute reminders scheduled');
  }

  // Send reminders for appointments
  async sendReminders(reminderType, hoursAhead) {
    try {
      const now = new Date();
      const targetTime = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));
      
      // Calculate time range (within 15 minutes of target time)
      const timeRangeStart = new Date(targetTime.getTime() - (15 * 60 * 1000));
      const timeRangeEnd = new Date(targetTime.getTime() + (15 * 60 * 1000));

      console.log(`Looking for appointments between ${timeRangeStart.toISOString()} and ${timeRangeEnd.toISOString()}`);

      // Find appointments that need reminders
      const appointments = await Appointment.find({
        startDateTime: {
          $gte: timeRangeStart,
          $lte: timeRangeEnd
        },
        status: 'confirmed'
      }).populate('userId', 'name email').populate('therapistId', 'name specialization');

      console.log(`Found ${appointments.length} appointments for ${reminderType} reminders`);

      // Send reminders for each appointment
      for (const appointment of appointments) {
        try {
          // Check if reminder was already sent
          const reminderSent = await this.checkIfReminderSent(appointment._id, reminderType);
          
          if (!reminderSent) {
            const result = await sendAppointmentReminder(
              appointment,
              appointment.userId,
              appointment.therapistId,
              reminderType
            );

            if (result.success) {
              await this.markReminderSent(appointment._id, reminderType);
              console.log(`Reminder sent for appointment ${appointment._id} to ${appointment.userId.email}`);
            } else {
              console.error(`Failed to send reminder for appointment ${appointment._id}:`, result.error);
            }
          } else {
            console.log(`Reminder already sent for appointment ${appointment._id} (${reminderType})`);
          }
        } catch (error) {
          console.error(`Error processing reminder for appointment ${appointment._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in sendReminders:', error);
    }
  }

  // Check if reminder was already sent
  async checkIfReminderSent(appointmentId, reminderType) {
    try {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) return false;
      
      return appointment.remindersSent[reminderType] || false;
    } catch (error) {
      console.error('Error checking reminder status:', error);
      return false;
    }
  }

  // Mark reminder as sent
  async markReminderSent(appointmentId, reminderType) {
    try {
      await Appointment.findByIdAndUpdate(appointmentId, {
        $set: { [`remindersSent.${reminderType}`]: true },
        $push: {
          reminderHistory: {
            type: reminderType,
            sentAt: new Date(),
            success: true
          }
        }
      });
      console.log(`Marked ${reminderType} reminder as sent for appointment ${appointmentId}`);
    } catch (error) {
      console.error('Error marking reminder as sent:', error);
    }
  }

  // Stop all scheduled jobs
  stop() {
    console.log('Stopping reminder scheduler...');
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`Stopped ${name} reminder job`);
    }
    this.jobs.clear();
    this.isInitialized = false;
    console.log('Reminder scheduler stopped');
  }

  // Get status of all jobs
  getStatus() {
    const status = {};
    for (const [name, job] of this.jobs) {
      status[name] = {
        running: job.running
      };
    }
    return status;
  }

  // Manually trigger reminder check (for testing)
  async triggerReminderCheck(reminderType, hoursAhead) {
    console.log(`Manually triggering ${reminderType} reminder check...`);
    await this.sendReminders(reminderType, hoursAhead);
  }
}

// Create singleton instance
const reminderScheduler = new ReminderScheduler();

module.exports = reminderScheduler; 