
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Language } from '../types';

interface OnboardingViewProps {
    language: Language;
    onSetLanguage: (lang: Language) => void;
    onComplete: () => void;
}

interface Slide {
    emoji: string;
    icon: string;
    titleFr: string;
    titleNl: string;
    titleEn: string;
    descFr: string;
    descNl: string;
    descEn: string;
    gradient: string;
    accentColor: string;
    features?: { icon: string; textFr: string; textNl: string; textEn: string }[];
}

const slides: Slide[] = [
    {
        emoji: '💰',
        icon: 'fa-solid fa-piggy-bank',
        titleFr: "L'argent de poche\nréinventé",
        titleNl: "Zakgeld\nopnieuw uitgevonden",
        titleEn: "Pocket money\nreinvented",
        descFr: "Apprenez à vos enfants la valeur de l'effort et de l'épargne, de manière ludique et sécurisée.",
        descNl: "Leer je kinderen de waarde van inspanning en sparen, op een leuke en veilige manier.",
        descEn: "Teach your kids the value of effort and saving, in a fun and secure way.",
        gradient: 'from-indigo-600 via-indigo-700 to-violet-800',
        accentColor: 'indigo',
        features: [
            { icon: 'fa-solid fa-shield-halved', textFr: '100% virtuel & sécurisé', textNl: '100% virtueel & veilig', textEn: '100% virtual & secure' },
            { icon: 'fa-solid fa-children', textFr: 'Multi-enfants', textNl: 'Meerdere kinderen', textEn: 'Multi-child support' },
            { icon: 'fa-solid fa-language', textFr: 'FR · NL · EN', textNl: 'FR · NL · EN', textEn: 'FR · NL · EN' },
        ],
    },
    {
        emoji: '🎯',
        icon: 'fa-solid fa-list-check',
        titleFr: "Des missions,\ndes récompenses",
        titleNl: "Missies\nen beloningen",
        titleEn: "Missions\nand rewards",
        descFr: "Créez des défis du quotidien. Vos enfants les accomplissent, vous validez — ils gagnent de l'argent virtuel.",
        descNl: "Maak dagelijkse uitdagingen. Je kinderen doen ze, jij valideert — ze verdienen virtueel geld.",
        descEn: "Create daily challenges. Your kids complete them, you approve — they earn virtual money.",
        gradient: 'from-violet-600 via-purple-700 to-fuchsia-800',
        accentColor: 'purple',
        features: [
            { icon: 'fa-solid fa-broom', textFr: 'Ranger la chambre → 2€', textNl: 'Kamer opruimen → 2€', textEn: 'Clean room → 2€' },
            { icon: 'fa-solid fa-check-double', textFr: 'Validation en un tap', textNl: 'Validatie in één tik', textEn: 'One-tap approval' },
            { icon: 'fa-solid fa-bell', textFr: 'Notifications en temps réel', textNl: 'Real-time meldingen', textEn: 'Real-time notifications' },
        ],
    },
    {
        emoji: '🏆',
        icon: 'fa-solid fa-rocket',
        titleFr: "Des objectifs\nqui motivent",
        titleNl: "Doelen\ndie motiveren",
        titleEn: "Goals\nthat motivate",
        descFr: "Vélo, jouet, jeu vidéo… vos enfants épargnent pour leurs rêves et voient leur progression grandir.",
        descNl: "Fiets, speelgoed, videospel… je kinderen sparen voor hun dromen en zien hun voortgang groeien.",
        descEn: "Bike, toy, video game… your kids save for their dreams and watch their progress grow.",
        gradient: 'from-emerald-600 via-teal-700 to-cyan-800',
        accentColor: 'emerald',
        features: [
            { icon: 'fa-solid fa-chart-line', textFr: 'Barre de progression visuelle', textNl: 'Visuele voortgangsbalk', textEn: 'Visual progress bar' },
            { icon: 'fa-solid fa-gift', textFr: 'Objectifs d\'épargne motivants', textNl: 'Motiverende spaardoelen', textEn: 'Motivating savings goals' },
            { icon: 'fa-solid fa-mobile-screen', textFr: 'Widget iOS intégré', textNl: 'Geïntegreerde iOS-widget', textEn: 'Built-in iOS widget' },
        ],
    },
];

const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
];

