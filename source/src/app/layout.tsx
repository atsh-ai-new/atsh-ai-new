import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATSH AI | ابنِ موقعك باختيارك",
  description: "صمّم باقتك، اختر الإضافات، وشاهد التقدير بالجنيه المصري قبل إرسال طلبك إلى ATSH AI.",
  applicationName: "ATSH AI"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
