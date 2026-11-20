"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { packages, addonOptions, formatEgp } from "@/lib/catalog";
import { sectorTemplates } from "@/lib/sector-catalog";
import {englishTemplateLabel} from "@/lib/sector-en";

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
export default function Concierge({locale="ar"}:{locale?:"ar"|"en"}) {const en=locale==="en";const base=en?"/en":"";const t=(ar:string,english:string)=>en?english:ar;
 const initialMessage:Message=en?{who:"assistant",text:"Welcome to ATSH AI. Tell me about your business or the software you need, and I will guide you toward a solution, demo or quote."}:initial;
 const [open,setOpen]=useState(false);
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
 const sectorLinks=useMemo(()=>sectors.slice(0,4),[sectors]);
 const send=async(e:FormEvent)=>{
   e.preventDefault();
   const q=input.trim().slice(0,350);
   if(!q||sending)return;
   const next=[...messages,{who:"customer" as const,text:q}];
   setMessages(next);
   setInput("");
   setSending(true);
   setHint("");
   try{
     const history=next.filter(m=>m!==initialMessage).slice(-8).map(m=>({role:m.who==="customer"?"user":"assistant",content:m.text}));
     const response=await fetch("/api/visitor/assistant",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history})});
     const data=await response.json().catch(()=>({}));
     if(!response.ok||typeof data.answer!=="string")throw Error(`HTTP ${response.status}: ${typeof data.error==="string"?data.error:"GPT unavailable"}`);
     setMessages(prev=>[...prev,{who:"assistant",text:data.answer}]);
   }catch(error){
     const diagnostic=error instanceof Error?error.message.slice(0,100):"Network error";
     setMessages(prev=>[...prev,en?answerEn(q,sectors):answer(q,sectors)]);
     setHint(t(`تعذّر اتصال GPT (${diagnostic}). الرد المعروض توضيحي وليس إجابة من GPT.`,`GPT connection failed (${diagnostic}). The displayed reply is rule-based, not generated by GPT.`));
   }finally{setSending(false);}
 };
 return <div dir={en?"ltr":"rtl"} style={{position:"fixed",bottom:18,left:18,zIndex:150,maxWidth:"calc(100vw - 36px)",fontFamily:"inherit"}}>
   {open&&<section role="dialog" aria-label={t("مساعد ATSH AI الإرشادي","ATSH AI assistant")} style={{width:"min(370px,calc(100vw - 36px))",height:"min(560px,calc(100dvh - 100px))",background:"#fff",borderRadius:20,boxShadow:"0 18px 65px #0d244050",border:"1px solid #d7e1eb",display:"flex",flexDirection:"column",overflow:"hidden",marginBottom:12}}>
     <header style={{padding:16,background:"#203958",color:"white",display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div><strong>{t("مساعد ATSH AI","ATSH AI assistant")}</strong><small style={{display:"block",opacity:.8}}>{t("مساعد GPT عند تفعيل الربط، وإرشاد بديل عند عدم توفره","GPT when connected; guided support otherwise")}</small></div><button aria-label={t("إغلاق المساعد","Close assistant")} onClick={()=>setOpen(false)} style={{background:"transparent",border:0,color:"white",fontSize:25,cursor:"pointer"}}>×</button></header>
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
   <button aria-expanded={open} aria-label={open?t("إغلاق مساعد ATSH AI","Close ATSH AI assistant"):t("فتح مساعد ATSH AI","Open ATSH AI assistant")} onClick={()=>setOpen(v=>!v)} style={{border:0,borderRadius:99,background:"#203958",color:"#fff",padding:"13px 19px",boxShadow:"0 8px 30px #20395844",cursor:"pointer",fontWeight:700}}>✦ {open?t("إغلاق المساعد","Close assistant"):t("اسأل مساعد ATSH AI","Ask ATSH AI")}</button>
 </div>;
}