const OnboardingView: React.FC<OnboardingViewProps> = ({ language, onSetLanguage, onComplete }) => {
    const [current, setCurrent] = useState(0);
    const [direction, setDirection] = useState<'next' | 'prev'>('next');
    const [isAnimating, setIsAnimating] = useState(false);
    const touchStartX = useRef(0);
    const touchDeltaX = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const isLast = current === slides.length - 1;

    const goTo = useCallback((index: number, dir: 'next' | 'prev') => {
        if (isAnimating || index < 0 || index >= slides.length) return;
        setIsAnimating(true);
        setDirection(dir);
        setCurrent(index);
        setTimeout(() => setIsAnimating(false), 500);
    }, [isAnimating]);

    const next = useCallback(() => {
        if (isLast) {
            onComplete();
        } else {
            goTo(current + 1, 'next');
        }
    }, [current, isLast, goTo, onComplete]);

    const prev = useCallback(() => {
        goTo(current - 1, 'prev');
    }, [current, goTo]);

    // Keyboard navigation
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [next, prev]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchDeltaX.current = 0;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    };

    const handleTouchEnd = () => {
        if (Math.abs(touchDeltaX.current) > 50) {
            if (touchDeltaX.current < 0) next();
            else prev();
        }
    };

    const slide = slides[current];

    const getText = (fr: string, nl: string, en: string) => {
        return language === 'fr' ? fr : language === 'nl' ? nl : en;
    };

    const buttonLabel = isLast
        ? (language === 'fr' ? "C'est parti !" : language === 'nl' ? 'Starten!' : "Let's go!")
        : (language === 'fr' ? 'Suivant' : language === 'nl' ? 'Volgende' : 'Next');

    return (
        <div
            ref={containerRef}
            className={`min-h-screen bg-gradient-to-br ${slide.gradient} flex flex-col relative overflow-hidden font-sans transition-all duration-700`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Decorative blobs */}
            <div className="absolute top-[-15%] right-[-20%] w-[60vw] h-[60vw] bg-white/[0.04] rounded-full blur-3xl pointer-events-none transition-all duration-700" />
            <div className="absolute bottom-[-10%] left-[-15%] w-[50vw] h-[50vw] bg-white/[0.03] rounded-full blur-3xl pointer-events-none transition-all duration-700" />
            <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />

            {/* Top bar: Language Selector + Skip */}
            <div className="safe-pt relative z-20">
                <div className="flex items-center justify-between px-6 pt-4 pb-2">
                    {/* Language pills */}
                    <div className="flex gap-1.5">
                        {languages.map((l) => (
                            <button
                                key={l.code}
                                onClick={() => onSetLanguage(l.code)}
                                aria-label={l.label}
                                className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm transition-all duration-300 active:scale-90
                  ${language === l.code
                                        ? 'bg-white/20 backdrop-blur-md shadow-lg scale-110 ring-1 ring-white/30'
                                        : 'bg-white/5 hover:bg-white/10 opacity-60'}`}
                            >
                                {l.flag}
                            </button>
                        ))}
                    </div>

                    {/* Skip */}
                    {!isLast && (
                        <button
                            onClick={onComplete}
                            aria-label={language === 'fr' ? 'Passer l\'introduction' : language === 'nl' ? 'Introductie overslaan' : 'Skip introduction'}
                            className="text-white/70 text-xs font-bold uppercase tracking-widest hover:text-white/90 transition-all active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center px-3"
                        >
                            {language === 'fr' ? 'Passer' : language === 'nl' ? 'Overslaan' : 'Skip'}
                        </button>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
                {/* Animated icon */}
                <div
                    key={`icon-${current}`}
                    className="animate-onboarding-icon mb-6"
                >
                    <div className="w-28 h-28 rounded-[2rem] bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl ring-1 ring-white/20">
                        <span className="text-5xl">{slide.emoji}</span>
                    </div>
                </div>

                {/* Title */}
                <h1
                    key={`title-${current}`}
                    className="text-[2rem] sm:text-4xl font-black text-white text-center leading-[1.15] mb-5 animate-onboarding-title whitespace-pre-line"
                >
                    {getText(slide.titleFr, slide.titleNl, slide.titleEn)}
                </h1>

                {/* Description */}
                <p
                    key={`desc-${current}`}
                    className="text-base sm:text-lg text-white/70 text-center max-w-sm leading-relaxed font-medium mb-10 animate-onboarding-desc"
                >
                    {getText(slide.descFr, slide.descNl, slide.descEn)}
                </p>

                {/* Feature pills */}
                {slide.features && (
                    <div
                        key={`features-${current}`}
                        className="flex flex-col gap-3 w-full max-w-xs animate-onboarding-features"
                    >
                        {slide.features.map((f, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3.5 bg-white/[0.08] backdrop-blur-md rounded-2xl px-5 py-3.5 ring-1 ring-white/10"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                                    <i className={`${f.icon} text-white/90 text-xs`} />
                                </div>
                                <span className="text-white/80 text-sm font-bold">
                                    {getText(f.textFr, f.textNl, f.textEn)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom: Dots + Button */}
            <div className="safe-pb relative z-20 px-8 pb-8 pt-4">
                {/* Dot indicators */}
                <div className="flex items-center justify-center gap-1 mb-8">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i, i > current ? 'next' : 'prev')}
                            aria-label={`${language === 'fr' ? 'Diapositive' : 'Slide'} ${i + 1}`}
                            className="w-11 h-11 flex items-center justify-center"
                        >
                            <div className={`transition-all duration-500 rounded-full
                                ${i === current
                                    ? 'w-8 h-2.5 bg-white shadow-lg shadow-white/30'
                                    : 'w-2.5 h-2.5 bg-white/25 hover:bg-white/40'}`}
                            />
                        </button>
                    ))}
                </div>

                {/* CTA button */}
                <button
                    onClick={next}
                    aria-label={buttonLabel}
                    className={`w-full py-5 rounded-2xl font-black text-lg tracking-tight transition-all duration-300 active:scale-[0.97] shadow-2xl flex items-center justify-center gap-3
            ${isLast
                            ? 'bg-white text-slate-900 shadow-white/20 hover:shadow-white/40'
                            : 'bg-white/15 backdrop-blur-md text-white ring-1 ring-white/20 hover:bg-white/25'}`}
                >
                    {buttonLabel}
                    <i className={`fa-solid ${isLast ? 'fa-arrow-right' : 'fa-chevron-right'} text-sm transition-transform group-hover:translate-x-1`} aria-hidden="true" />
                </button>

                {/* Legal hint on last slide */}
                {isLast && (
                    <p className="text-center text-white/50 text-[10px] font-bold uppercase tracking-widest mt-5 animate-onboarding-desc">
                        {language === 'fr' ? 'Koiny est un simulateur • 100% argent virtuel' : language === 'nl' ? 'Koiny is een simulator • 100% virtueel geld' : 'Koiny is a simulator • 100% virtual money'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default OnboardingView;
