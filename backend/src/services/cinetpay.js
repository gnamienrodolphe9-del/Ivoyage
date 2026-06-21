const axios = require('axios');

const CINETPAY_BASE = 'https://api-checkout.cinetpay.com/v2';

async function initPayment({
  amount, currency = 'XOF', bookingRef,
  description, customerPhone, customerName
}) {
  const payload = {
    apikey: process.env.CINETPAY_API_KEY,
    site_id: process.env.CINETPAY_SITE_ID,
    transaction_id: bookingRef,
    amount,
    currency,
    description,
    customer_name: customerName,
    customer_phone: customerPhone,
    notify_url: process.env.CINETPAY_NOTIFY_URL,
    return_url: `${process.env.CINETPAY_RETURN_URL}?ref=${bookingRef}`,
    channels: 'MOBILE_MONEY',
    lang: 'fr',
  };

  const response = await axios.post(`${CINETPAY_BASE}/payment`, payload);

  if (response.data.code !== '201') {
    throw new Error(`CinetPay: ${response.data.message}`);
  }

  return {
    paymentUrl: response.data.data.payment_url,
    transactionId: response.data.data.payment_token,
  };
}

async function checkPaymentStatus(transactionId) {
  const response = await axios.post(`${CINETPAY_BASE}/payment/check`, {
    apikey: process.env.CINETPAY_API_KEY,
    site_id: process.env.CINETPAY_SITE_ID,
    transaction_id: transactionId,
  });

  return response.data;
}

module.exports = { initPayment, checkPaymentStatus };