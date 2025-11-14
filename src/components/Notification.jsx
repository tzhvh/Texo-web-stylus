import React, { useEffect } from 'react';

/**
 * Toast notification component for non-blocking user feedback
 * Replaces blocking alert() dialogs with modern, accessible notifications
 *
 * @param {Object} props
 * @param {string} props.message - Notification message to display
 * @param {string} props.type - Notification type: 'info' | 'success' | 'warning' | 'error'
 * @param {number} props.duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
 * @param {function} props.onClose - Callback when notification is closed
 */
export default function Notification({
  message,
  type = 'info',
  duration = 5000,
  onClose
}) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeStyles = {
    info: 'bg-blue-500 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-gray-900',
    error: 'bg-red-500 text-white',
  };

  const icons = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠️',
    error: '✕',
  };

  return (
    <div
      className={`fixed top-20 right-6 ${typeStyles[type]} px-6 py-4 rounded-lg shadow-lg z-50 max-w-md animate-slide-in`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden="true">{icons[type]}</span>
        <div className="flex-1">
          <p className="text-sm font-medium whitespace-pre-wrap">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-current opacity-75 hover:opacity-100 transition-opacity ml-2"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
