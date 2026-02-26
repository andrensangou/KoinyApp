import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { HistoryEntry, Language } from '../types';

interface VirtualHistoryListProps {
    history: HistoryEntry[];
    language: Language;
    isPenalty: (title: string) => boolean;
    getTranslatedTitle: (title: string, language: Language) => string;
    emptyMessage: string;
}

export default function VirtualHistoryList({ history, language, isPenalty, getTranslatedTitle, emptyMessage }: VirtualHistoryListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: history.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 88, // ~80px for the card + 8px gap
        overscan: 10,
    });

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 min-h-[400px]">
                <i className="fa-solid fa-receipt text-6xl mb-4 opacity-20"></i>
                <p className="font-bold text-sm italic">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div
            ref={parentRef}
            className="w-full h-[60vh] min-h-[400px] overflow-y-auto no-scrollbar scroll-smooth px-2"
        >
            <div
                className="w-full relative"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                    const item = history[virtualItem.index];
                    const neg = item.amount < 0;
                    const penalty = neg && isPenalty(item.title);

                    return (
                        <div
                            key={virtualItem.key}
                            className="absolute top-0 left-0 w-full"
                            style={{
                                height: `${virtualItem.size}px`,
                                transform: `translateY(${virtualItem.start}px)`,
                                paddingBottom: '8px'
                            }}
                        >
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between h-full">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <span className="text-[10px] font-black flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 w-12 h-12 rounded-2xl shrink-0 leading-tight">
                                        <span className="text-xs text-slate-800 dark:text-slate-300">{item.date.split('/')[0]}</span>
                                        <span className="text-[8px] uppercase">{['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(item.date.split('/')[1]) - 1] || item.date.split('/')[1]}</span>
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
