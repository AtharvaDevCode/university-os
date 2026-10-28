import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'University OS',
  description: 'Your personal university command centre.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
