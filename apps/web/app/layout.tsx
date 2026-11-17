import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'ATSH AI | حلول رقمية ذكية', description: 'تصميم وتطوير المواقع والتطبيقات وحلول الذكاء الاصطناعي' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="ar" dir="rtl"><body>{children}</body></html>; }
