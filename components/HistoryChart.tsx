import React from 'react';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, ResponsiveContainer } from 'recharts';

export default function HistoryChart({ chartData }: { chartData: any[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="Gains" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="Dépenses" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="Amendes" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
        </ResponsiveContainer>
    );
}
