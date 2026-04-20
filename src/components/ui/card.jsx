import React from 'react';

export function Card({ className = '', children }) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}

export function CardContent({ className = '', children }) {
  return <div className={`card-content ${className}`.trim()}>{children}</div>;
}
