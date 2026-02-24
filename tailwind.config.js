/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
        "!./node_modules/**",
        "!./dist/**",
        "!./ios/**",
        "!./android/**",
    ],
    // Safelist dynamic color classes built at runtime (e.g. `bg-${child.colorClass}-500`)
    safelist: [
        {
            pattern: /(from|to|bg|border|text|shadow|ring)-(indigo|pink|emerald|amber|blue|rose|violet|cyan|teal|orange)-(100|200|300|400|500|600|700|800|900)/,
            variants: ['dark', 'hover', 'dark:hover', 'group-hover'],
        },
    ],
    darkMode: 'class',
    theme: {
        extend: {
            screens: {
                'xs': '400px',
            },
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            },
            colors: {
                kid: {
                    green: '#88cc14',
                    greenlight: '#dcfce7',
                    blue: '#3b82f6',
                    yellow: '#fef08a',
                    text: '#1e293b',
                    input: '#f3f4f6',
                }
            },
            boxShadow: {
                'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
                'card': '0 4px 20px rgba(0,0,0,0.05)',
                'premium-dark': '0 20px 50px rgba(0,0,0,0.5)',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                pop: {
                    '0%': { transform: 'scale(0)' },
                    '60%': { transform: 'scale(1.1)' },
                    '100%': { transform: 'scale(1)' },
                },
                balancePop: {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.2)', filter: 'brightness(1.2)' },
                    '100%': { transform: 'scale(1)' },
                },
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                    '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
                },
                overflowPulse: {
                    '0%': { boxShadow: 'inset 0 0 0px 0px rgba(239, 68, 68, 0)' },
                    '50%': { boxShadow: 'inset 0 0 100px 20px rgba(239, 68, 68, 0.4)' },
                    '100%': { boxShadow: 'inset 0 0 0px 0px rgba(239, 68, 68, 0)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(100%)' },
                    '100%': { transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                onboardingIcon: {
                    '0%': { opacity: '0', transform: 'scale(0.5) rotate(-10deg)' },
                    '60%': { transform: 'scale(1.08) rotate(2deg)' },
                    '100%': { opacity: '1', transform: 'scale(1) rotate(0)' },
                },
                onboardingTitle: {
                    '0%': { opacity: '0', transform: 'translateY(24px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                onboardingDesc: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                onboardingFeatures: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
                'scale-in': 'scaleIn 0.3s ease-out forwards',
                'pop-in': 'pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                'balance-pop': 'balancePop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
                'overflow-pulse': 'overflowPulse 1s ease-in-out infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-down': 'slideDown 0.4s ease-out forwards',
                'onboarding-icon': 'onboardingIcon 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                'onboarding-title': 'onboardingTitle 0.5s ease-out 0.15s both',
                'onboarding-desc': 'onboardingDesc 0.5s ease-out 0.3s both',
                'onboarding-features': 'onboardingFeatures 0.5s ease-out 0.45s both',
            }
        }
    },
    plugins: [],
}
