const nodemailer = require('nodemailer');

// Create transporter (using Gmail for development)
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Email templates
const emailTemplates = {
  orderConfirmation: (order, user) => ({
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Order Confirmed!</h2>
        <p>Dear ${user.name},</p>
        <p>Thank you for your order. Here are your order details:</p>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h3>Order #${order.orderNumber}</h3>
          <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        
        <p>We'll notify you when your order is shipped.</p>
        <p>Thank you for choosing MediQuick!</p>
      </div>
    `
  }),

  prescriptionApproved: (prescription, user) => ({
    subject: 'Prescription Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Prescription Approved!</h2>
        <p>Dear ${user.name},</p>
        <p>Your prescription has been approved by our pharmacy team.</p>
        <p>You can now proceed with your order.</p>
        <p>Thank you for choosing MediQuick!</p>
      </div>
    `
  }),

  lowStockAlert: (product, currentStock) => ({
    subject: `Low Stock Alert - ${product.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Low Stock Alert</h2>
        <p><strong>Product:</strong> ${product.name}</p>
        <p><strong>Current Stock:</strong> ${currentStock} units</p>
        <p><strong>SKU:</strong> ${product.sku}</p>
        <p>Please consider restocking this product soon.</p>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email credentials not configured. Skipping email send.');
      return { success: false, message: 'Email not configured' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  emailTemplates,
  sendEmail
};