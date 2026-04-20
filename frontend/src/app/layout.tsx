'use client';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>AI Boutique Studio</title>
        <meta name="description" content="India's Premier AI-Powered Boutique Marketplace" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', border: '1px solid hsl(var(--border))' }
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
