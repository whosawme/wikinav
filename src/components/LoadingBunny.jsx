import React from 'react';

const LoadingBunny = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
    <div className="relative w-32 h-32">
      <svg 
        className="absolute animate-bounce"
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="60" r="30" fill="#F3F4F6"/>
        <path d="M35 30C35 30 35 10 45 20C55 30 45 40 45 40" fill="#F3F4F6"/>
        <path d="M65 30C65 30 65 10 55 20C45 30 55 40 55 40" fill="#F3F4F6"/>
        <circle cx="40" cy="55" r="3" fill="#374151"/>
        <circle cx="60" cy="55" r="3" fill="#374151"/>
        <path d="M45 65Q50 70 55 65" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div className="mt-24 text-gray-600 animate-pulse">Loading your rabbit hole...</div>
    </div>
  </div>
);

export default LoadingBunny;