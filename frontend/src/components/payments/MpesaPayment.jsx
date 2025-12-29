import { useEffect, useState } from 'react';
import { pollPaymentStatus } from '../../services/api';

export default function MpesaPayment({ checkoutRequestID, amount, phoneNumber, onSuccess, onCancel, onError }) {
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    let interval;

    const checkStatus = async () => {
      try {
        const resp = await pollPaymentStatus(checkoutRequestID);
        if (resp.data.status === 'completed') {
          setStatus('completed');
          onSuccess(resp.data);
          clearInterval(interval);
        } else if (resp.data.status === 'failed') {
          setStatus('failed');
          onError && onError(new Error('Payment failed'));
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error polling M-Pesa status:', err);
      }
    };

    interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkoutRequestID, onSuccess, onError]);

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">M-Pesa Payment</h3>
      <p>Amount: KES {amount}</p>
      <p>Phone: {phoneNumber}</p>
      <p>Status: {status}</p>
      <button className="mt-2 px-4 py-2 bg-gray-300 rounded" onClick={onCancel}>Cancel</button>
    </div>
  );
}
