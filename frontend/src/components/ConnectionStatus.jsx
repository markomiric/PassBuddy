import React from 'react';

export default function ConnectionStatus({ status, desktopConnected }) {
  const statusColor = {
    connecting: 'text-yellow-400',
    connected: 'text-green-400',
    disconnected: 'text-red-400',
  }[status] || 'text-gray-400';

  return (
    <div className="flex items-center p-2 space-x-4">
      <span className={`${statusColor} font-mono`}>WS: {status}</span>
      <span className="text-white font-mono">
        Desktop: {desktopConnected ? '🖥️ Connected' : '❌ Disconnected'}
      </span>
    </div>
  );
}