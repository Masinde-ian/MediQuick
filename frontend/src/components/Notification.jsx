import { useEffect, useState } from 'react';

const Notification = () => {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setNotification(e.detail);
      setTimeout(
        () => setNotification(null),
        e.detail?.duration || 3000
      );
    };

    window.addEventListener('showNotification', handler);
    return () => window.removeEventListener('showNotification', handler);
  }, []);

  if (!notification) return null;

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg max-w-sm
        ${colors[notification.type] || 'bg-gray-50'}
      `}
    >
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="font-semibold">{notification.title}</div>
          <div className="text-sm">{notification.message}</div>
        </div>
        <button
          onClick={() => setNotification(null)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification;
