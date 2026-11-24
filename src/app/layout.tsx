import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShortLink Analytics — URL Shortener & Click Insights',
  description:
    'Create short URLs, generate QR codes, and track clicks by device, browser, and referrer.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
