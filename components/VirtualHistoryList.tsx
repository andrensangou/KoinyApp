import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { HistoryEntry, Language } from '../types';

const _isPenalty = (title: string) => title.toLowerCase().includes('amende') || title.toLowerCase().includes('penalty') || title.toLowerCase().includes('punition') || title.toLowerCase().includes('boete') || title.toLowerCase().includes('fine');
const _isGift = (title: string) => title.toLowerCase().includes('cadeau') || title.toLowerCase().includes('bonus') || title.toLowerCase().includes('gift');
const _isCarry = (title: string) => { const t = title.toLowerCase(); return t.includes('solde reporté') || t.includes('balance carried') || t.includes('saldo overgedragen'); };

interface VirtualHistoryListProps {
    history: HistoryEntry[];
    language: Language;
    isPenalty: (title: string) => boolean;
    getTranslatedTitle: (title: string, language: Language) => string;
    emptyMessage: string;
    isIOS?: boolean;
    curr?: string;
}

export default function VirtualHistoryList({ history, language, isPenalty, getTranslatedTitle, emptyMessage, isIOS, curr = '€' }: VirtualHistoryListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: history.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => isIOS ? 76 : 88,
        overscan: 10,
    });

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 min-h-[300px]">
                {isIOS ? (
                    <>
                        <div className="text-[28px] mb-3">📋</div>
                        <p className="text-[13px] font-bold text-slate-400">{emptyMessage}</p>
                    </>
                ) : (
                    <>
                        <i className="fa-solid fa-receipt text-6xl mb-4 opacity-20"></i>
                        <p className="font-bold text-sm italic">{emptyMessage}</p>
                    </>
                )}
            </div>
        );
    }

    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    return (
        <div
            ref={parentRef}
            className={`w-full overflow-y-auto no-scrollbar scroll-smooth ${isIOS ? 'max-h-[65vh] px-0' : 'max-h-[60vh] px-2'}`}
        >
            <div
                className="w-full relative"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                    const item = history[virtualItem.index];
                    const neg = item.amount < 0;
                    const penalty = isPenalty(item.title);
                    const carry = !neg && _isCarry(item.title);
                    const gift = !neg && !carry && _isGift(item.title);

                    if (isIOS) {
                        // iOS-style item
                        let iconBg: string, iconColor: string, iconName: string, typeLabel: string;
                        if (!neg) {
                            if (carry) {
                                iconBg = '#eef2ff'; iconColor = '#4f46e5'; iconName = 'fa-money-bill-transfer';
                                typeLabel = language === 'fr' ? 'Solde reporté' : language === 'nl' ? 'Saldo overgedragen' : 'Balance carried forward';
                            } else if (gift) {
                                iconBg = '#faf5ff'; iconColor = '#9333ea'; iconName = 'fa-gift';
                                typeLabel = language === 'fr' ? 'Cadeau' : language === 'nl' ? 'Cadeau' : 'Gift';
                            } else {
                                iconBg = '#ecfdf5'; iconColor = '#15803d'; iconName = 'fa-star';
                                typeLabel = 'Mission';
                            }
                        } else if (penalty) {
                            iconBg = '#fffbeb'; iconColor = '#b45309'; iconName = 'fa-triangle-exclamation';
                            typeLabel = language === 'fr' ? 'Amende' : language === 'nl' ? 'Boete' : 'Fine';
                        } else {
                            iconBg = '#f8fafc'; iconColor = '#64748b'; iconName = 'fa-bag-shopping';
                            typeLabel = language === 'fr' ? 'Achat' : language === 'nl' ? 'Aankoop' : 'Purchase';
                        }
                        const dateParts = item.date.split('/');
                        const dateStr = dateParts.length >= 2
                            ? `${dateParts[0]} ${months[parseInt(dateParts[1]) - 1] || dateParts[1]}${dateParts[2] ? ' ' + dateParts[2] : ''}`
                            : item.date;
                        const amountColor = !neg ? '#15803d' : penalty ? '#b45309' : '#1e293b';

                        return (
                            <div
                                key={virtualItem.key}
                                className="absolute top-0 left-0 w-full"
                                style={{ height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)`, paddingBottom: '8px' }}
                            >
                                <div className="bg-white rounded-[18px] px-4 flex items-center h-full" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                                    <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 mr-3" style={{ background: iconBg }}>
                                        <i className={`fa-solid ${iconName} text-[13px]`} style={{ color: iconColor }}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold text-[#1e293b] truncate">{typeLabel}</p>
                                        <p className="text-[11px] text-slate-400 font-medium truncate">
                                            {carry ? dateStr : `${getTranslatedTitle(item.title, language)}${item.note ? ` · ${item.note}` : ''} · ${dateStr}`}
                                        </p>
                                    </div>
                                    <span className="text-[15px] font-black ml-3 shrink-0 tabular-nums" style={{ color: amountColor }}>
                                        {neg ? '-' : '+'}{Math.abs(item.amount).toFixed(2)}{curr}
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    // Default (Android / existing) style
                    return (
                        <div
                            key={virtualItem.key}
                            className="absolute top-0 left-0 w-full"
                            style={{ height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)`, paddingBottom: '8px' }}
                        >
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between h-full">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <span className="text-[10px] font-black flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 w-12 h-12 rounded-2xl shrink-0 leading-tight">
                                        <span className="text-xs text-slate-800 dark:text-slate-300">{item.date.split('/')[0]}</span>
                                        <span className="text-[8px] uppercase">{months[parseInt(item.date.split('/')[1]) - 1] || item.date.split('/')[1]}</span>
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight truncate">{getTranslatedTitle(item.title, language)}</h3>
                                        {item.note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{item.note}</p>}
                                    </div>
                                </div>
                                <span className={`font-black text-sm px-4 py-2 rounded-xl whitespace-nowrap shrink-0 ml-4 ${penalty ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : (neg ? 'text-slate-900 dark:text-slate-300' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20')}`}>
                                    {penalty ? <i className="fa-solid fa-gavel mr-2"></i> : null}
                                    {neg ? '-' : '+'}{Math.abs(item.amount).toFixed(2)} €
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
