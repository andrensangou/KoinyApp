/**
 * Service d'Abonnement Koiny
 * Gère les In-App Purchases (abonnements) via StoreKit 2
 */

import { Capacitor } from '@capacitor/core';

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

class SubscriptionService {
  private isNative: boolean = false;
  private isTesting: boolean = false; // RevenueCat à configurer

  // Product IDs pour App Store
  private MONTHLY_ID = 'com.koiny.premium.monthly';
  private YEARLY_ID = 'com.koiny.premium.yearly';

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    if (this.isNative) {
      this.initializeStoreKit();
    }
  }

  /**
   * Initialise StoreKit 2 pour les achats in-app
   */
  private async initializeStoreKit() {
    try {
      console.log('[Subscription] Initialisation StoreKit 2');
      // Capacitor n'a pas encore de support natif pour StoreKit 2
      // Pour le moment, on utilise le Capacitor In-App Purchase
      // Ou on peut utiliser un plugin tiers
    } catch (error) {
      console.error('[Subscription] Erreur initialisation StoreKit:', error);
    }
  }

  /**
   * Récupère les produits d'abonnement disponibles
   */
  async getProducts(): Promise<SubscriptionProduct[]> {
    if (this.isTesting) {
      // Mode développement - produits mockés
      return [
        {
          id: this.MONTHLY_ID,
          title: 'Koiny Premium - Mensuel',
          description: '14 jours gratuits, puis 1,99€/mois',
          price: '1,99€/mois',
          duration: 'month'
        },
        {
          id: this.YEARLY_ID,
          title: 'Koiny Premium - Annuel',
          description: '14 jours gratuits, puis 16,99€/an',
          price: '16,99€/an',
          duration: 'year'
        }
      ];
    }

    // Production - récupérer depuis App Store
    try {
      console.log('[Subscription] Récupération des produits...');
      // await this.fetchProductsFromAppStore();
      return [];
    } catch (error) {
      console.error('[Subscription] Erreur récupération produits:', error);
      return [];
    }
  }

  /**
   * Initie un achat d'abonnement
   */
  async purchaseSubscription(productId: string): Promise<boolean> {
    console.log('[Subscription] Achat en cours:', productId);

    if (this.isTesting) {
      // Mode test - simuler l'achat
      console.log('[Subscription] TEST MODE - Abonnement activé');
      this.saveSubscriptionStatus({
        isSubscribed: true,
        productId: productId,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours
        trialDaysRemaining: 7
      });
      return true;
    }

    // Production - RevenueCat à intégrer
    console.log('[Subscription] RevenueCat non configuré');
    return false;
  }

  /**
   * Récupère l'état de l'abonnement actuel
   */
  async getSubscriptionStatus(): Promise<SubscriptionState> {
    try {
      const saved = localStorage.getItem('koiny_subscription_status');
      if (saved) {
        const status = JSON.parse(saved) as SubscriptionState;

        // Vérifier si l'abonnement a expiré
        if (status.expiryDate && new Date(status.expiryDate) < new Date()) {
          console.log('[Subscription] Abonnement expiré');
          return { isSubscribed: false };
        }

        return status;
      }
    } catch (error) {
      console.error('[Subscription] Erreur lecture statut:', error);
    }

    return { isSubscribed: false };
  }

  /**
   * Sauvegarde l'état de l'abonnement
   */
  private saveSubscriptionStatus(status: SubscriptionState) {
    try {
      localStorage.setItem('koiny_subscription_status', JSON.stringify(status));
      console.log('[Subscription] Statut sauvegardé:', status);
    } catch (error) {
      console.error('[Subscription] Erreur sauvegarde statut:', error);
    }
  }

  /**
   * Annule l'abonnement (simulation)
   */
  async cancelSubscription(): Promise<boolean> {
    try {
      localStorage.removeItem('koiny_subscription_status');
      console.log('[Subscription] Abonnement annulé');
      return true;
    } catch (error) {
      console.error('[Subscription] Erreur annulation:', error);
      return false;
    }
  }

  /**
   * Restaure les achats précédents
   */
  async restorePurchases(): Promise<boolean> {
    console.log('[Subscription] Restauration des achats');

    if (this.isNative) {
      // À implémenter avec StoreKit 2
      console.log('[Subscription] Restauration non implémentée en mode test');
      return true;
    }

    return false;
  }

  /**
   * Active le mode test (pour développement)
   */
  setTestingMode(enabled: boolean) {
    this.isTesting = enabled;
    console.log('[Subscription] Mode test:', enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ');
  }
}

export const subscriptionService = new SubscriptionService();
