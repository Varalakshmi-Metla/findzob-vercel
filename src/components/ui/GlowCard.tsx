import React from 'react';

export const GlowCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => (
  <div className={`relative ${className}`} onClick={onClick}>
    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
    <div className="relative bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800/50">
      {children}
    </div>
  </div>
);
