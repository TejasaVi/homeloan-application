import React from 'react';

export function Table({ className = '', children }) {
  return <table className={`table ${className}`.trim()}>{children}</table>;
}

export function TableHeader({ className = '', children }) {
  return <thead className={className}>{children}</thead>;
}

export function TableBody({ className = '', children }) {
  return <tbody className={className}>{children}</tbody>;
}

export function TableRow({ className = '', children }) {
  return <tr className={className}>{children}</tr>;
}

export function TableHead({ className = '', children }) {
  return <th className={className}>{children}</th>;
}

export function TableCell({ className = '', children }) {
  return <td className={className}>{children}</td>;
}
