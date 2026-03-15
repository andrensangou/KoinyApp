import React, { useEffect, useState } from 'react';
import { subscriptionService, SubscriptionProduct, SubscriptionState } from '../services/subscription';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribed: () => void;
  t: any;
  language: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSubscribed,
  t,
  language
}) => {
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionState>({ isSubscribed: false });
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      checkSubscriptionStatus();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const prods = await subscriptionService.getProducts();
      setProducts(prods);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
    try {
      const success = await subscriptionService.purchaseSubscription(productId);
      if (success) {
        setSuccessMessage('✅');
        setTimeout(() => {
          onSubscribed();
          onClose();
        }, 2000);
      } else {
        // Achat annulé par l'utilisateur — pas d'erreur
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Erreur achat:', error);
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const restored = await subscriptionService.restorePurchases();
      if (restored) {
        setSuccessMessage('✅');
        setTimeout(() => {
          onSubscribed();
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur restauration:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  // Afficher l'écran de succès
  if (successMessage) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center max-w-sm animate-in zoom-in duration-300">
          <div className="mb-4 text-6xl animate-bounce">✅</div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {language === 'fr' ? 'Abonnement Activé!' : (language === 'nl' ? 'Abonnement Geactiveerd!' : 'Subscription Active!')}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            {language === 'fr' ? 'Bienvenue chez Koiny Premium!' : (language === 'nl' ? 'Welkom bij Koiny Premium!' : 'Welcome to Koiny Premium!')}
          </p>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {language === 'fr' ? 'Fermeture dans quelques secondes...' : (language === 'nl' ? 'Wordt gesloten in enkele seconden...' : 'Closing in a few seconds...')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end">
      <div className="w-full bg-white dark:bg-slate-900 rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t?.parent?.premium?.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <i className="fa-solid fa-times text-xl text-slate-600 dark:text-slate-400"></i>
          </button>
        </div>

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">
          {t?.parent?.premium?.desc}
        </p>

        {/* Features */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 mb-6 border border-indigo-200 dark:border-indigo-800">
          <h3 className="font-bold text-slate-900 dark:text-white mb-3">
            {t?.parent?.premium?.featuresTitle}
          </h3>
          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <i className="fa-solid fa-check text-green-500"></i>
              {t?.parent?.premium?.featureMissions}
            </li>
            <li className="flex items-center gap-2">
              <i className="fa-solid fa-check text-green-500"></i>
              {t?.parent?.premium?.featureChildren}
            </li>
            <li className="flex items-center gap-2">
              <i className="fa-solid fa-check text-green-500"></i>
              {t?.parent?.premium?.featureStats}
            </li>
            <li className="flex items-center gap-2">
              <i className="fa-solid fa-check text-green-500"></i>
              {t?.parent?.premium?.featureFlexible}
            </li>
          </ul>
        </div>

        {/* Trial Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-6 border border-blue-200 dark:border-blue-800">
          <p className="text-center text-sm font-semibold text-blue-900 dark:text-blue-300">
            {t?.parent?.premium?.trialBadge}
          </p>
        </div>

        {/* Subscription Options */}
        <div className="space-y-3 mb-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin">
                <i className="fa-solid fa-spinner text-indigo-600 text-2xl"></i>
              </div>
            </div>
          ) : (
            products.map(product => {
              const isCurrentSubscription = subscriptionStatus.productId === product.id;
              const isDisabled = isLoading || isCurrentSubscription;

              return (
                <button
                  key={product.id}
                  onClick={() => !isCurrentSubscription && handlePurchase(product.id)}
                  disabled={isDisabled}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left group ${
                    isCurrentSubscription
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600 cursor-default'
                      : 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-bold ${
                          isCurrentSubscription
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                        }`}>
                          {product.id.includes('monthly') ? t.parent.premium.monthlyTitle : t.parent.premium.yearlyTitle}
                        </h4>
                        {isCurrentSubscription && (
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-500 text-white">
                            {language === 'fr' ? 'Actif' : (language === 'nl' ? 'Actief' : 'Active')}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${
                        isCurrentSubscription
                          ? 'text-green-600 dark:text-green-300'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {product.id.includes('monthly') ? t.parent.premium.monthlyDesc : t.parent.premium.yearlyDesc}
                      </p>
                    </div>
                    <span className={`text-lg font-bold ${
                      isCurrentSubscription
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {product.price}
                    </span>
                  </div>
                  {product.duration === 'year' && (
                    <div className="mt-2 inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                      {language === 'fr' ? '💰 Économies 30%' : (language === 'nl' ? '💰 Bespaar 30%' : '💰 Save 30%')}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Restore Purchases Button */}
        <button
          onClick={handleRestore}
          disabled={isRestoring}
          className="w-full py-3 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline transition-colors mb-4"
        >
          {isRestoring ? (
            <i className="fa-solid fa-spinner animate-spin mr-2"></i>
          ) : null}
          {language === 'fr' ? 'Restaurer mes achats' : (language === 'nl' ? 'Mijn aankopen herstellen' : 'Restore my purchases')}
        </button>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl mb-4">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            {t?.parent?.premium?.footerNote}
          </p>
        </div>
      </div>
    </div>
  );
};
