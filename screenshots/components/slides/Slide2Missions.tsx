'use client';

import React from 'react';
import { SlideProps, COLORS } from '@/data/config';
import { translations } from '@/data/translations';
import SlideLayout from '../SlideLayout';

export default function Slide2Missions({ language, width, height }: SlideProps) {
  const t = translations[language][2];

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
              {language === 'fr' ? 'Mes Missions' : language === 'nl' ? 'Mijn Taken' : 'My Missions'}
            </h2>
            <p style={{ fontSize: '12px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>4 active missions</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { icon: '🧹', title: language === 'fr' ? 'Ranger la chambre' : language === 'nl' ? 'Kamer opruimen' : 'Clean room', reward: '2,00', color: '#f59e0b' },
              { icon: '🗑️', title: language === 'fr' ? 'Sortir les poubelles' : language === 'nl' ? 'Vuilnis buiten' : 'Take trash', reward: '1,00', color: '#ec4899' },
              { icon: '🍽️', title: language === 'fr' ? 'Faire la vaisselle' : language === 'nl' ? 'Afwassen' : 'Do dishes', reward: '1,50', color: '#10b981' },
              { icon: '🚿', title: language === 'fr' ? 'Prendre une douche' : language === 'nl' ? 'Douchen' : 'Take shower', reward: '0,50', color: '#3b82f6' },
            ].map((mission, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px',
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '14px', 
                  background: `${mission.color}20`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '22px',
                  marginRight: '16px',
                  border: `1px solid ${mission.color}40`
                }}>
                  {mission.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{mission.title}</p>
                </div>
                <div style={{ 
                  background: mission.color, 
                  padding: '6px 12px', 
                  borderRadius: '10px', 
                  fontWeight: 900, 
                  fontSize: '13px',
                  boxShadow: `0 4px 10px ${mission.color}40`
                }}>
                  +{mission.reward}€
                </div>
              </div>
            ))}
          </div>

          {/* New Mission Shadow Card */}
          <div style={{ 
            marginTop: '24px', 
            padding: '24px', 
            borderRadius: '24px', 
            background: 'rgba(255,255,255,0.03)', 
            border: '2px dashed rgba(255,255,255,0.1)',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 700,
            fontSize: '14px'
          }}>
            + {language === 'fr' ? 'Nouvelle mission' : language === 'nl' ? 'Nieuwe taak' : 'New mission'}
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ height: '70px', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: '10px' }}>
          <div style={{ fontSize: '24px', opacity: 0.4 }}>👛</div>
          <div style={{ fontSize: '24px' }}>🎯</div>
          <div style={{ fontSize: '24px', opacity: 0.4 }}>🏆</div>
          <div style={{ fontSize: '24px', opacity: 0.4 }}>⚙️</div>
        </div>
      </div>
    </SlideLayout>
  );
}
