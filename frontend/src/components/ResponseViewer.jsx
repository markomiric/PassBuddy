import React from 'react';
import { formatResponse } from '../utils/formatResponse';

export default function ResponseViewer({ loading, response, visible }) {
  if (loading) {
    return <div className="text-center text-white">Loading...</div>;
  }
  if (!visible) {
    return null;
  }
  return (
    <div className="prose prose-lg max-w-none prose-invert">
      {formatResponse(response)}
    </div>
  );
}