const axios = require('axios');
require('dotenv').config();

/**
 * Send WhatsApp message using DXING API
 * @param {string} recipient - Phone number with country code (e.g., '+919876543210')
 * @param {string} message - Message text to send
 * @returns {Promise<Object>} Response from DXING API
 */
const sendWhatsAppMessage = async (recipient, message) => {
  try {
    const apiKey = process.env.DXING_API_KEY;
    const instanceId = process.env.DXING_INSTANCE_ID;

    if (!apiKey || !instanceId) {
      console.error('DXING API credentials not found in environment variables');
      throw new Error('WhatsApp API credentials not configured');
    }

    // Ensure phone number is in correct format (with country code, no spaces)
    // Remove all spaces and special characters except + and digits
    let formattedRecipient = recipient.replace(/[\s\-\(\)]/g, '');
    
    // If number doesn't start with +, assume it's an Indian number and add +91
    if (!formattedRecipient.startsWith('+')) {
      // Remove leading zeros
      formattedRecipient = formattedRecipient.replace(/^0+/, '');
      // If it's 10 digits, add +91
      if (formattedRecipient.length === 10) {
        formattedRecipient = '+91' + formattedRecipient;
      } else if (formattedRecipient.length === 12 && formattedRecipient.startsWith('91')) {
        // Already has country code without +
        formattedRecipient = '+' + formattedRecipient;
      } else {
        // Try to add + if it looks like a number
        formattedRecipient = '+' + formattedRecipient;
      }
    }
    
    // Final validation - should start with + and have digits
    if (!/^\+[1-9]\d{9,14}$/.test(formattedRecipient)) {
      throw new Error(`Invalid phone number format: ${recipient}`);
    }

    const response = await axios.post('https://app.dxing.in/api/send/whatsapp', {
      secret: apiKey,
      account: instanceId,
      recipient: formattedRecipient,
      type: 'text',
      message: message,
      priority: 1
    });

    if (response.data && response.data.status === 200) {
      console.log('WhatsApp message sent successfully to:', formattedRecipient);
      return {
        success: true,
        data: response.data
      };
    } else {
      console.error('Failed to send WhatsApp message:', response.data);
      throw new Error(response.data?.message || 'Failed to send WhatsApp message');
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    
    // Don't throw error - just log it so the reply still saves even if WhatsApp fails
    return {
      success: false,
      status: error.response?.status || null,
      error: error.response?.data?.message || error.message || 'Failed to send WhatsApp message'
    };
  }
};

/**
 * Format admin reply message for WhatsApp
 * @param {Object} submission - Submission object
 * @param {string} replyMessage - Admin's reply message
 * @returns {string} Formatted message for WhatsApp
 */
const formatReplyMessage = (submission, replyMessage) => {
  const memberName = submission.ruknName || 'Member';
  const unit = submission.unit || 'N/A';
  
  return `*Admin Feedback*\n\n` +
         `Member: ${memberName}\n` +
         `Unit: ${unit}\n\n` +
         `*Message:*\n${replyMessage}`;
};

/**
 * Format structured reply message for WhatsApp
 * @param {Object} unitAdmin - UnitAdmin object
 * @param {string} formattedMessage - Formatted reply message
 * @returns {string} Formatted message for WhatsApp
 */
const formatStructuredReplyMessage = (unitAdmin, formattedMessage) => {
  return formattedMessage;
};

module.exports = {
  sendWhatsAppMessage,
  formatReplyMessage,
  formatStructuredReplyMessage
};

