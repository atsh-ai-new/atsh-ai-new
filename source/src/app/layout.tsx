import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import LanguageSwitch from "@/components/language-switch";
export const metadata: Metadata = {
  title: "ATSH AI | Digital solutions built for your business",
  description: "ATSH AI builds websites, applications and intelligent software solutions.",
  applicationName: "ATSH AI",
  alternates:{languages:{ar:"/",en:"/en"}}
};
export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
  const locale=(await headers()).get("x-atsh-locale")==="en"?"en":"ar";
  return <html lang={locale} dir={locale==="en"?"ltr":"rtl"}><body><LanguageSwitch />{children}</body></html>;
}
