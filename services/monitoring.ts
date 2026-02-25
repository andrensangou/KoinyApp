
/**
 * Koiny Monitoring Service v2
 * Centralise le tracking technique et business.
 * Integre Sentry pour les rapports de crash.
 */
import * as Sentry from '@sentry/capacitor';
import * as SentryReact from '@sentry/react';

type MetricType = 'PERF' | 'BUSINESS' | 'ERROR' | 'SECURITY';

interface MetricEvent {
  type: MetricType;
  name: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

class MonitoringService {
  private static instance: MonitoringService;
  private isDebug = window.location.hostname === 'localhost';

  private constructor() { }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Initialise le SDK Sentry
   */
  public initSentry() {
    Sentry.init({
      dsn: "https://examplePublicKey@o0.ingest.sentry.io/0", // Remplacer par le vrai DSN
      tracesSampleRate: 0.2, // Faible en prod pour réduire la consommation
    }, SentryReact.init);
  }

  /**
   * Envoie une métrique au système de tracking.
   * En mode production, cela devrait envoyer vers un collecteur (ex: PostHog, Sentry, ou API interne).
   */
  public track(type: MetricType, name: string, value?: number, metadata?: Record<string, any>) {
    const event: MetricEvent = {
      type,
      name,
      value,
      metadata: {
        ...metadata,
        url: window.location.href,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        connection: (navigator as any).connection?.effectiveType || 'unknown'
      },
      timestamp: new Date().toISOString(),
    };

    if (this.isDebug) {
      const colors = {
        ERROR: 'background: #fee2e2; color: #b91c1c',
        BUSINESS: 'background: #dcfce7; color: #15803d',
        PERF: 'background: #e0e7ff; color: #4338ca',
        SECURITY: 'background: #fef3c7; color: #92400e'
      };
      console.log(`%c[${type}] ${name}`, colors[type] || '', { value, ...event.metadata });
    }

    // Pipeline de persistance
    if (!this.isDebug && type === 'ERROR') {
      Sentry.captureException(new Error(name), {
        extra: event.metadata,
      });
    }
  }

  /**
   * Mesure la performance d'une opération asynchrone (Latency)
   */
  public async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.track('PERF', name, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.track('ERROR', `${name}_FAILED`, duration, {
        error: (error as Error).message,
        stack: (error as Error).stack,
        ...metadata
      });
      throw error;
    }
  }

  /**
   * Initialise le tracking des Core Web Vitals avancés
   */
  public initWebVitals() {
    if (typeof window === 'undefined') return;

    try {
      // LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.track('PERF', 'CWV_LCP', lastEntry.startTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // FID
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.track('PERF', 'CWV_FID', entry.duration);
        });
      }).observe({ type: 'first-input', buffered: true });

      // CLS (Cumulative Layout Shift)
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.track('PERF', 'CWV_CLS', clsValue);
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });

    } catch (e) {
      console.warn('PerformanceObserver not supported');
    }
  }
}

export const monitoring = MonitoringService.getInstance();
