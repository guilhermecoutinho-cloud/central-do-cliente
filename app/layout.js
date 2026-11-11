import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#07090a',
};

export const metadata = {
  title: 'Central do Cliente · Capital Upgrade',
  description: 'Central do Cliente da Capital Upgrade',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
