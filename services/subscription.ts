/**
 * Service d'Abonnement Koiny
 * Gère les In-App Purchases via RevenueCat SDK
 */

import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL, PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor';
import { REVENUECAT_API_KEY, IS_PRODUCTION } from '../config';
import { logger } from './logger';

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
const PREMIUM_PRODUCTS = ['com.koiny.premium.monthly', 'com.koiny.premium.yearly'];

class SubscriptionService {
  private isNative: boolean = false;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Initialise RevenueCat — à appeler 1 seule fois au démarrage de l'app
   */
  async initialize(userId?: string): Promise<void> {
    if (this.initialized) return;

    if (!this.isNative) {
      logger.info('[Subscription] Mode web — RevenueCat non disponible');
      return;
    }

    // Créer la promesse d'init pour que les autres méthodes puissent l'attendre
    if (!this.initPromise) {
      this.initPromise = this._doInitialize(userId);
    }

    return this.initPromise;
  }

  private async _doInitialize(userId?: string): Promise<void> {
    try {
      logger.info('[Subscription] Initialisation RevenueCat...');

      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: userId || null // null = RevenueCat génère un ID anonyme
      });

      this.initialized = true;
      logger.info('[Subscription] RevenueCat initialisé');
    } catch (error) {
      logger.error('[Subscription] Erreur initialisation RevenueCat', { error });
    }
  }

  /**
   * Attend que RevenueCat soit initialisé (max 10s)
   */
  private async waitForInit(): Promise<boolean> {
    if (this.initialized) return true;
    if (!this.isNative) return false;

    if (this.initPromise) {
      try {
        // Attendre l'init avec un timeout de 10s
        await Promise.race([
          this.initPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Init timeout')), 10000))
        ]);
        return this.initialized;
      } catch {
        logger.warn('[Subscription] Timeout attente initialisation');
        return false;
      }
    }

    return false;
  }

  /**
   * Récupère les produits d'abonnement disponibles depuis RevenueCat
   */
  async getProducts(): Promise<SubscriptionProduct[]> {
    if (!this.isNative) {
      logger.debug('[Subscription] Mode web — produits mockés');
      return this.getMockProducts();
    }

    // Attendre l'init si en cours
    const ready = await this.waitForInit();
    if (!ready) {
      if (!IS_PRODUCTION) {
        return this.getMockProducts();
      }
      logger.warn('[Subscription] RevenueCat non initialisé, pas de produits');
      return [];
    }

    try {
      logger.debug('[Subscription] Récupération des offres RevenueCat...');
      const offerings = await Purchases.getOfferings();

      if (!offerings.current || !offerings.current.availablePackages.length) {
        logger.warn('[Subscription] Aucune offre trouvée dans RevenueCat');
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
      logger.error('[Subscription] Erreur récupération offres', { error });
      return [];
    }
  }

  /**
   * Initie un achat d'abonnement via RevenueCat
   */
  async purchaseSubscription(productId: string): Promise<boolean> {
    logger.info('[Subscription] Achat en cours', { productId });

    if (!this.isNative) {
      if (IS_PRODUCTION) {
        logger.warn('[Subscription] Achat impossible hors native en production');
        return false;
      }
      logger.debug('[Subscription] Mode dev — achat simulé');
      return this.simulatePurchase();
    }

    const ready = await this.waitForInit();
    if (!ready) {
      logger.error('[Subscription] RevenueCat non initialisé pour achat');
      return false;
    }

    try {
      // Récupérer les offres pour trouver le bon package
      const offerings = await Purchases.getOfferings();
      if (!offerings.current) {
        logger.error('[Subscription] Pas d\'offre courante');
        return false;
      }

      const pkg = offerings.current.availablePackages.find(
        p => p.product.identifier === productId
      );

      if (!pkg) {
        logger.error('[Subscription] Package non trouvé', { productId });
        return false;
      }

      // Lancer l'achat
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });

      // Vérifier si l'entitlement est actif après l'achat
      // Fallback: vérifier aussi activeSubscriptions (Xcode sandbox peut ne pas remplir entitlements.active)
      const isPremium =
        customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined ||
        customerInfo.activeSubscriptions.some(id => PREMIUM_PRODUCTS.includes(id));

      if (isPremium) {
        logger.info('[Subscription] Achat réussi, Premium activé');
        localStorage.setItem('koiny_premium_active', 'true');
        return true;
      }

      logger.warn('[Subscription] Achat terminé mais entitlement non actif');
      return false;
    } catch (error: any) {
      // L'utilisateur a annulé l'achat
      if (error?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        logger.info('[Subscription] Achat annulé par l\'utilisateur');
        return false;
      }

      logger.error('[Subscription] Erreur achat', { error });
      throw error;
    }
  }

  /**
   * Vérifie l'état de l'abonnement actuel via RevenueCat
   */
  async getSubscriptionStatus(): Promise<SubscriptionState> {
    if (!this.isNative) {
      const isPremium = localStorage.getItem('koiny_premium_active') === 'true';
      return { isSubscribed: isPremium };
    }

    const ready = await this.waitForInit();
    if (!ready) {
      const isPremium = localStorage.getItem('koiny_premium_active') === 'true';
      return { isSubscribed: isPremium };
    }

    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
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
      logger.error('[Subscription] Erreur vérification statut', { error });
      // Fallback localStorage
      const isPremium = localStorage.getItem('koiny_premium_active') === 'true';
      return { isSubscribed: isPremium };
    }
  }

  /**
   * Restaure les achats précédents via RevenueCat
   */
  async restorePurchases(): Promise<boolean> {
    logger.info('[Subscription] Restauration des achats...');

    if (!this.isNative) {
      logger.info('[Subscription] Restauration non disponible en mode web');
      return false;
    }

    const ready = await this.waitForInit();
    if (!ready) {
      logger.warn('[Subscription] RevenueCat non initialisé pour restauration');
      return false;
    }

    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const isPremium =
        customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined ||
        customerInfo.activeSubscriptions.some(id => PREMIUM_PRODUCTS.includes(id));

      if (isPremium) {
        localStorage.setItem('koiny_premium_active', 'true');
        logger.info('[Subscription] Achats restaurés, Premium actif');
      } else {
        localStorage.removeItem('koiny_premium_active');
        logger.info('[Subscription] Aucun achat à restaurer');
      }

      return isPremium;
    } catch (error) {
      logger.error('[Subscription] Erreur restauration', { error });
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
      logger.info('[Subscription] Utilisateur identifié dans RevenueCat');

      // Vérifier le statut après login
      const status = await this.getSubscriptionStatus();
      if (status.isSubscribed) {
        localStorage.setItem('koiny_premium_active', 'true');
      }
    } catch (error) {
      logger.error('[Subscription] Erreur login RevenueCat', { error });
    }
  }

  /**
   * Déconnecte l'utilisateur de RevenueCat (après logout)
   */
  async logoutUser(): Promise<void> {
    if (!this.isNative || !this.initialized) return;

    try {
      await Purchases.logOut();
      logger.info('[Subscription] Utilisateur déconnecté de RevenueCat');
    } catch (error) {
      logger.error('[Subscription] Erreur logout RevenueCat', { error });
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
    logger.debug('[Subscription] TEST MODE — Abonnement simulé activé');
    localStorage.setItem('koiny_premium_active', 'true');
    return true;
  }
}

export const subscriptionService = new SubscriptionService();
