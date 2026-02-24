
import React, { Component, ErrorInfo, ReactNode } from "react";

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
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6 font-sans">
                    <div className="max-w-md text-center">
                        <div className="mb-6 text-red-500 text-6xl">
                            <i className="fa-solid fa-bomb"></i>
                        </div>
                        <h1 className="text-2xl font-black mb-4">Oups ! Une erreur est survenue.</h1>
                        <p className="text-slate-400 mb-6 text-sm">
                            L'application a rencontré un problème critique et ne peut pas s'afficher.
                        </p>
                        <div className="bg-slate-800 p-4 rounded-xl text-left font-mono text-xs text-red-300 mb-6 overflow-auto max-h-48">
                            {this.state.error?.message}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-600 transition-colors"
                        >
                            Recharger l'application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
