
import React, { Component, ErrorInfo, ReactNode } from "react";

const getLanguage = (): 'fr' | 'en' | 'nl' => {
    try {
        const saved = localStorage.getItem('koiny_state');
        if (saved) {
            const state = JSON.parse(saved);
            if (state.language === 'nl' || state.language === 'en') {
                return state.language;
            }
        }
    } catch (e) { }

    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('nl')) return 'nl';
    if (browserLang.startsWith('en')) return 'en';
    return 'fr';
};

const t = {
    fr: {
        title: "Oups ! Une erreur est survenue.",
        desc: "L'application a rencontré un problème et doit redémarrer.",
        reload: "Recharger l'application"
    },
    nl: {
        title: "Oeps! Er is een fout opgetreden.",
        desc: "De applicatie heeft een probleem ondervonden en moet opnieuw opstarten.",
        reload: "Applicatie herladen"
    },
    en: {
        title: "Oops! An error occurred.",
        desc: "The application encountered a problem and needs to restart.",
        reload: "Reload application"
    }
};

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            const lang = getLanguage();
            const texts = t[lang];

            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6 font-sans">
                    <div className="max-w-md text-center">
                        <div className="mb-6 text-indigo-400 text-6xl">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <h1 className="text-2xl font-black mb-4">{texts.title}</h1>
                        <p className="text-slate-400 mb-8 text-sm">
                            {texts.desc}
                        </p>

                        {/* 🚫 CRITICAL UX: The raw JS error has been removed here to comply with App Store guidelines. */}

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg active:scale-95 flex items-center justify-center w-full gap-3"
                        >
                            <i className="fa-solid fa-rotate-right"></i>
                            {texts.reload}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
