import { Resend } from 'resend';
import { ApiError } from '../utils/ApiError.js';

// Initialize Resend client
let resendClient = null;

const initializeResend = () => {
  if (!resendClient && isResendConfigured()) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

// Check if Resend is configured
export const isResendConfigured = () => {
  return !!(
    process.env.RESEND_API_KEY &&
    process.env.RESEND_API_KEY !== 'your-resend-api-key-here' &&
    process.env.RESEND_FROM_EMAIL &&
    process.env.RESEND_FROM_EMAIL !== 'noreply@yourdomain.com' &&
    process.env.RESEND_FROM_EMAIL !== 'your-email@yourdomain.com'
  );
};

// Get Resend client
export const getResendClient = () => {
  if (!isResendConfigured()) {
    throw ApiError.serviceUnavailable('Resend is not configured. Please set RESEND_API_KEY and RESEND_FROM_EMAIL in environment variables.');
  }
  
  return initializeResend();
};

// Test Resend connection
export const testResendConnection = async () => {
  try {
    if (!isResendConfigured()) {
      return { configured: false, message: 'Resend API key not configured' };
    }

    const resend = getResendClient();
    
    // Test with a simple API call to get domains (this doesn't send an email)
    try {
      await resend.domains.list();
      return { 
        configured: true, 
        message: 'Resend connection successful',
        provider: 'resend',
        fromEmail: process.env.RESEND_FROM_EMAIL
      };
    } catch (error) {
      // If domains.list fails, it might be due to permissions, but API key is likely valid
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return { 
          configured: false, 
          message: 'Invalid Resend API key' 
        };
      }
      
      // For other errors, assume the API key is valid but there might be other issues
      return { 
        configured: true, 
        message: 'Resend API key appears valid',
        provider: 'resend',
        fromEmail: process.env.RESEND_FROM_EMAIL,
        warning: error.message
      };
    }
  } catch (error) {
    console.error('Resend connection test failed:', error.message);
    return { 
      configured: false, 
      message: `Resend connection failed: ${error.message}` 
    };
  }
};

// Send email using Resend
export const sendEmailWithResend = async (to, subject, html, text = null) => {
  try {
    const resend = getResendClient();
    
    const emailData = {
      from: `${process.env.RESEND_FROM_NAME || 'Argument Graph'} <${process.env.RESEND_FROM_EMAIL}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const result = await resend.emails.send(emailData);
    
    if (result.error) {
      throw new Error(result.error.message || 'Resend API error');
    }
    
    return {
      success: true,
      messageId: result.data?.id || 'resend-' + Date.now(),
      to: Array.isArray(to) ? to : [to],
      subject,
      provider: 'resend'
    };
  } catch (error) {
    console.error('Resend email sending error:', error);
    
    let errorMessage = `Failed to send email via Resend: ${error.message}`;
    
    if (error.message.includes('401')) {
      errorMessage = 'Invalid Resend API key. Please check your RESEND_API_KEY environment variable.';
    } else if (error.message.includes('403')) {
      errorMessage = 'Resend API access forbidden. Please check your API key permissions.';
    } else if (error.message.includes('domain')) {
      errorMessage = 'Invalid sender domain. Please verify your domain in Resend dashboard or use a verified domain.';
    }
    
    throw ApiError.internalError(errorMessage);
  }
};

export default { 
  getResendClient, 
  isResendConfigured, 
  testResendConnection, 
  sendEmailWithResend 
};