const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.callbackURL = process.env.MPESA_CALLBACK_URL;
    this.baseURL = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get OAuth access token
  async getAccessToken() {
    try {
      // Check if token is still valid
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });

      this.accessToken = response.data.access_token;
      // Set expiry to 55 minutes from now (tokens expire in 1 hour)
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);
      
      console.log('✅ M-Pesa access token obtained');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to get M-Pesa access token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Format phone number
  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      cleaned = '254' + cleaned;
    } else if (cleaned.startsWith('254') && cleaned.length === 12) {
      // Already in 254 format
    } else if (cleaned.startsWith('+254') && cleaned.length === 13) {
      cleaned = cleaned.substring(1);
    }
    
    return cleaned;
  }

  // Generate timestamp
  generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  // Generate password
  generatePassword(businessShortCode, passkey) {
    const timestamp = this.generateTimestamp();
    const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');
    return { password, timestamp };
  }

  // Initiate STK Push
  async initiateSTKPush(data) {
    try {
      const {
        phoneNumber,
        amount,
        accountReference,
        transactionDesc,
        userId,
        orderId,
        checkoutRequestID
      } = data;

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone || formattedPhone.length !== 12) {
        throw new Error('Invalid phone number format');
      }

      // Get access token
      const accessToken = await this.getAccessToken();

      // Generate password and timestamp
      const { password, timestamp } = this.generatePassword(this.businessShortCode, this.passkey);

      // Prepare request payload
      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackURL,
        AccountReference: accountReference || `ORDER-${Date.now()}`,
        TransactionDesc: transactionDesc || 'Payment for goods'
      };

      console.log('📱 Sending STK Push request:', {
        phoneNumber: formattedPhone ? '***' + formattedPhone.slice(-3) : 'none',
        amount,
        accountReference: payload.AccountReference,
        timestamp
      });

      // Make API call to Safaricom
      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ STK Push response:', response.data);

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          orderId,
          phoneNumber: formattedPhone,
          amount: parseFloat(amount),
          checkoutRequestID: response.data.CheckoutRequestID || checkoutRequestID,
          merchantRequestID: response.data.MerchantRequestID,
          accountReference: payload.AccountReference,
          transactionDesc: payload.TransactionDesc,
          status: 'PENDING',
          requestPayload: JSON.stringify(payload),
          responsePayload: JSON.stringify(response.data),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Update order with checkout ID if not already set
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            checkoutRequestID: response.data.CheckoutRequestID || checkoutRequestID,
            transactionId: transaction.id,
            paymentStatus: 'PENDING',
            updatedAt: new Date()
          }
        });
      }

      return {
        success: true,
        message: 'STK Push initiated successfully',
        data: {
          ...response.data,
          transactionId: transaction.id,
          checkoutRequestID: transaction.checkoutRequestID
        }
      };
    } catch (error) {
      console.error('❌ STK Push error:', error.response?.data || error.message);
      
      // Create failed transaction record
      if (data.userId) {
        try {
          await prisma.transaction.create({
            data: {
              userId: data.userId,
              orderId: data.orderId,
              phoneNumber: this.formatPhoneNumber(data.phoneNumber),
              amount: parseFloat(data.amount),
              accountReference: data.accountReference,
              transactionDesc: data.transactionDesc,
              status: 'FAILED',
              errorMessage: error.response?.data?.errorMessage || error.message,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        } catch (dbError) {
          console.error('❌ Failed to create transaction record:', dbError);
        }
      }

      return {
        success: false,
        message: error.response?.data?.errorMessage || 'Failed to initiate STK Push',
        error: error.response?.data || error.message
      };
    }
  }

  // Query transaction status
  async queryTransaction(checkoutRequestID) {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword(this.businessShortCode, this.passkey);

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };

      console.log('🔍 Querying transaction:', { checkoutRequestID, timestamp });

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Query response:', response.data);

      // Update transaction in database
      if (response.data.ResultCode) {
        await this.processQueryResult(checkoutRequestID, response.data);
      }

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Query transaction error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to query transaction',
        error: error.response?.data || error.message
      };
    }
  }

  // Process query result
  async processQueryResult(checkoutRequestID, queryResult) {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: { checkoutRequestID },
        include: { order: true }
      });

      if (!transaction) {
        console.warn('⚠️ Transaction not found for checkoutRequestID:', checkoutRequestID);
        return;
      }

      let status = 'PENDING';
      let resultDesc = queryResult.ResultDesc;

      // Map Safaricom result codes to our statuses
      if (queryResult.ResultCode === '0') {
        status = 'COMPLETED';
        
        // Extract M-Pesa receipt number from metadata
        const metadata = queryResult.CallbackMetadata || queryResult.Metadata;
        if (metadata && metadata.Item) {
          const items = Array.isArray(metadata.Item) ? metadata.Item : [metadata.Item];
          const receiptItem = items.find(item => item.Name === 'MpesaReceiptNumber');
          if (receiptItem) {
            await prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                status: status,
                mpesaReceiptNumber: receiptItem.Value,
                resultCode: queryResult.ResultCode,
                resultDesc: resultDesc,
                queryResponse: JSON.stringify(queryResult),
                updatedAt: new Date()
              }
            });

            // Update order if exists
            if (transaction.orderId) {
              await prisma.order.update({
                where: { id: transaction.orderId },
                data: {
                  paymentStatus: 'PAID',
                  updatedAt: new Date()
                }
              });
            }
            
            console.log('✅ Transaction updated to COMPLETED:', checkoutRequestID);
            return;
          }
        }
      } else if (queryResult.ResultCode === '1032' || queryResult.ResultCode === '1037') {
        status = 'CANCELLED';
      } else if (queryResult.ResultCode === '1' || queryResult.ResultCode === '1031') {
        status = 'FAILED';
      }

      // Update transaction
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: status,
          resultCode: queryResult.ResultCode,
          resultDesc: resultDesc,
          queryResponse: JSON.stringify(queryResult),
          updatedAt: new Date()
        }
      });

      console.log(`✅ Transaction updated to ${status}:`, checkoutRequestID);
    } catch (error) {
      console.error('❌ Error processing query result:', error);
    }
  }

  // Process callback from Safaricom
  async processCallback(callbackData) {
    try {
      console.log('📞 Processing callback data');
      
      const stkCallback = callbackData.Body?.stkCallback;
      if (!stkCallback) {
        console.error('❌ Invalid callback format');
        return { success: false, message: 'Invalid callback format' };
      }

      const checkoutRequestID = stkCallback.CheckoutRequestID;
      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;

      console.log('Callback details:', {
        checkoutRequestID,
        resultCode,
        resultDesc
      });

      // Find transaction
      const transaction = await prisma.transaction.findFirst({
        where: { checkoutRequestID },
        include: { order: true }
      });

      if (!transaction) {
        console.error('❌ Transaction not found:', checkoutRequestID);
        return { success: false, message: 'Transaction not found' };
      }

      let status = 'PENDING';
      let mpesaReceiptNumber = null;
      let transactionDate = null;
      let phoneNumber = null;
      let amount = null;

      // Parse callback metadata
      if (stkCallback.CallbackMetadata) {
        const items = stkCallback.CallbackMetadata.Item || [];
        if (!Array.isArray(items)) {
          // Handle single item case
          if (items.Name && items.Value) {
            if (items.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = items.Value;
            if (items.Name === 'TransactionDate') transactionDate = items.Value;
            if (items.Name === 'PhoneNumber') phoneNumber = items.Value;
            if (items.Name === 'Amount') amount = items.Value;
          }
        } else {
          // Handle array of items
          items.forEach(item => {
            if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value;
            if (item.Name === 'TransactionDate') transactionDate = item.Value;
            if (item.Name === 'PhoneNumber') phoneNumber = item.Value;
            if (item.Name === 'Amount') amount = item.Value;
          });
        }
      }

      // Map result codes
      if (resultCode === 0 || resultCode === '0') {
        status = 'COMPLETED';
        
        // Update order if exists
        if (transaction.orderId) {
          await prisma.order.update({
            where: { id: transaction.orderId },
            data: {
              paymentStatus: 'PAID',
              updatedAt: new Date()
            }
          });
          console.log('✅ Order payment status updated to PAID:', transaction.orderId);
        }
      } else if (resultCode === 1032 || resultCode === '1032' || resultCode === 1037 || resultCode === '1037') {
        status = 'CANCELLED';
      } else {
        status = 'FAILED';
      }

      // Update transaction
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: status,
          mpesaReceiptNumber: mpesaReceiptNumber,
          transactionDate: transactionDate,
          phoneNumber: phoneNumber || transaction.phoneNumber,
          amount: amount || transaction.amount,
          resultCode: resultCode.toString(),
          resultDesc: resultDesc,
          callbackData: JSON.stringify(callbackData),
          updatedAt: new Date()
        }
      });

      console.log(`✅ Callback processed: Transaction ${transaction.id} marked as ${status}`);

      return {
        success: true,
        message: 'Callback processed successfully',
        data: {
          transactionId: transaction.id,
          status: status,
          mpesaReceiptNumber: mpesaReceiptNumber,
          orderId: transaction.orderId
        }
      };
    } catch (error) {
      console.error('❌ Callback processing error:', error);
      return {
        success: false,
        message: 'Failed to process callback',
        error: error.message
      };
    }
  }

  // Get user transactions
  async getUserTransactions(userId, options = {}) {
    try {
      const { page = 1, limit = 10, status } = options;
      const skip = (page - 1) * limit;

      const where = { userId };
      if (status) {
        where.status = status;
      }

      const transactions = await prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true
            }
          }
        }
      });

      const total = await prisma.transaction.count({ where });

      return {
        success: true,
        data: {
          transactions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      console.error('❌ Get user transactions error:', error);
      return {
        success: false,
        message: 'Failed to fetch transactions'
      };
    }
  }

  // Get transaction by ID
  async getTransaction(id, userId = null) {
    try {
      const where = { id };
      if (userId) {
        where.userId = userId;
      }

      const transaction = await prisma.transaction.findFirst({
        where,
        include: {
          order: {
            include: {
              address: true,
              orderItems: {
                include: {
                  product: {
                    select: {
                      name: true,
                      image: true
                    }
                  }
                }
              }
            }
          },
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!transaction) {
        return {
          success: false,
          message: 'Transaction not found'
        };
      }

      return {
        success: true,
        data: transaction
      };
    } catch (error) {
      console.error('❌ Get transaction error:', error);
      return {
        success: false,
        message: 'Failed to fetch transaction'
      };
    }
  }
}

// Create and export service instance
module.exports = new MpesaService();