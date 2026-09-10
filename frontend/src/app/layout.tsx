import type { Metadata } from 'next';
import { Atkinson_Hyperlegible } from 'next/font/google';
import './globals.css';

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-atkinson',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GeriSafe CDSS | Inpatient Medication Review (SMR)',
  description: 'Geriatric Fall & Syncope Acuity Clinical Decision Support System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={atkinson.variable}>
      <body className="min-h-screen bg-[#f2f7f6] text-[#111827] antialiased">
        {children}
      </body>
    </html>
  );
}
