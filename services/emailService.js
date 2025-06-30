const nodemailer = require('nodemailer');
const config = require('../config/config');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS,
    },
  });
};

// Email templates
const emailTemplates = {
  appointmentReminder24h: (appointment, user, therapist) => ({
    subject: `Appointment Reminder - Tomorrow at ${new Date(appointment.startDateTime).toLocaleTimeString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Appointment Reminder</h2>
        <p>Hello ${user.name},</p>
        <p>This is a friendly reminder that you have an appointment tomorrow with <strong>${therapist.name}</strong>.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #34495e; margin-top: 0;">Appointment Details:</h3>
          <p><strong>Date:</strong> ${new Date(appointment.startDateTime).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(appointment.startDateTime).toLocaleTimeString()}</p>
          <p><strong>Session Type:</strong> ${appointment.sessionType}</p>
          <p><strong>Therapist:</strong> ${therapist.name}</p>
          ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
        </div>
        
        <p>Please make sure you're available and prepared for your session.</p>
        <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
        
        <p>Best regards,<br>Mental Wellness Team</p>
      </div>
    `
  }),

  appointmentReminder1h: (appointment, user, therapist) => ({
    subject: `Appointment Reminder - In 1 hour`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Appointment Starting Soon!</h2>
        <p>Hello ${user.name},</p>
        <p>Your appointment with <strong>${therapist.name}</strong> starts in 1 hour.</p>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">Appointment Details:</h3>
          <p><strong>Date:</strong> ${new Date(appointment.startDateTime).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(appointment.startDateTime).toLocaleTimeString()}</p>
          <p><strong>Session Type:</strong> ${appointment.sessionType}</p>
          <p><strong>Therapist:</strong> ${therapist.name}</p>
        </div>
        
        <p>Please ensure you're ready for your session. If this is a video call, make sure your camera and microphone are working.</p>
        
        <p>Best regards,<br>Mental Wellness Team</p>
      </div>
    `
  }),

  appointmentReminder15min: (appointment, user, therapist) => ({
    subject: `Appointment Starting in 15 minutes!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c; text-align: center;">⚠️ Appointment Starting Soon! ⚠️</h2>
        <p>Hello ${user.name},</p>
        <p>Your appointment with <strong>${therapist.name}</strong> starts in 15 minutes!</p>
        
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="color: #721c24; margin-top: 0;">Final Reminder:</h3>
          <p><strong>Date:</strong> ${new Date(appointment.startDateTime).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(appointment.startDateTime).toLocaleTimeString()}</p>
          <p><strong>Session Type:</strong> ${appointment.sessionType}</p>
          <p><strong>Therapist:</strong> ${therapist.name}</p>
        </div>
        
        <p style="text-align: center; font-weight: bold;">Please join your session now!</p>
        
        <p>Best regards,<br>Mental Wellness Team</p>
      </div>
    `
  }),

  appointmentConfirmed: (appointment, user, therapist) => ({
    subject: `Appointment Confirmed - ${new Date(appointment.startDateTime).toLocaleDateString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Appointment Confirmed!</h2>
        <p>Hello ${user.name},</p>
        <p>Your appointment with <strong>${therapist.name}</strong> has been confirmed.</p>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin-top: 0;">Appointment Details:</h3>
          <p><strong>Date:</strong> ${new Date(appointment.startDateTime).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(appointment.startDateTime).toLocaleTimeString()}</p>
          <p><strong>Session Type:</strong> ${appointment.sessionType}</p>
          <p><strong>Therapist:</strong> ${therapist.name}</p>
          ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
        </div>
        
        <p>You will receive reminder emails before your appointment.</p>
        
        <p>Best regards,<br>Mental Wellness Team</p>
      </div>
    `
  }),

  appointmentCancelled: (appointment, user, therapist) => ({
    subject: `Appointment Cancelled - ${new Date(appointment.startDateTime).toLocaleDateString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Appointment Cancelled</h2>
        <p>Hello ${user.name},</p>
        <p>Your appointment with <strong>${therapist.name}</strong> has been cancelled.</p>
        
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="color: #721c24; margin-top: 0;">Cancelled Appointment:</h3>
          <p><strong>Date:</strong> ${new Date(appointment.startDateTime).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(appointment.startDateTime).toLocaleTimeString()}</p>
          <p><strong>Session Type:</strong> ${appointment.sessionType}</p>
          <p><strong>Therapist:</strong> ${therapist.name}</p>
        </div>
        
        <p>You can book a new appointment through our platform.</p>
        
        <p>Best regards,<br>Mental Wellness Team</p>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: config.EMAIL_FROM,
      to: to,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send appointment reminder
const sendAppointmentReminder = async (appointment, user, therapist, reminderType) => {
  try {
    const template = emailTemplates[reminderType];
    if (!template) {
      throw new Error(`Unknown reminder type: ${reminderType}`);
    }

    const emailData = template(appointment, user, therapist);
    const result = await sendEmail(user.email, emailData.subject, emailData.html);
    
    if (result.success) {
      console.log(`Reminder sent successfully to ${user.email} for appointment ${appointment._id}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error sending appointment reminder:', error);
    return { success: false, error: error.message };
  }
};

// Send appointment confirmation
const sendAppointmentConfirmation = async (appointment, user, therapist) => {
  return await sendAppointmentReminder(appointment, user, therapist, 'appointmentConfirmed');
};

// Send appointment cancellation
const sendAppointmentCancellation = async (appointment, user, therapist) => {
  return await sendAppointmentReminder(appointment, user, therapist, 'appointmentCancelled');
};

module.exports = {
  sendEmail,
  sendAppointmentReminder,
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
  emailTemplates
}; 