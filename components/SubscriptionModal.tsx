import React, { useEffect, useState } from 'react';
import { subscriptionService, SubscriptionProduct, SubscriptionState } from '../services/subscription';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useModal } from '../hooks/useModal';
import { isAndroid } from '../hooks/usePlatform';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribed: () => void;
  t: any;
  language: string;
  isOfflineMode?: boolean;
}

const FEATURES = [
  { icon: 'fa-infinity',  color: '#818cf8', bg: '#eef2ff' },
  { icon: 'fa-children',  color: '#10b981', bg: '#ecfdf5' },
  { icon: 'fa-chart-bar', color: '#f59e0b', bg: '#fffbeb' },
  { icon: 'fa-rotate',    color: '#6366f1', bg: '#eef2ff' },
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSubscribed,
  t,
  language,
  isOfflineMode
}) => {
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionState>({ isSubscribed: false });
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  useModal(isOpen);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      loadProducts();
      checkSubscriptionStatus();
    }
  }, [isOpen]);

  // Default-select yearly plan when products load
  useEffect(() => {
    if (products.length > 0 && !selectedPlan) {
      const yearly = products.find(p => p.id.includes('yearly') || p.duration === 'year');
      setSelectedPlan(yearly?.id || products[0].id);
    }
  }, [products]);

  const loadProducts = async (retries = 3) => {
    setIsLoadingProducts(true);
    try {
      const prods = await subscriptionService.getProducts();
      if (prods.length === 0 && retries > 0) {
        await new Promise(r => setTimeout(r, 3000));
        return loadProducts(retries - 1);
      }
      setProducts(prods);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const status = await subscriptionService.getSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Erreur vérification abonnement:', error);
    }
  };

  const handlePurchase = async (productId: string) => {
    if (purchasingProductId) return;
    setPurchasingProductId(productId);
    setErrorMessage('');
    try {
      const success = await subscriptionService.purchaseSubscription(productId);
      if (success) {
        setSubscriptionStatus({ isSubscribed: true, productId });
        setSuccessMessage('✅');
        setTimeout(() => {
          onSubscribed();
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur achat:', error);
      setErrorMessage(
        language === 'fr' ? 'Une erreur est survenue. Réessayez.' :
        language === 'nl' ? 'Er is een fout opgetreden. Probeer opnieuw.' :
        'An error occurred. Please try again.'
      );
    } finally {
      setPurchasingProductId(null);
    }
  };

  const handleManageSubscription = async () => {
    const url = 'https://apps.apple.com/account/subscriptions';
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setErrorMessage('');
    try {
      const restored = await subscriptionService.restorePurchases();
      if (restored) {
        setSuccessMessage('✅');
        setTimeout(() => {
          onSubscribed();
          onClose();
        }, 2000);
      }
      if (products.length === 0) {
        await loadProducts(1);
      }
    } catch (error) {
      console.error('Erreur restauration:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  // Success screen
  if (successMessage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: '#0f172a' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '70%', height: '70%', borderRadius: '50%', background: 'rgba(99,102,241,0.08)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 88, height: 88, borderRadius: 28, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <i className="fa-solid fa-check" style={{ fontSize: 36, color: '#34d399' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 8 }}>
            {language === 'fr' ? 'Bienvenue chez Premium!' : language === 'nl' ? 'Welkom bij Premium!' : 'Welcome to Premium!'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.7)', fontWeight: 600 }}>
            {language === 'fr' ? 'Votre essai de 7 jours a démarré' : language === 'nl' ? 'Uw proefperiode van 7 dagen is gestart' : 'Your 7-day free trial has started'}
          </div>
        </div>
      </div>
    );
  }

  /* ── Android — bottom sheet ── */
  if (isAndroid) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end" onClick={onClose}>
        <div className="w-full bg-white dark:bg-slate-900 rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* Android handle bar */}
          <div className="flex justify-center mb-4 -mt-2">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t?.parent?.premium?.title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
              <i className="fa-solid fa-times text-xl text-slate-600 dark:text-slate-400"></i>
            </button>
          </div>

          <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">{t?.parent?.premium?.desc}</p>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 mb-6 border border-indigo-200 dark:border-indigo-800">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">{t?.parent?.premium?.featuresTitle}</h3>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2"><i className="fa-solid fa-check text-green-500"></i>{t?.parent?.premium?.featureMissions}</li>
              <li className="flex items-center gap-2"><i className="fa-solid fa-check text-green-500"></i>{t?.parent?.premium?.featureChildren}</li>
              <li className="flex items-center gap-2"><i className="fa-solid fa-check text-green-500"></i>{t?.parent?.premium?.featureStats}</li>
              <li className="flex items-center gap-2"><i className="fa-solid fa-check text-green-500"></i>{t?.parent?.premium?.featureFlexible}</li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-6 border border-blue-200 dark:border-blue-800">
            <p className="text-center text-sm font-semibold text-blue-900 dark:text-blue-300">{t?.parent?.premium?.trialBadge}</p>
          </div>

          {isOfflineMode && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-6 border border-red-200 dark:border-red-800">
              <p className="text-center text-sm font-semibold text-red-700 dark:text-red-300">
                <i className="fa-solid fa-wifi-slash mr-2"></i>
                {language === 'fr' ? 'Vous êtes hors ligne. Les achats sont désactivés.' : language === 'nl' ? 'Je bent offline. Aankopen zijn uitgeschakeld.' : 'You are offline. Purchases are disabled.'}
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-3 mb-4 border border-red-200 dark:border-red-800">
              <p className="text-center text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {isLoadingProducts ? (
              <div className="text-center py-8">
                <i className="fa-solid fa-spinner animate-spin text-indigo-600 text-2xl"></i>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">{language === 'fr' ? 'Chargement des offres...' : language === 'nl' ? 'Aanbiedingen laden...' : 'Loading offers...'}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{language === 'fr' ? 'Les offres ne sont pas encore disponibles.' : language === 'nl' ? 'Aanbiedingen zijn nog niet beschikbaar.' : 'Offers are not yet available.'}</p>
                <button onClick={() => loadProducts(2)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition">
                  <i className="fa-solid fa-rotate-right mr-2"></i>{language === 'fr' ? 'Réessayer' : language === 'nl' ? 'Opnieuw proberen' : 'Retry'}
                </button>
              </div>
            ) : (
              products.map(product => {
                const isCurrentSubscription = subscriptionStatus.productId === product.id;
                const isThisPurchasing = purchasingProductId === product.id;
                const isDisabled = !!purchasingProductId || isCurrentSubscription || !!isOfflineMode;
                return (
                  <button key={product.id} onClick={() => !isDisabled && handlePurchase(product.id)} disabled={isDisabled}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left group ${isOfflineMode ? 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-60' : isCurrentSubscription ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600 cursor-default' : isThisPurchasing ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400' : 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          {isThisPurchasing && <i className="fa-solid fa-spinner animate-spin text-indigo-600 dark:text-indigo-400"></i>}
                          <h4 className={`font-bold ${isCurrentSubscription ? 'text-green-700 dark:text-green-400' : 'text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                            {product.id.includes('monthly') ? t.parent.premium.monthlyTitle : t.parent.premium.yearlyTitle}
                          </h4>
                          {isCurrentSubscription && <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-500 text-white">{language === 'fr' ? 'Actif' : language === 'nl' ? 'Actief' : 'Active'}</span>}
                        </div>
                        <p className={`text-sm mt-1 ${isCurrentSubscription ? 'text-green-600 dark:text-green-300' : 'text-slate-600 dark:text-slate-400'}`}>
                          {product.id.includes('monthly') ? t.parent.premium.monthlyDesc : t.parent.premium.yearlyDesc}
                        </p>
                      </div>
                      <span className={`text-lg font-bold ${isCurrentSubscription ? 'text-green-600 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{product.price}</span>
                    </div>
                    {product.duration === 'year' && (
                      <div className="mt-2 inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                        {language === 'fr' ? '💰 Économies 30%' : language === 'nl' ? '💰 Bespaar 30%' : '💰 Save 30%'}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <button onClick={handleRestore} disabled={isRestoring || isOfflineMode}
            className={`w-full py-3 text-sm font-medium transition-colors mb-4 ${isOfflineMode ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-indigo-600 dark:text-indigo-400 hover:underline'}`}>
            {isRestoring && <i className="fa-solid fa-spinner animate-spin mr-2"></i>}
            {language === 'fr' ? 'Restaurer mes achats' : language === 'nl' ? 'Mijn aankopen herstellen' : 'Restore my purchases'}
          </button>

          {subscriptionStatus.isSubscribed && (
            <button onClick={handleManageSubscription} className="w-full py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:underline transition-colors mb-4">
              <i className="fa-solid fa-gear mr-2"></i>
              {language === 'fr' ? 'Gérer mon abonnement' : language === 'nl' ? 'Mijn abonnement beheren' : 'Manage my subscription'}
            </button>
          )}

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl mb-4">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">{isAndroid ? (language === 'fr' ? "L'abonnement sera facturé via votre compte Google Play." : language === 'nl' ? 'Het abonnement wordt gefactureerd via je Google Play account.' : 'The subscription will be charged via your Google Play account.') : t?.parent?.premium?.footerNote}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-2">
              <a href="https://koiny.app/privacy.html#terms" target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">{language === 'fr' ? "Conditions d'utilisation" : language === 'nl' ? 'Gebruiksvoorwaarden' : 'Terms of Use'}</a>
              {' · '}
              <a href="https://koiny.app/privacy.html" target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">{language === 'fr' ? 'Politique de confidentialité' : language === 'nl' ? 'Privacybeleid' : 'Privacy Policy'}</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── iOS — full-screen dark paywall ── */
  const featureLabels = [
    t?.parent?.premium?.featureMissions,
    t?.parent?.premium?.featureChildren,
    t?.parent?.premium?.featureStats,
    t?.parent?.premium?.featureFlexible,
  ];

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#0f172a' }}>
      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: '-10%', left: '-20%', width: '60%', height: '60%', borderRadius: '50%', background: 'rgba(99,102,241,0.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-20%', width: '55%', height: '55%', borderRadius: '50%', background: 'rgba(245,158,11,0.08)', filter: 'blur(70px)', pointerEvents: 'none' }} />

      {/* Status bar spacer */}
      <div style={{ height: 'env(safe-area-inset-top)', minHeight: 44 }} />

      {/* Close button — absolute above scroll layer */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 8px)', left: 20, zIndex: 10 }}>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>
          <i className="fa-solid fa-xmark" style={{ fontSize: 16 }} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto', padding: '0 20px 40px', paddingTop: 'calc(env(safe-area-inset-top) + 56px)', zIndex: 5 }} className="no-scrollbar">

        {/* Offline warning */}
        {isOfflineMode && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fa-solid fa-wifi-slash" style={{ fontSize: 14, color: '#f87171' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>
              {language === 'fr' ? 'Vous êtes hors ligne. Les achats sont désactivés.' : language === 'nl' ? 'Je bent offline. Aankopen zijn uitgeschakeld.' : 'You are offline. Purchases are disabled.'}
            </span>
          </div>
        )}

        {/* Crown hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 22px' }}>
          <div style={{ width: 76, height: 76, borderRadius: 24, background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 20px 50px rgba(245,158,11,0.25)' }}>
            <i className="fa-solid fa-crown" style={{ fontSize: 32, color: '#fbbf24' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', marginBottom: 10, textAlign: 'center' }}>
            Koiny Premium
          </div>
          {/* Trial badge */}
          <div style={{ background: 'linear-gradient(135deg,rgba(129,140,248,0.2),rgba(99,102,241,0.1))', border: '1px solid rgba(129,140,248,0.3)', borderRadius: 100, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 7, backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' }}>
            <i className="fa-solid fa-gift" style={{ fontSize: 11, color: '#818cf8' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(165,180,252,0.95)', letterSpacing: '0.03em' }}>
              {language === 'fr' ? '7 JOURS OFFERTS · ANNULABLE' : language === 'nl' ? '7 DAGEN GRATIS · OPZEGBAAR' : '7-DAY FREE TRIAL · CANCEL ANYTIME'}
            </span>
          </div>
        </div>

        {/* Features card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 22, padding: '6px 4px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 18, backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(148,163,184,0.6)', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '10px 16px 6px' }}>
            {language === 'fr' ? 'CE QUE VOUS DÉBLOQUEZ' : language === 'nl' ? 'WAT U ONTGRENDELT' : 'WHAT YOU UNLOCK'}
          </div>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < FEATURES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fa-solid ${f.icon}`} style={{ fontSize: 14, color: f.color }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(226,232,240,0.9)', flex: 1 }}>{featureLabels[i]}</span>
              <i className="fa-solid fa-check" style={{ fontSize: 11, color: '#34d399', flexShrink: 0 }} />
            </div>
          ))}
        </div>

        {/* Plan selector */}
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(148,163,184,0.6)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
          {language === 'fr' ? 'CHOISIR UN PLAN' : language === 'nl' ? 'KIES EEN PLAN' : 'CHOOSE YOUR PLAN'}
        </div>

        {isLoadingProducts ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, color: '#818cf8' }} />
            <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.7)', fontWeight: 600, marginTop: 10 }}>
              {language === 'fr' ? 'Chargement...' : language === 'nl' ? 'Laden...' : 'Loading...'}
            </div>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.7)', fontWeight: 600, marginBottom: 12 }}>
              {language === 'fr' ? 'Les offres ne sont pas encore disponibles.' : language === 'nl' ? 'Aanbiedingen zijn nog niet beschikbaar.' : 'Offers are not yet available.'}
            </div>
            <button onClick={() => loadProducts(2)} style={{ padding: '10px 20px', borderRadius: 14, background: 'rgba(129,140,248,0.2)', border: '1px solid rgba(129,140,248,0.3)', color: '#818cf8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <i className="fa-solid fa-rotate-right" style={{ marginRight: 8 }} />
              {language === 'fr' ? 'Réessayer' : language === 'nl' ? 'Opnieuw proberen' : 'Retry'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {products.map(product => {
              const isYearly = product.id.includes('yearly') || product.duration === 'year';
              const isMonthly = product.id.includes('monthly') || product.duration === 'month';
              const isSelected = selectedPlan === product.id;
              const isCurrentSubscription = subscriptionStatus.productId === product.id;
              const period = isYearly ? (language === 'fr' ? '/an' : language === 'nl' ? '/jaar' : '/year') : (language === 'fr' ? '/mois' : language === 'nl' ? '/maand' : '/month');
              const desc = isMonthly
                ? (language === 'fr' ? 'Facturé mensuellement' : language === 'nl' ? 'Maandelijks gefactureerd' : 'Billed monthly, cancel anytime')
                : (() => { const rawPrice = parseFloat(product.price.replace(/[^0-9.,]/g, '').replace(',', '.')); const monthly = isNaN(rawPrice) ? '?' : (rawPrice / 12).toFixed(2); const sym = (product.price.match(/^[^0-9\s.,]+/) || ['€'])[0]; return language === 'fr' ? `Seulement ${sym}${monthly}/mois` : language === 'nl' ? `Slechts ${sym}${monthly}/maand` : `Only ${sym}${monthly}/month — best value`; })();
              return (
                <div key={product.id} onClick={() => !isCurrentSubscription && setSelectedPlan(product.id)} style={{
                  borderRadius: 20, padding: '16px 18px', cursor: isCurrentSubscription ? 'default' : 'pointer',
                  background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${isCurrentSubscription ? '#34d399' : isSelected ? 'rgba(129,140,248,0.7)' : 'rgba(255,255,255,0.08)'}`,
                  backdropFilter: 'blur(8px)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                }}>
                  {isYearly && !isCurrentSubscription && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: 'linear-gradient(135deg,#818cf8,#4338ca)', padding: '4px 14px', borderRadius: '0 18px 0 12px', fontSize: 9, fontWeight: 900, color: 'white', letterSpacing: '0.1em' }}>BEST VALUE</div>
                  )}
                  {isCurrentSubscription && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)', padding: '4px 14px', borderRadius: '0 18px 0 12px', fontSize: 9, fontWeight: 900, color: '#34d399', letterSpacing: '0.1em' }}>
                      {language === 'fr' ? 'ACTIF' : language === 'nl' ? 'ACTIEF' : 'ACTIVE'}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isSelected ? '#818cf8' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSelected && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#818cf8' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: isSelected ? 'rgba(199,210,254,0.95)' : 'rgba(226,232,240,0.8)' }}>
                          {isMonthly ? t?.parent?.premium?.monthlyTitle : t?.parent?.premium?.yearlyTitle}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.7)', fontWeight: 600, marginTop: 1 }}>{desc}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: isSelected ? '#818cf8' : 'rgba(226,232,240,0.7)', letterSpacing: '-0.4px' }}>{product.price}</div>
                      <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', fontWeight: 700 }}>{period}</div>
                    </div>
                  </div>
                  {isYearly && (
                    <div style={{ display: 'inline-block', marginTop: 4, marginLeft: 32, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 100, padding: '3px 10px', fontSize: 9, fontWeight: 900, color: '#34d399', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                      {language === 'fr' ? 'ÉCONOMIES 44%' : language === 'nl' ? 'BESPAAR 44%' : 'SAVE 44%'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div style={{ background: 'rgba(251,113,133,0.12)', border: '1px solid rgba(251,113,133,0.25)', borderRadius: 14, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 13, color: '#fb7185' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fb7185' }}>{errorMessage}</span>
          </div>
        )}

        {/* CTA button */}
        {!subscriptionStatus.isSubscribed && products.length > 0 && (
          <button
            onClick={() => selectedPlan && handlePurchase(selectedPlan)}
            disabled={!!purchasingProductId || !selectedPlan || !!isOfflineMode}
            style={{
              width: '100%', height: 58, borderRadius: 20, border: 'none', marginBottom: 14,
              background: purchasingProductId || isOfflineMode ? 'rgba(129,140,248,0.4)' : 'linear-gradient(135deg,#818cf8,#4338ca)',
              color: 'white', fontSize: 15, fontWeight: 900, letterSpacing: '0.04em',
              boxShadow: purchasingProductId || isOfflineMode ? 'none' : '0 12px 36px rgba(79,70,229,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.2s', cursor: purchasingProductId || isOfflineMode ? 'not-allowed' : 'pointer',
            }}
          >
            {purchasingProductId ? (
              <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 16 }} /> {language === 'fr' ? 'Traitement...' : language === 'nl' ? 'Verwerken...' : 'Processing…'}</>
            ) : (
              <><i className="fa-solid fa-rocket" style={{ fontSize: 14 }} /> {language === 'fr' ? 'Démarrer l\'essai gratuit' : language === 'nl' ? 'Start gratis proefperiode' : 'Start free trial'}</>
            )}
          </button>
        )}

        {/* Manage subscription (when already subscribed) */}
        {subscriptionStatus.isSubscribed && (
          <button onClick={handleManageSubscription} style={{ width: '100%', height: 58, borderRadius: 20, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)', color: '#34d399', fontSize: 14, fontWeight: 800, cursor: 'pointer', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <i className="fa-solid fa-gear" style={{ fontSize: 14 }} />
            {language === 'fr' ? 'Gérer mon abonnement' : language === 'nl' ? 'Mijn abonnement beheren' : 'Manage my subscription'}
          </button>
        )}

        {/* Restore */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button onClick={handleRestore} disabled={isRestoring || !!isOfflineMode} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: isOfflineMode ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.7)', padding: '4px 0', cursor: isOfflineMode ? 'not-allowed' : 'pointer' }}>
            {isRestoring && <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />}
            {language === 'fr' ? 'Restaurer mes achats' : language === 'nl' ? 'Mijn aankopen herstellen' : 'Restore purchases'}
          </button>
        </div>

        {/* Legal footer */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10, color: 'rgba(100,116,139,0.8)', fontWeight: 500, textAlign: 'center', lineHeight: 1.7 }}>
            {isAndroid ? (language === 'fr' ? "L'abonnement sera facturé via votre compte Google Play." : language === 'nl' ? 'Het abonnement wordt gefactureerd via je Google Play account.' : 'The subscription will be charged via your Google Play account.') : t?.parent?.premium?.footerNote}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
            <a href="https://koiny.app/privacy.html#terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'rgba(99,102,241,0.6)', fontWeight: 700 }}>
              {language === 'fr' ? "Conditions d'utilisation" : language === 'nl' ? 'Gebruiksvoorwaarden' : 'Terms of Use'}
            </a>
            <span style={{ fontSize: 10, color: 'rgba(100,116,139,0.4)' }}>·</span>
            <a href="https://koiny.app/privacy.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'rgba(99,102,241,0.6)', fontWeight: 700 }}>
              {language === 'fr' ? 'Politique de confidentialité' : language === 'nl' ? 'Privacybeleid' : 'Privacy Policy'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
