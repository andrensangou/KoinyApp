'use client';

import React from 'react';
import { SlideProps, COLORS } from '@/data/config';
import { translations } from '@/data/translations';
import SlideLayout from '../SlideLayout';

export default function Slide3Goals({ language, width, height }: SlideProps) {
  const t = translations[language][3];

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
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 5px 0' }}>
              {language === 'fr' ? 'Mes Objectifs' : language === 'nl' ? 'Mijn Doelen' : 'My Goals'}
            </h2>
            <p style={{ fontSize: '12px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>2 goals in progress</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { icon: '🚀', name: 'Lego Star Wars', target: 30, current: 14.50, color: '#2dd4bf' },
              { icon: '🚴', name: language === 'fr' ? 'Vélo' : language === 'nl' ? 'Fiets' : 'Bike', target: 120, current: 45, color: '#f59e0b' },
            ].map((goal, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '24px',
                  padding: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '32px' }}>{goal.icon}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{goal.name}</h3>
                    <p style={{ fontSize: '12px', opacity: 0.6, margin: 0 }}>{goal.current}€ / {goal.target}€</p>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: goal.color }}>
                    {Math.round((goal.current / goal.target) * 100)}%
                  </div>
                </div>

                <div style={{ height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${(goal.current / goal.target) * 100}%`, 
                    background: `linear-gradient(90deg, ${goal.color}88 0%, ${goal.color} 100%)`, 
                    borderRadius: '6px',
                    boxShadow: `0 0 15px ${goal.color}44`
                  }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ 
            marginTop: '30px', 
            padding: '24px', 
            borderRadius: '24px', 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', 
            border: '2px dashed rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>🎯</span>
            <span style={{ fontSize: '14px', fontWeight: 700, opacity: 0.5 }}>{language === 'fr' ? 'Nouvel objectif' : language === 'nl' ? 'Nieuw doel' : 'New goal'}</span>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ height: '70px', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: '10px' }}>
          <div style={{ fontSize: '24px', opacity: 0.4 }}>👛</div>
          <div style={{ fontSize: '24px', opacity: 1 }}>🎯</div>
          <div style={{ fontSize: '24px', opacity: 0.4 }}>🏆</div>
          <div style={{ fontSize: '24px', opacity: 0.4 }}>⚙️</div>
        </div>
      </div>
    </SlideLayout>
  );
}
