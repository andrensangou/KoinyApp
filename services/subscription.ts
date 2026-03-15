/**
 * Service d'Abonnement Koiny
 * Gère les In-App Purchases via RevenueCat SDK
 */

import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL, PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor';

// ⚠️ Remplacer par ta vraie clé API RevenueCat (appl_...)
const REVENUECAT_API_KEY = 'appl_CdFRyKVUQPCUdodtGAIsnJsEpsT';

export interface SubscriptionProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  duration: 'month' | 'year';
}

export interface SubscriptionState {
  isSubscribed: boolean;
  expiryDate?: string;
  productId?: string;
  trialDaysRemaining?: number;
}

const ENTITLEMENT_ID = 'Koiny Premium'; // L'ID de l'entitlement dans RevenueCat

class SubscriptionService {
  private isNative: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Initialise RevenueCat — à appeler 1 seule fois au démarrage de l'app
   */
  async initialize(userId?: string): Promise<void> {
    if (this.initialized) return;

    if (!this.isNative) {
      console.log('[Subscription] Mode web — RevenueCat non disponible');
      return;
    }

    try {
      console.log('[Subscription] Initialisation RevenueCat...');

      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: userId || null // null = RevenueCat génère un ID anonyme
      });

      this.initialized = true;
      console.log('[Subscription] ✅ RevenueCat initialisé');
    } catch (error) {
      console.error('[Subscription] ❌ Erreur initialisation RevenueCat:', error);
    }
  }

  /**
   * Récupère les produits d'abonnement disponibles depuis RevenueCat
   */
  async getProducts(): Promise<SubscriptionProduct[]> {
    if (!this.isNative || !this.initialized) {
      console.log('[Subscription] Mode dev — produits mockés');
      return this.getMockProducts();
    }

    try {
      console.log('[Subscription] Récupération des offres RevenueCat...');
      const offerings = await Purchases.getOfferings();

      if (!offerings.current || !offerings.current.availablePackages.length) {
        console.warn('[Subscription] Aucune offre trouvée dans RevenueCat');
        return [];
      }

      return offerings.current.availablePackages.map(pkg => ({
        id: pkg.product.identifier,
        title: pkg.product.title || pkg.product.identifier,
        description: pkg.product.description || '',
        price: pkg.product.priceString,
        duration: pkg.packageType === 'ANNUAL' ? 'year' : 'month'
      }));
    } catch (error) {
      console.error('[Subscription] Erreur récupération offres:', error);
      return [];
    }
  }

  /**
   * Initie un achat d'abonnement via RevenueCat
   */
  async purchaseSubscription(productId: string): Promise<boolean> {
    console.log('[Subscription] Achat en cours:', productId);

    if (!this.isNative || !this.initialized) {
      console.log('[Subscription] Mode dev — achat simulé');
      return this.simulatePurchase();
    }

    try {
      // Récupérer les offres pour trouver le bon package
      const offerings = await Purchases.getOfferings();
      if (!offerings.current) {
        console.error('[Subscription] Pas d\'offre courante');
        return false;
      }

      const pkg = offerings.current.availablePackages.find(
        p => p.product.identifier === productId
      );

      if (!pkg) {
        console.error('[Subscription] Package non trouvé:', productId);
        return false;
      }

      // Lancer l'achat
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });

      // Vérifier si l'entitlement est actif après l'achat
      // Fallback: vérifier aussi activeSubscriptions (Xcode sandbox peut ne pas remplir entitlements.active)
      const PREMIUM_PRODUCTS = ['com.koiny.premium.monthly', 'com.koiny.premium.yearly'];
      const isPremium =
        customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined ||
        customerInfo.activeSubscriptions.some(id => PREMIUM_PRODUCTS.includes(id));

      if (isPremium) {
        console.log('[Subscription] ✅ Achat réussi, Premium activé !');
        localStorage.setItem('koiny_premium_active', 'true');
        return true;
      }

      console.warn('[Subscription] Achat terminé mais entitlement non actif');
      return false;
    } catch (error: any) {
      // L'utilisateur a annulé l'achat
      if (error?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        console.log('[Subscription] Achat annulé par l\'utilisateur');
        return false;
      }

      console.error('[Subscription] ❌ Erreur achat:', error);
      throw error;
    }
  }

  /**
   * Vérifie l'état de l'abonnement actuel via RevenueCat
   */
  async getSubscriptionStatus(): Promise<SubscriptionState> {
    if (!this.isNative || !this.initialized) {
      // En mode web, vérifier le localStorage
      const isPremium = localStorage.getItem('koiny_premium_active') === 'true';
      return { isSubscribed: isPremium };
    }

    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const PREMIUM_PRODUCTS = ['com.koiny.premium.monthly', 'com.koiny.premium.yearly'];
      const hasActiveSubscription = customerInfo.activeSubscriptions.some(id => PREMIUM_PRODUCTS.includes(id));

      if (entitlement) {
        return {
          isSubscribed: true,
          expiryDate: entitlement.expirationDate || undefined,
          productId: entitlement.productIdentifier
        };
      }

      if (hasActiveSubscription) {
        const activeProductId = customerInfo.activeSubscriptions.find(id => PREMIUM_PRODUCTS.includes(id));
        return { isSubscribed: true, productId: activeProductId };
      }

      // Pas d'entitlement actif → mettre à jour localStorage
      localStorage.removeItem('koiny_premium_active');
      return { isSubscribed: false };
    } catch (error) {
      console.error('[Subscription] Erreur vérification statut:', error);
      // Fallback localStorage
      const isPremium = localStorage.getItem('koiny_premium_active') === 'true';
      return { isSubscribed: isPremium };
    }
  }

  /**
   * Restaure les achats précédents via RevenueCat
   */
  async restorePurchases(): Promise<boolean> {
    console.log('[Subscription] Restauration des achats...');

    if (!this.isNative || !this.initialized) {
      console.log('[Subscription] Restauration non disponible en mode web');
      return false;
    }

    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const PREMIUM_PRODUCTS = ['com.koiny.premium.monthly', 'com.koiny.premium.yearly'];
      const isPremium =
        customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined ||
        customerInfo.activeSubscriptions.some(id => PREMIUM_PRODUCTS.includes(id));

      if (isPremium) {
        localStorage.setItem('koiny_premium_active', 'true');
        console.log('[Subscription] ✅ Achats restaurés, Premium actif');
      } else {
        localStorage.removeItem('koiny_premium_active');
        console.log('[Subscription] Aucun achat à restaurer');
      }

      return isPremium;
    } catch (error) {
      console.error('[Subscription] ❌ Erreur restauration:', error);
      return false;
    }
  }

  /**
   * Identifie l'utilisateur dans RevenueCat (après login)
   */
  async loginUser(userId: string): Promise<void> {
    if (!this.isNative || !this.initialized) return;

    try {
      await Purchases.logIn({ appUserID: userId });
      console.log('[Subscription] ✅ Utilisateur identifié dans RevenueCat:', userId);

      // Vérifier le statut après login
      const status = await this.getSubscriptionStatus();
      if (status.isSubscribed) {
        localStorage.setItem('koiny_premium_active', 'true');
      }
    } catch (error) {
      console.error('[Subscription] Erreur login RevenueCat:', error);
    }
  }

  /**
   * Déconnecte l'utilisateur de RevenueCat (après logout)
   */
  async logoutUser(): Promise<void> {
    if (!this.isNative || !this.initialized) return;

    try {
      await Purchases.logOut();
      console.log('[Subscription] Utilisateur déconnecté de RevenueCat');
    } catch (error) {
      console.error('[Subscription] Erreur logout RevenueCat:', error);
    }
  }

  // ─── Helpers privés ───────────────────────────────────────

  private getMockProducts(): SubscriptionProduct[] {
    return [
      {
        id: 'com.koiny.premium.monthly',
        title: 'Koiny Premium - Mensuel',
        description: '14 jours gratuits, puis 1,99€/mois',
        price: '1,99€/mois',
        duration: 'month'
      },
      {
        id: 'com.koiny.premium.yearly',
        title: 'Koiny Premium - Annuel',
        description: '14 jours gratuits, puis 16,99€/an',
        price: '16,99€/an',
        duration: 'year'
      }
    ];
  }

  private simulatePurchase(): boolean {
    console.log('[Subscription] TEST MODE — Abonnement simulé activé');
    localStorage.setItem('koiny_premium_active', 'true');
    return true;
  }
}

export const subscriptionService = new SubscriptionService();
