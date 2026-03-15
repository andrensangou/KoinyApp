'use client';

import React from 'react';
import { SlideProps, COLORS } from '@/data/config';
import { translations } from '@/data/translations';
import SlideLayout from '../SlideLayout';

export default function Slide4ParentDash({ language, width, height }: SlideProps) {
  const t = translations[language][4];

  return (
    <SlideLayout
      title={t.title}
      subtitle={t.subtitle}
      width={width}
      height={height}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, #3730A3 0%, #1E1B4B 100%)',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Poppins, sans-serif',
          color: 'white',
        }}
      >
        {/* Status Bar Mockup */}
        <div style={{ height: '44px', display: 'flex', justifyContent: 'space-between', padding: '0 20px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>09:41</span>
          <div style={{ display: 'flex', gap: '5px' }}>
            <span style={{ fontSize: '12px' }}>📶</span>
            <span style={{ fontSize: '12px' }}>🪫</span>
          </div>
        </div>

        <div style={{ padding: '0 16px', flex: 1 }}>
          {/* Header Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ background: '#f59e0b', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>👑</div>
            <div style={{ background: '#ef4444', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>⏻</div>
          </div>

          {/* Glass Card - Stats */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>📊</div>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  {language === 'fr' ? 'Bilan 7 jours' : language === 'nl' ? 'Overzicht van de afgelopen 7 dagen' : 'Last 7 Days Overview'}
                </p>
                <p style={{ fontSize: '10px', opacity: 0.6, margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>LAST SEVEN DAYS</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, opacity: 0.6, textAlign: 'center', margin: '0 0 5px 0' }}>WINST</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#4ade80', margin: 0 }}>+0.00€</p>
              </div>
              <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }}></div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, opacity: 0.6, textAlign: 'center', margin: '0 0 5px 0' }}>OUTCOME</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#fb7185', margin: 0 }}>-0.00€</p>
              </div>
            </div>
          </div>

          {/* Child Selector */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
             <div style={{ background: '#0096a6', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>Adele</span>
             </div>
          </div>

          {/* Savings Tool Card - Teal Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)',
              borderRadius: '32px',
              padding: '32px',
              position: 'relative',
              boxShadow: '0 10px 25px rgba(13, 148, 136, 0.2)',
            }}
          >
            <p style={{ fontSize: '11px', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px 0' }}>
              {language === 'fr' ? 'TIRELIRE DE' : language === 'nl' ? 'SPAARPOT VAN' : 'SAVINGS OF'}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '48px', fontWeight: 900 }}>0.00</span>
              <span style={{ fontSize: '24px', opacity: 0.8 }}>€</span>
            </div>

            <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '24px' }}>+</div>
               <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '24px' }}>-</div>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div style={{ height: '70px', background: '#111827', display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: '10px' }}>
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ fontSize: '20px' }}>🏠</div>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#6366f1' }}></div>
           </div>
           <div style={{ fontSize: '20px', opacity: 0.4 }}>📅</div>
           <div style={{ width: '56px', height: '56px', borderRadius: '28px', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-30px', border: '4px solid #111827', fontWeight: 900, fontSize: '24px' }}>+</div>
           <div style={{ fontSize: '20px', opacity: 0.4 }}>💬</div>
           <div style={{ fontSize: '20px', opacity: 0.4 }}>👤</div>
        </div>
      </div>
    </SlideLayout>
  );
}
