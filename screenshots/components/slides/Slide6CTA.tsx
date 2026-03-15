'use client';

import React from 'react';
import { SlideProps, COLORS } from '@/data/config';
import { translations } from '@/data/translations';
import SlideLayout from '../SlideLayout';

export default function Slide6CTA({ language, width, height }: SlideProps) {
  const t = translations[language][6];

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
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Poppins, sans-serif',
          textAlign: 'center',
        }}
      >
        {/* Mascot / Logo area */}
        <div
          style={{
            fontSize: '80px',
            marginBottom: '30px',
            animation: 'pulse 2s infinite',
          }}
        >
          🪙
        </div>

        {/* Benefits list */}
        <div style={{ marginBottom: '40px', width: '100%' }}>
          {[
            { icon: '✅', text: language === 'fr' ? '100% Virtuel' : language === 'nl' ? '100% Virtueel' : '100% Virtual' },
            { icon: '👨‍👩‍👧‍👦', text: language === 'fr' ? 'Pour Toute la Famille' : language === 'nl' ? 'Voor het Hele Gezin' : 'For the Whole Family' },
            { icon: '🎮', text: language === 'fr' ? 'Gamifié & Fun' : language === 'nl' ? 'Gamified & Leuk' : 'Gamified & Fun' },
            { icon: '🔒', text: language === 'fr' ? 'Sécurisé & Privé' : language === 'nl' ? 'Veilig & Privé' : 'Secure & Private' },
          ].map((benefit, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '14px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
              }}
            >
              <span style={{ fontSize: '20px' }}>{benefit.icon}</span>
              <span>{benefit.text}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          style={{
            width: '90%',
            maxWidth: '280px',
            padding: '16px 32px',
            background: COLORS.accent,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)',
            marginBottom: '16px',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          {language === 'fr' ? 'Télécharger Gratuitement' : language === 'nl' ? 'Gratis Downloaden' : 'Download Free'}
        </button>

        {/* Premium info */}
        <p style={{ fontSize: '11px', color: '#666', margin: '16px 0 0 0', maxWidth: '90%' }}>
          {language === 'fr'
            ? 'Premium à 1,99€/mois • Aucune donnée réelle • 100% Virtuel'
            : language === 'nl'
            ? 'Premium voor €1,99/maand • Geen echte gegevens • 100% Virtueel'
            : 'Premium at $1.99/month • No real data • 100% Virtual'}
        </p>
      </div>
    </SlideLayout>
  );
}
