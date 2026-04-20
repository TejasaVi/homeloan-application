import React from 'react';

export function Label({ className = '', children }) {
  return <label className={className}>{children}</label>;
}
