'use client';

import React from 'react';

interface IPhoneMockupProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
}

export default function IPhoneMockup({
  children,
  width = 375,
  height = 812,
}: IPhoneMockupProps) {
  // On utilise directement width et height passés par le parent
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: `${width * 0.16}px`,
          border: `${width * 0.02}px solid #000`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#000',
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${width * 0.4}px`,
            height: `${width * 0.08}px`,
            backgroundColor: '#000',
            borderRadius: `0 0 ${width * 0.08}px ${width * 0.08}px`,
            zIndex: 10,
          }}
        />

        {/* Screen content */}
        <div
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
