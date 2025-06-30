# Email Reminder System Setup Guide

This guide will help you set up the email reminder system for appointments.

## Prerequisites

1. Node.js and npm installed
2. MongoDB database running
3. Email service account (Gmail, Outlook, etc.)

## Installation

1. Install the new dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/mental-wellness

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Email Configuration (Gmail Example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@mentalwellness.com

# Reminder Settings
REMINDER_24H=true
REMINDER_1H=true
REMINDER_15MIN=false
```

## Email Service Setup

### Gmail Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use the generated password in `EMAIL_PASS`

### Other Email Services
- **Outlook/Hotmail**: Use `smtp-mail.outlook.com` as EMAIL_HOST
- **Yahoo**: Use `smtp.mail.yahoo.com` as EMAIL_HOST
- **Custom SMTP**: Use your provider's SMTP settings

## Reminder Types

The system supports three types of reminders:

1. **24-hour reminder** (`appointmentReminder24h`): Sent 24 hours before appointment
2. **1-hour reminder** (`appointmentReminder1h`): Sent 1 hour before appointment  
3. **15-minute reminder** (`appointmentReminder15min`): Sent 15 minutes before appointment

## Scheduling

- **24-hour reminders**: Checked every hour
- **1-hour reminders**: Checked every 15 minutes
- **15-minute reminders**: Checked every 5 minutes

## Testing the System

### 1. Check Scheduler Status
```bash
GET /api/admin/reminders/status
```

### 2. View Upcoming Appointments
```bash
GET /api/admin/reminders/upcoming?hours=24
```

### 3. Manually Trigger Reminders
```bash
POST /api/admin/reminders/trigger
Content-Type: application/json

{
  "reminderType": "appointmentReminder24h",
  "hoursAhead": 24
}
```

### 4. Reset Reminder Flags (for testing)
```bash
POST /api/admin/reminders/reset/:appointmentId
Content-Type: application/json

{
  "reminderType": "appointmentReminder24h"
}
```

### 5. View Reminder History
```bash
GET /api/admin/reminders/history/:appointmentId
```

## Email Templates

The system includes professionally designed email templates for:

- Appointment confirmations
- Appointment cancellations
- 24-hour reminders
- 1-hour reminders
- 15-minute reminders

All templates are responsive and include:
- Appointment details (date, time, therapist, session type)
- Professional styling
- Clear call-to-action messages

## Troubleshooting

### Common Issues

1. **Email not sending**:
   - Check email credentials in `.env`
   - Verify SMTP settings
   - Check firewall/network restrictions

2. **Reminders not triggering**:
   - Check scheduler status: `/api/admin/reminders/status`
   - Verify appointment status is 'confirmed'
   - Check appointment dates are in the future

3. **Duplicate reminders**:
   - The system tracks sent reminders to prevent duplicates
   - Check `remindersSent` field in appointment document

### Logs

Monitor the server logs for:
- Scheduler initialization messages
- Reminder check executions
- Email sending results
- Error messages

## Security Notes

- Never commit `.env` file to version control
- Use app passwords instead of regular passwords for email
- Regularly rotate JWT secrets
- Monitor email sending logs for abuse

## Production Deployment

For production deployment:

1. Use a dedicated email service (SendGrid, Mailgun, etc.)
2. Set up proper DNS records (SPF, DKIM, DMARC)
3. Monitor email delivery rates
4. Set up email bounce handling
5. Use environment-specific configurations 