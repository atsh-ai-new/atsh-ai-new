import type {Metadata} from "next";
import {headers} from "next/headers";
import Concierge from "@/components/concierge";
import VideoCampaigns from "@/components/video-campaigns";
import SocialHeader from "@/components/social-header";
import "./globals.css";
async function currentLocale() {return (await headers()).get("x-atsh-locale")==="en"?"en":"ar";}
export async function generateMetadata():Promise<Metadata>{
 const locale=await currentLocale();
 const en=locale==="en";
 const title=en?"ATSH AI | Digital solutions built for your business":"ATSH AI | حلول برمجية وذكاء اصطناعي لأعمالك";
 const description=en?"Custom websites, mobile applications, business systems and AI solutions. Configure your project and request a clear quotation.":"تطوير المواقع والتطبيقات والأنظمة الذكية حسب احتياجاتك، مع تجربة طلب وتسعير واضحة.";
 return {title,description,applicationName:"ATSH AI",alternates:{languages:{ar:"/",en:"/en"}},openGraph:{title,description,locale:en?"en_US":"ar_EG",type:"website"}};
}
export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>){
 const locale=await currentLocale();
 return <html lang={locale} dir={locale==="en"?"ltr":"rtl"}><body><SocialHeader /><Concierge locale={locale} />{children}<VideoCampaigns /></body></html>;
}
