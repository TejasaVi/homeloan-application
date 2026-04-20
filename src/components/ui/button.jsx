import React from 'react';

export function Button({ className = '', children, ...props }) {
  return (
    <button className={`btn ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
