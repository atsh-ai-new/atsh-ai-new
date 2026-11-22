"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { packages, addonOptions, formatEgp } from "@/lib/catalog";
import { sectorTemplates } from "@/lib/sector-catalog";
import {englishTemplateLabel} from "@/lib/sector-en";
import {loadGuestWorkspace,saveGuestWorkspace,type AssistantMessage} from "@/lib/customer-workspace";

type Sector = { slug: string; name: string; category: string; description: string; published?: boolean; archived?: boolean };
type Message = { who: "assistant" | "customer"; text: string };
const initial: Message = { who:"assistant",text:"أهلًا بك في ATSH AI! قولي نشاطك أو نوع المشروع، وهساعدك تختار نموذجًا من المعرض أو باقة، ثم تحدد إضافاتك وتشوف تقدير السعر. تقدر تبدأ من الأزرار السريعة." };
const normal=(s:string)=>s.toLocaleLowerCase("ar").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").trim();
function answer(message:string,sectors:Sector[]):Message {
 const q=normal(message);
 const matched=sectors.find(x=>[x.name,x.category,x.description].some(v=>normal(v).includes(q)||q.includes(normal(x.name))));
 if(q.length<2)return {who:"assistant",text:"اكتب اسم النشاط أو الخدمة، مثل: صيدلية، سوبر ماركت، عيادة، أو متجر."};
 if(matched)return {who:"assistant",text:`عندنا نموذج «${matched.name}» في قسم ${matched.category}. افتح المعرض لتجربته واختار إضافاتك؛ تكلفة تخصيص نظام المجال نفسه تحتاج تسعيرًا معتمدًا، ومش هضيف سعر افتراضي من عندي.`};
 if(/سعر|تكلف|كام|باق|اشتراك|شراء|دفع|كود/.test(q))return {who:"assistant",text:`عندنا باقات تبدأ من ${formatEgp(packages.find(x=>x.price!==null)?.price??0)} وفق الأسعار الاسترشادية الحالية، بالإضافة إلى خيارات مستقلة. افتح محرك التسعير للاطلاع على التفصيل. أسعار الدومين الحقيقية والتخصيصات غير المسعّرة تحتاج تحققًا قبل الشراء، والاشتراك يختلف عن شراء كود المشروع.`};
 if(/نطاق|دومين|domain|استضاف|hosting/.test(q))return {who:"assistant",text:"تقدر تختار الدومين والاستضافة كل بند على حدة. الاستعلام اللحظي عن توافر الدومين غير متصل بمسجل النطاقات حتى الآن؛ أي سعر نهائي أو حجز سيُؤكد وقت الطلب."};
 if(/شعار|لون|هوي|تصميم|معاين/.test(q))return {who:"assistant",text:"تقدر تدخل معرض النماذج وتغيّر اسم النشاط والألوان وترفع شعارًا تجريبيًا داخل المعاينة. حفظ معاينة شخصية دائمة داخل حساب العميل ما زال ضمن مراحل البناء."};
 if(/مساعد|ذكاء|شات|دعم/.test(q))return {who:"assistant",text:"يمكن طلب مساعد ذكي خاص بموقعك كإضافة مستقلة، على أن توضح تكلفة إعداده واستهلاك الـAPI والدعم وشروطه في عرض السعر. أنا حاليًا مساعد إرشادي يعتمد على قواعد وبيانات الكتالوج، ولست محادثة مولدة بالذكاء الاصطناعي."};
 if(/صيانه|خدم|سنه|سنة/.test(q))return {who:"assistant",text:"الدعم والصيانة لهما شروط ومدد وتكاليف واضحة تُعرض لكل باقة أو إضافة. خدمة الدعم لسنة لا تُعتبر مشمولة في كل اختيار تلقائيًا؛ نراجع عرض السعر والعقد أولًا."};
 if(/عياد|طبيب|دكتور/.test(q))return answer("عيادتي",sectors);
 if(/محام|قضاي|قانون/.test(q))return answer("أفوكاتو",sectors);
 if(/صيدل|ادوي|دواء/.test(q))return answer("أجزخانة",sectors);
 if(/سوبر|بقال|مخزون|كاشير/.test(q))return answer("سوبر ماركت",sectors);
 if(/موقع|متجر|تطبيق|برنامج/.test(q))return {who:"assistant",text:"ابدأ بتحديد نوع المشروع من محرك التسعير أو استكشف المعرض حسب مجالك، ثم اختر الخصائص والإضافات. سأعرض روابط مباشرة للخطوة التالية."};
 return {who:"assistant",text:"ممكن تحدد مجالك أو تقول عايز موقع أو متجر أو تطبيق أو نظام إدارة؟ تقدر كمان تفتح المعرض، وتشوف نموذجًا تفاعليًا قبل اختيار الباقة."};
}
function answerEn(message:string,sectors:Sector[]):Message{
 const q=message.toLowerCase().trim();
 const matched=sectors.find(x=>x.name.toLowerCase().includes(q)||x.slug.includes(q));
 if(matched)return {who:"assistant",text:`You can explore our ${englishTemplateLabel(matched.slug,matched.name)} demo in the solutions catalog. A formal quote is required for custom features.`};
 if(/price|cost|quote|payment|subscription|license/.test(q))return {who:"assistant",text:"You can configure a package to see its current price breakdown. Final quotes and custom work are reviewed by our team."};
 if(/domain|hosting|website/.test(q))return {who:"assistant",text:"Choose hosting and your domain as separate options in our project configurator. Live availability and final registration prices need confirmation."};
 if(/assistant|artificial intelligence|chatbot|support|ai/.test(q))return {who:"assistant",text:"You can request a custom AI assistant for your website. Setup, API usage, and support costs will be itemized before approval."};
 if(/clinic|doctor|medical/.test(q))return answerEn("eyadaty",sectors);
 if(/pharmacy|medicine/.test(q))return answerEn("agzakhana",sectors);
 if(/supermarket|retail|pos|inventory/.test(q))return answerEn("supermarket",sectors);
 if(/law|lawyer|legal/.test(q))return answerEn("avocato",sectors);
 return {who:"assistant",text:"Tell me whether you need a website, e-commerce store, app or business system. You can also explore interactive demos in the solutions catalog."};
}
export default function Concierge({locale="ar",embedded=false}:{locale?:"ar"|"en";embedded?:boolean}) {const en=locale==="en";const base=en?"/en":"";const t=(ar:string,english:string)=>en?english:ar;
 const initialMessage:Message=en?{who:"assistant",text:"Welcome to ATSH AI. Tell me about your business or the software you need, and I will guide you toward a solution, demo or quote."}:initial;
 const [open,setOpen]=useState(embedded);
 const [ready,setReady]=useState(false);
 const [signedIn,setSignedIn]=useState(false);
 const [messages,setMessages]=useState<Message[]>([initialMessage]);
 const [input,setInput]=useState("");
 const [sectors,setSectors]=useState<Sector[]>(sectorTemplates);
 const [hint,setHint]=useState("");
 const [sending,setSending]=useState(false);
 useEffect(()=>{
   let active=true;
   fetch("/api/site-content/catalog",{cache:"no-store"}).then(async r=>r.ok?r.json():null).then(result=>{
     if(!active)return;
     const raw=result?.page?.content?.items;
     if(Array.isArray(raw))setSectors(raw.filter((x:Sector)=>x&&typeof x.slug==="string"&&typeof x.name==="string"&&x.published!==false&&!x.archived));
   }).catch(()=>{if(active)setHint(t("الكتالوج المباشر غير متاح الآن؛ الإرشاد يعتمد على النماذج الافتراضية.","The live catalog is unavailable; showing available demo examples."));});
   return()=>{active=false};
 },[]);
 useEffect(()=>{
   let active=true;
   const guest=loadGuestWorkspace().assistantMessages;
   fetch("/api/customer/auth/workspace",{credentials:"include",cache:"no-store"})
    .then(async response=>response.ok?await response.json():null)
    .then(async data=>{
      if(!active)return;
      const accountMessages=data?.workspace?.draft?.assistantMessages;
      if(data?.workspace){
        setSignedIn(true);
        if(Array.isArray(guest)&&guest.length){
          const combined=[...(Array.isArray(accountMessages)?accountMessages:[]),...guest].slice(-80);
          const saved=await fetch("/api/customer/auth/workspace",{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({assistantMessages:combined})});
          if(active&&saved.ok){setMessages(combined);saveGuestWorkspace({assistantMessages:[]});}
          else if(active)setMessages(Array.isArray(accountMessages)&&accountMessages.length?accountMessages:guest);
        }else if(Array.isArray(accountMessages)&&accountMessages.length)setMessages(accountMessages);
      }else if(Array.isArray(guest)&&guest.length)setMessages(guest);
    }).catch(()=>{if(active&&Array.isArray(guest)&&guest.length)setMessages(guest);})
    .finally(()=>{if(active)setReady(true)});
   return()=>{active=false};
 },[]);
 const storeMessages=(items:Message[])=>{
   const history=items.filter(item=>item.text.trim()).slice(-80) as AssistantMessage[];
   if(signedIn){
     void fetch("/api/customer/auth/workspace",{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({assistantMessages:history})}).catch(()=>undefined);
   }else saveGuestWorkspace({assistantMessages:history});
 };
 const sectorLinks=useMemo(()=>sectors.slice(0,4),[sectors]);
 const send=async(e:FormEvent)=>{
   e.preventDefault();
   const q=input.trim().slice(0,350);
   if(!q||sending)return;
   const next=[...messages,{who:"customer" as const,text:q}];
   setMessages(next);
   if(ready)storeMessages(next);
   setInput("");
   setSending(true);
   setHint("");
   try{
     const history=next.filter(m=>m!==initialMessage).slice(-8).map(m=>({role:m.who==="customer"?"user":"assistant",content:m.text}));
     const response=await fetch("/api/visitor/assistant",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history})});
     const data=await response.json().catch(()=>({}));
     if(!response.ok||typeof data.answer!=="string")throw Error(`HTTP ${response.status}: ${typeof data.error==="string"?data.error:"GPT unavailable"}`);
     setMessages(prev=>{const updated=[...prev,{who:"assistant" as const,text:data.answer}];storeMessages(updated);return updated;});
   }catch(error){
     const diagnostic=error instanceof Error?error.message.slice(0,100):"Network error";
     setMessages(prev=>{const updated=[...prev,en?answerEn(q,sectors):answer(q,sectors)];storeMessages(updated);return updated;});
     setHint(t(`تعذّر اتصال GPT (${diagnostic}). الرد المعروض توضيحي وليس إجابة من GPT.`,`GPT connection failed (${diagnostic}). The displayed reply is rule-based, not generated by GPT.`));
   }finally{setSending(false);}
 };
 return <div dir={en?"ltr":"rtl"} style={embedded?{width:"100%",fontFamily:"inherit"}:{position:"fixed",bottom:18,right:18,zIndex:150,maxWidth:"calc(100vw - 36px)",fontFamily:"inherit"}}>
   {(open||embedded)&&<section role="dialog" aria-label={t("مساعد ATSH AI الإرشادي","ATSH AI assistant")} style={{width:embedded?"100%":"min(370px,calc(100vw - 36px))",height:embedded?"min(650px,75dvh)":"min(560px,calc(100dvh - 100px))",background:"#fff",borderRadius:20,boxShadow:"0 18px 65px #0d244050",border:"1px solid #d7e1eb",display:"flex",flexDirection:"column",overflow:"hidden",marginBottom:12,marginRight:64}}>
     <header style={{padding:16,background:"#203958",color:"white",display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div><strong>{t("مساعد ATSH AI","ATSH AI assistant")}</strong></div><button aria-label={t("إغلاق المساعد","Close assistant")} onClick={()=>setOpen(false)} hidden={embedded} style={{background:"transparent",border:0,color:"white",fontSize:25,cursor:"pointer"}}>×</button></header>
     <div aria-live="polite" style={{flex:1,overflowY:"auto",padding:15,display:"flex",flexDirection:"column",gap:10}}>
       {messages.map((m,i)=><div key={i} style={{padding:"10px 12px",borderRadius:14,lineHeight:1.8,fontSize:13,maxWidth:"95%",alignSelf:m.who==="customer"?"flex-start":"flex-end",background:m.who==="customer"?"#e8f0fb":"#f3f5f8",color:"#203958"}}>{m.text}</div>)}
       {hint&&<small style={{color:"#96610e"}}>{hint}</small>}
     </div>
     <nav aria-label={t("اختصارات المساعد","Assistant shortcuts")} style={{display:"flex",gap:7,flexWrap:"wrap",padding:"5px 12px"}}>
       <Link href={`${base}/account/register`} onClick={()=>setOpen(false)} style={{padding:"7px 9px",border:"1px solid #cbd5e1",borderRadius:99,fontSize:12}}>{t("إنشاء حساب","Create account")}</Link>
       <Link href={`${base}/catalog`} onClick={()=>setOpen(false)} style={{padding:"7px 9px",border:"1px solid #cbd5e1",borderRadius:99,fontSize:12}}>{t("المعرض","Solutions")}</Link>
       <a href="#configurator" onClick={()=>setOpen(false)} style={{padding:"7px 9px",border:"1px solid #cbd5e1",borderRadius:99,fontSize:12}}>{t("التسعير","Pricing")}</a>
       {sectorLinks.slice(0,2).map(x=><Link key={x.slug} href={`${base}/catalog/${x.slug}`} style={{padding:"7px 9px",border:"1px solid #cbd5e1",borderRadius:99,fontSize:12}}>{en?englishTemplateLabel(x.slug,x.name):x.name}</Link>)}
     </nav>
     <form onSubmit={send} style={{padding:12,display:"flex",gap:8,borderTop:"1px solid #e2e8f0"}}>
       <input aria-label={t("رسالتك للمساعد","Message the assistant")} maxLength={350} value={input} onChange={e=>setInput(e.target.value)} placeholder={t("مجالك أو طلبك…","Your industry or request…")} style={{flex:1,width:"100%",minWidth:0,padding:11,borderRadius:10,border:"1px solid #cbd5e1"}}/>
       <button type="submit" disabled={!input.trim()||sending} style={{border:0,borderRadius:10,padding:"10px 14px",background:"#203958",color:"white",cursor:"pointer"}}>{sending?t("جارٍ الرد…","Replying…"):t("إرسال","Send")}</button>
     </form>
   </section>}
   {!embedded&&<nav className="atsh-floating-actions" aria-label={t("التواصل والمساعد الذكي","Contact and assistant")}>
     <a className="atsh-fab atsh-fab-call" href="tel:+201007735321" aria-label={t("اتصل بنا","Call us")} title={t("اتصال","Call")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.09 5.18 2 2 0 0 1 5.08 3h3a2 2 0 0 1 2 1.72l.45 2.81a2 2 0 0 1-.57 1.72L8.1 11.1a16 16 0 0 0 4.8 4.8l1.85-1.86a2 2 0 0 1 1.72-.57l2.81.45A2 2 0 0 1 22 16.92Z"/></svg></a>
     <a className="atsh-fab atsh-fab-whatsapp" href="https://wa.me/201007735321?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20ATSH%20AI" target="_blank" rel="noopener noreferrer" aria-label={t("واتساب","WhatsApp")} title={t("واتساب","WhatsApp")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.3-4.8A8.5 8.5 0 1 1 20.5 11.7Z"/><path d="M8.5 8.4c-.5.5-.6 1.1-.3 1.9.7 2.2 2.6 4.1 4.8 4.8.8.3 1.4.2 1.9-.3l.7-.9-2.1-1-1 1a6.7 6.7 0 0 1-3.8-3.8l1-1-1-2.1-.9.7Z"/></svg></a>
     <button type="button" className="atsh-fab atsh-fab-assistant" aria-expanded={open} aria-label={open?t("إغلاق المساعد الذكي","Close assistant"):t("فتح المساعد الذكي","Open assistant")} title={t("المساعد الذكي","AI assistant")} onClick={()=>setOpen(v=>!v)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 13.9 9.1 20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3Z"/><path d="m19 17 .7 1.3L21 19l-1.3.7L19 21l-.7-1.3L17 19l1.3-.7L19 17Z"/></svg></button>
   </nav>}
 </div>;
