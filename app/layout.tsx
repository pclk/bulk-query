import type { Metadata } from 'next';
import AuthProvider from './components/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'bulk-query',
  description: 'Process large text inputs through AI operations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
          <AuthProvider>{children}</AuthProvider>
        </body>
    </html>
  );
}
