import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '테니스장 예약',
  description: '아파트 테니스장 예약 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
