'use client';

import React from 'react';
import { SlideProps, COLORS } from '@/data/config';
import { translations } from '@/data/translations';
import SlideLayout from '../SlideLayout';

export default function Slide1Wallet({ language, width, height }: SlideProps) {
  const t = translations[language][1];

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
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Poppins, sans-serif',
          color: 'white',
        }}
      >
        {/* Status Bar */}
        <div style={{ height: '44px', display: 'flex', justifyContent: 'space-between', padding: '0 20px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>09:41</span>
          <div style={{ display: 'flex', gap: '5px' }}>
            <span style={{ fontSize: '12px' }}>📶</span>
            <span style={{ fontSize: '12px' }}>🪫</span>
          </div>
        </div>

        <div style={{ padding: '20px 16px', flex: 1 }}>
          {/* Child Profile Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#6366f1', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🧒</div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Léo</h2>
              <div style={{ display: 'flex', gap: '4px' }}>
                <span style={{ fontSize: '12px' }}>⭐</span>
                <span style={{ fontSize: '12px' }}>⭐</span>
                <span style={{ fontSize: '12px' }}>⭐</span>
              </div>
            </div>
          </div>

          {/* Central Savings Card - Matches User Reference style */}
          <div
            style={{
              background: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)',
              borderRadius: '32px',
              padding: '36px 24px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(13, 148, 136, 0.3)',
              marginBottom: '40px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
             <p style={{ fontSize: '11px', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px 0' }}>
               {language === 'fr' ? 'MA FORTUNE' : language === 'nl' ? 'MIJN FORTUIN' : 'MY FORTUNE'}
             </p>
             <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
               <span style={{ fontSize: '64px', fontWeight: 900 }}>45.00</span>
               <span style={{ fontSize: '32px', opacity: 0.8 }}>€</span>
             </div>
             
             {/* Decorative coins */}
             <div style={{ position: 'absolute', bottom: '-10px', right: '10px', fontSize: '40px', opacity: 0.2 }}>🪙</div>
             <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '40px', opacity: 0.2 }}>💰</div>
          </div>

          {/* Activity Section */}
          <h3 style={{ fontSize: '14px', fontWeight: 700, opacity: 0.7, marginBottom: '16px', marginLeft: '8px' }}>
            {language === 'fr' ? 'ACTIVITÉ RÉCENTE' : language === 'nl' ? 'RECENTE ACTIVITEIT' : 'RECENT ACTIVITY'}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { title: language === 'fr' ? 'Ranger la chambre' : language === 'nl' ? 'Kamer opruimen' : 'Clean room', amount: '+2,00 €', icon: '🧹' },
              { title: language === 'fr' ? 'Sortir les poubelles' : language === 'nl' ? 'Vuilnis buiten' : 'Take trash out', amount: '+1,50 €', icon: '🗑️' },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '18px', background: 'rgba(255,255,255,0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.title}</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#4ade80' }}>{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Child Tab Bar */}
        <div style={{ height: '70px', background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ fontSize: '24px' }}>👛</div>
          <div style={{ fontSize: '24px', opacity: 0.4 }}>🎯</div>
          <div style={{ fontSize: '24px', opacity: 0.4 }}>🏆</div>
          <div style={{ fontSize: '24px', opacity: 0.4 }}>⚙️</div>
        </div>
      </div>
    </SlideLayout>
  );
}
