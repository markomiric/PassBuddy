import React from 'react';

export default function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="bg-red-600 text-white p-2 font-mono">
      {error}
    </div>
  );
}