import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Koblenz',
  description: 'A personal space for university life.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}