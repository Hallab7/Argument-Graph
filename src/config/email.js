import nodemailer from 'nodemailer';
import { ApiError } from '../utils/ApiError.js';
import { isResendConfigured, testResendConnection, sendEmailWithResend } from './resend.js';

// Email transporter
let transporter = null;

const initializeEmailTransporter = () => {
  if (!transporter && isEmailConfigured()) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Add connection timeout and retry settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000, // 5 seconds
      socketTimeout: 10000, // 10 seconds
      // Retry settings
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // TLS settings
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates (for testing)
      }
    });
  }
  return transporter;
};

// Check if email is configured (either SMTP or Resend)
export const isEmailConfigured = () => {
  // Check if Resend is configured first (preferred)
  if (process.env.EMAIL_PROVIDER === 'resend' && isResendConfigured()) {
    return true;
  }
  
  // Fallback to SMTP configuration
  return !!(
    process.env.EMAIL_HOST &&
    process.env.EMAIL_PORT &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    process.env.EMAIL_FROM
  );
};

// Get email transporter
export const getEmailTransporter = () => {
  if (!isEmailConfigured()) {
    throw ApiError.serviceUnavailable('Email service is not configured. Please set email environment variables.');
  }
  
  return initializeEmailTransporter();
};

// Test email connection (both SMTP and Resend)
export const testEmailConnection = async () => {
  try {
    // Test Resend first if configured
    if (process.env.EMAIL_PROVIDER === 'resend' && isResendConfigured()) {
      return await testResendConnection();
    }
    
    // Fallback to SMTP testing
    if (!isEmailConfigured()) {
      return { configured: false, message: 'Email service not configured' };
    }

    const emailTransporter = getEmailTransporter();
    await emailTransporter.verify();

    return { 
      configured: true, 
      message: 'SMTP connection successful',
      provider: 'smtp',
      host: process.env.EMAIL_HOST,
      user: process.env.EMAIL_USER
    };
  } catch (error) {
    console.error('Email connection test failed:', error.message);
    return { 
      configured: false, 
      message: `Email connection failed: ${error.message}` 
    };
  }
};

// Send email function with retry logic and provider selection
export const sendEmail = async (to, subject, html, text = null, retryCount = 0) => {
  const maxRetries = 2;
  
  // Development mode - simulate email sending
  if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL === 'true') {
    console.log('📧 SIMULATED EMAIL SEND:');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML Length: ${html.length} characters`);
    console.log('✅ Email simulated successfully');
    
    return {
      success: true,
      messageId: `simulated-${Date.now()}`,
      to,
      subject,
      simulated: true
    };
  }
  
  try {
    // Use Resend if configured and selected
    if (process.env.EMAIL_PROVIDER === 'resend' && isResendConfigured()) {
      return await sendEmailWithResend(to, subject, html, text);
    }
    
    // Fallback to SMTP
    const emailTransporter = getEmailTransporter();
    
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'Argument Graph'} <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const result = await emailTransporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: result.messageId,
      to,
      subject,
      provider: 'smtp'
    };
  } catch (error) {
    console.error(`Email sending error (attempt ${retryCount + 1}):`, error.message);
    
    // Retry logic for network errors
    if (retryCount < maxRetries && (
      error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNREFUSED' || 
      error.code === 'ENOTFOUND' ||
      error.message.includes('timeout')
    )) {
      console.log(`Retrying email send in ${(retryCount + 1) * 2} seconds...`);
      await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
      return sendEmail(to, subject, html, text, retryCount + 1);
    }
    
    // If all retries failed or it's a different error, throw with helpful message
    let errorMessage = `Failed to send email: ${error.message}`;
    
    if (error.code === 'ETIMEDOUT') {
      errorMessage = `Email service timeout. This might be due to network restrictions or firewall blocking SMTP connections. Consider using Resend instead of SMTP.`;
    } else if (error.code === 'EAUTH') {
      errorMessage = `Email authentication failed. Please check your email credentials and ensure you're using an App Password for Gmail.`;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = `Email server connection refused. Please check your SMTP host and port settings.`;
    }
    
    throw ApiError.internalError(errorMessage);
  }
};

// Email templates
export const emailTemplates = {
  otpVerification: (otp, expiresIn) => ({
    subject: 'Password Reset OTP - Argument Graph',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-box { background: white; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px; margin: 10px 0; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have requested to reset your password for your Argument Graph account. Please use the following One-Time Password (OTP) to proceed:</p>
            
            <div class="otp-box">
              <p>Your OTP Code:</p>
              <div class="otp-code">${otp}</div>
              <p><small>This code expires in ${expiresIn} minutes</small></p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This OTP is valid for ${expiresIn} minutes only</li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>For security, this code can only be used once</li>
              </ul>
            </div>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <p>Best regards,<br>The Argument Graph Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordResetSuccess: () => ({
    subject: 'Password Reset Successful - Argument Graph',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-box { background: #d1fae5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Reset Successful</h1>
          </div>
          <div class="content">
            <div class="success-box">
              <h2>🎉 Your password has been successfully reset!</h2>
              <p>You can now log in to your Argument Graph account with your new password.</p>
            </div>
            
            <p>Hello,</p>
            <p>This email confirms that your password has been successfully changed for your Argument Graph account.</p>
            
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>You can now log in with your new password</li>
              <li>All existing sessions have been invalidated for security</li>
              <li>You'll need to log in again on all devices</li>
            </ul>
            
            <p><strong>🔒 Security Tip:</strong> Make sure to use a strong, unique password and consider enabling two-factor authentication for enhanced security.</p>
            
            <p>If you didn't make this change or have any concerns, please contact our support team immediately.</p>
            
            <p>Best regards,<br>The Argument Graph Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

export default { 
  getEmailTransporter, 
  isEmailConfigured, 
  testEmailConnection, 
  sendEmail, 
  emailTemplates 
};