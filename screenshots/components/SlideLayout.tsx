'use client';

import React from 'react';
import { COLORS } from '@/data/config';
import IPhoneMockup from './IPhoneMockup';

interface SlideLayoutProps {
  title: string;
  subtitle: string;
  width: number;
  height: number;
  children: React.ReactNode;
}

export default function SlideLayout({
  title,
  subtitle,
  width,
  height,
  children,
}: SlideLayoutProps) {
  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: '#3730A3',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '100px 60px 0',
        fontFamily: 'Poppins, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Premium Background Mesh */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #4338CA 0%, #312E81 100%)', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '70%', height: '70%', background: 'radial-gradient(circle, rgba(96, 165, 250, 0.3) 0%, transparent 70%)', zIndex: 1, filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '80%', height: '80%', background: 'radial-gradient(circle, rgba(167, 139, 250, 0.2) 0%, transparent 70%)', zIndex: 1, filter: 'blur(80px)' }} />

      {/* Title and Subtitle */}
      <div style={{ textAlign: 'center', marginBottom: '80px', zIndex: 10, position: 'relative' }}>
        <h1
          style={{
            color: COLORS.white,
            fontSize: `${width * 0.11}px`,
            fontWeight: 900,
            margin: '0 0 24px 0',
            lineHeight: '1.0',
            letterSpacing: '-2px',
            textShadow: '0 10px 30px rgba(0,0,0,0.2)',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            color: COLORS.white,
            fontSize: `${width * 0.045}px`,
            fontWeight: 600,
            margin: 0,
            opacity: 0.9,
            lineHeight: '1.4',
            maxWidth: '85%',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* iPhone Mockup with children */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%', zIndex: 20 }}>
        <div style={{ transform: 'translateY(80px)', width: '85%' }}>
          <IPhoneMockup width={width * 0.85} height={(width * 0.85) * (812/375)}>
            {children}
          </IPhoneMockup>
        </div>
      </div>

      {/* Decorative Blobs */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '-5%',
          width: '150px',
          height: '150px',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          borderRadius: '40px',
          transform: 'rotate(15deg)',
          zIndex: 5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '-5%',
          width: '200px',
          height: '200px',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(30px)',
          borderRadius: '50px',
          transform: 'rotate(-10deg)',
          zIndex: 5,
        }}
      />
    </div>
  );
}
