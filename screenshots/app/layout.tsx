import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Koiny App Store Screenshots Generator',
  description: 'Generate premium App Store screenshots for Koiny',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
