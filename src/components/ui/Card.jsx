import React from 'react';

export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`rounded-2xl bg-white border border-gray-100 shadow-card ${className}`} {...props}>
      {children}
    </div>
  );
}
