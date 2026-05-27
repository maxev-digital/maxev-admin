import type { Metadata } from 'next';
import { Inter, Bebas_Neue } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Max EV Digital — Admin',
  description: 'Max EV Digital internal admin panel',
  icons: {
    icon: '/EV_Favicon.png',
    apple: '/EV_Favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bebasNeue.variable} h-full`}>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
