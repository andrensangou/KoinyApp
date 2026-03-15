'use client';

import React from 'react';
import { SlideProps, COLORS } from '@/data/config';
import { translations } from '@/data/translations';
import SlideLayout from '../SlideLayout';

export default function Slide5Duo({ language, width, height }: SlideProps) {
  const t = translations[language][5];

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
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
          padding: '40px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Poppins, sans-serif',
          gap: '24px',
        }}
      >
        {/* Child Interface */}
        <div
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '11px', opacity: 0.9, margin: '0 0 8px 0', fontWeight: 600 }}>
            👧 {language === 'fr' ? 'Interface Enfant' : language === 'nl' ? 'Kindinterface' : 'Child Interface'}
          </p>
          <p style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 8px 0' }}>14,50 €</p>
          <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>
            {language === 'fr' ? 'Mes missions' : language === 'nl' ? 'Mijn taken' : 'My missions'}
          </p>
        </div>

        {/* Arrow / Connection */}
        <div style={{ fontSize: '24px' }}>↔️</div>

        {/* Parent Interface */}
        <div
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '11px', opacity: 0.9, margin: '0 0 8px 0', fontWeight: 600 }}>
            👨 {language === 'fr' ? 'Interface Parent' : language === 'nl' ? 'Ouderinterface' : 'Parent Interface'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 4px 0' }}>2</p>
              <p style={{ fontSize: '10px', opacity: 0.8, margin: 0 }}>
                {language === 'fr' ? 'Enfants' : language === 'nl' ? 'Kinderen' : 'Children'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 4px 0' }}>12</p>
              <p style={{ fontSize: '10px', opacity: 0.8, margin: 0 }}>
                {language === 'fr' ? 'Missions' : language === 'nl' ? 'Taken' : 'Missions'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 4px 0' }}>6</p>
              <p style={{ fontSize: '10px', opacity: 0.8, margin: 0 }}>
                {language === 'fr' ? 'Objectifs' : language === 'nl' ? 'Doelen' : 'Goals'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
