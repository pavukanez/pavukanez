import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Daniel Pham - Software Engineer',
  description: 'Backend & Cloud Infrastructure Engineer. Previously at Cisco, AWS, Novozymes, TIAA.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="relative min-h-screen overflow-x-hidden">
        <div className="grain" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,_rgba(201,162,39,0.12),_transparent_55%)]" />
        {children}
      </body>
    </html>
  );
}