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
  const aspectRatio = height / width;
  const maxWidth = 300;
  const displayHeight = (maxWidth * aspectRatio);

  return (
    <div className="flex items-center justify-center">
      <div
        style={{
          width: `${maxWidth}px`,
          height: `${displayHeight}px`,
          borderRadius: '60px',
          border: '8px solid #000',
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
            width: '150px',
            height: '24px',
            backgroundColor: '#000',
            borderRadius: '0 0 30px 30px',
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
