"use client";
import {useState} from "react";

export type HubTab="overview"|"projects"|"messages"|"preview"|"services"|"quotes"|"contracts"|"invoices"|"deliveries"|"assistant"|"settings";
type Props={
 locale?:"ar"|"en";
 active:HubTab;onTab:(tab:HubTab)=>void;
 draftCount:number;projectCount:number;orderCount:number;quoteCount:number;
 contractCount:number;invoiceCount:number;deliveryCount:number;
 currentProject?:{title:string;sectorName?:string;id:string;revision:number};
 currentPreviewStatus?:"pending"|"approved"|"changes_requested"|string;
 currentJourneyStatus?:string;
};
const tabs:Array<{id:HubTab;label:string}>= [
 {id:"overview",label:"الرئيسية"},
 {id:"projects",label:"الباقة والمشروع"},
 {id:"messages",label:"مراسلات الإدارة"},
 {id:"preview",label:"معاينة المشروع"},
 {id:"services",label:"خدماتي المستمرة"},
 {id:"quotes",label:"عروض الإدارة"},
 {id:"invoices",label:"الفواتير والدفع"},
 {id:"settings",label:"حسابي"}
];
const stages=["اختيار المواصفات","تخصيص النموذج","اعتماد المعاينة","عرض السعر والعقد","المدفوعات","التنفيذ والتسليم"];
export default function CustomerJourneyHub(props:Props){const [menuOpen,setMenuOpen]=useState(false);const en=props.locale==="en";const base=en?"/en":"";const t=(ar:string,english:string)=>en?english:ar;
 const translatedTabs:Record<HubTab,string>={overview:"Overview",projects:"Package & project",messages:"Management messages",preview:"Project preview",services:"Ongoing services",quotes:"Management offers",contracts:"Contracts",invoices:"Invoices & payments",deliveries:"Deliverables",assistant:"AI assistant",settings:"Account settings"};
 const translatedStages=["Select requirements","Customize solution","Approve preview","Quote & contract","Payments","Build & delivery"];
 const counts=[{title:"مشروعاتي",number:props.draftCount},{title:"طلبات قيد المتابعة",number:props.projectCount},{title:"عروض أسعار",number:props.quoteCount}];
 const previewStatus=props.currentPreviewStatus;
 // Do not infer financial or delivery completion from an unrelated invoice or project.
 const status=props.currentJourneyStatus;
 const completed=!props.currentProject?0:status==="delivered"||status==="support"?6:["paid","building","preview_ready","approved"].includes(status||"")?5:status==="payment_pending"?4:previewStatus==="approved"?3:previewStatus?2:1;
 return <div dir={en?"ltr":"rtl"} style={{marginBottom:24}}>
  <style>{`.atsh-hub-menu{position:relative;margin:12px 0}.atsh-hub-menu-trigger{display:flex;align-items:center;gap:10px;border:1px solid #cbd5e1;border-radius:11px;background:#fff;color:#203958;padding:11px 15px;font:inherit;font-weight:800;cursor:pointer}.atsh-hub-menu-items:not([hidden]){display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;padding:12px;margin-top:7px;background:#fff;border:1px solid #dce4ee;border-radius:13px}.atsh-hub-menu-items[hidden]{display:none}.atsh-hub-tab{white-space:nowrap;flex-shrink:0;border:1px solid #d0dced;border-radius:11px;padding:11px 13px;cursor:pointer;background:white;color:#203958;font:inherit;font-size:14px}.atsh-hub-tab[aria-current="page"]{background:#203958;color:white;font-weight:800}.atsh-hub-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:10px}.atsh-hub-flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}@media(max-width:600px){.atsh-hub-flow{grid-template-columns:repeat(2,minmax(0,1fr))}.atsh-hub-tab{flex:0 0 auto}.atsh-hub-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}`}</style>
  <div className="atsh-hub-menu">
   <button type="button" className="atsh-hub-menu-trigger" aria-expanded={menuOpen} aria-controls="atsh-hub-menu-items" onClick={()=>setMenuOpen(open=>!open)}>☰ <span>{t("أقسام حسابي","Account sections")}</span></button>
   <nav id="atsh-hub-menu-items" hidden={!menuOpen} aria-label={t("أقسام حساب العميل","Customer account navigation")} className="atsh-hub-menu-items">
    {tabs.filter(tab=>tab.id!=="services"||["delivered","support"].includes(props.currentJourneyStatus||"")).map(tab=><button key={tab.id} className="atsh-hub-tab" type="button" aria-current={props.active===tab.id?"page":undefined} onClick={()=>{props.onTab(tab.id);setMenuOpen(false);}}>{en?translatedTabs[tab.id]:tab.label}</button>)}
   </nav>
  </div>
  {props.active==="overview"&&<section aria-label={t("ملخص رحلة العميل","Customer journey overview")}>
   <div className="atsh-hub-stats">
     {counts.map(item=><div key={item.title} style={{background:"#fff",border:"1px solid #dce4ee",padding:17,borderRadius:14}}><small style={{color:"#536983"}}>{en?({"مشروعاتي":"My projects","طلبات قيد المتابعة":"Projects in review","عروض أسعار":"Quotes"} as Record<string,string>)[item.title]||item.title:item.title}</small><strong style={{display:"block",fontSize:25,color:"#203958",marginTop:6}}>{item.number}</strong></div>)}
   </div>
   <div style={{border:"1px solid #dce4ee",background:"#fff",padding:"19px",borderRadius:15,marginTop:14}}>
    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:9,alignItems:"center"}}>
      <div><h3 style={{margin:"0 0 6px"}}>{t("رحلة المشروع الحالية","Current project journey")}</h3><p style={{margin:0,color:"#64748b",fontSize:14}}>{props.currentProject?`${props.currentProject.title} · ${props.currentProject.sectorName||"مشروع قيد التجهيز"}`:"ابدأ مشروعًا أو اختر نموذجًا لإنشاء مسودة تخصك."}</p></div>
      <button type="button" onClick={()=>props.onTab("projects")} style={{border:0,background:"#203958",color:"white",padding:"10px 14px",borderRadius:10,cursor:"pointer"}}>{props.currentProject?t("استكمال المشروع","Continue project"):t("إنشاء مشروع","Create project")} ←</button>
    </div>
    <details style={{marginTop:12}}><summary style={{cursor:"pointer",fontWeight:700,color:"#203958"}}>{t("عرض مراحل المشروع الست","Show six project stages")}</summary><div className="atsh-hub-flow" style={{marginTop:12}}>{(en?translatedStages:stages).map((label,index)=>{
      const state=index<completed?"done":index===completed?"current":"waiting";
      return <div key={label} aria-current={state==="current"?"step":undefined} style={{border:"1px solid "+(state==="done"?"#a2d4be":state==="current"?"#89aacb":"#e1e6ed"),background:state==="done"?"#edf9f2":state==="current"?"#eff5ff":"#f9fafb",borderRadius:12,padding:12,minWidth:0}}>
      <span style={{fontSize:12,fontWeight:800,color:state==="done"?"#17633f":"#203958"}}>{state==="done"?t("✓ مكتمل","✓ Completed"):state==="current"?t("● المرحلة الحالية","● Current stage"):t("○ لاحقًا","○ Later")}</span><div style={{fontWeight:700,marginTop:8,fontSize:13}}>{index+1}. {label}</div></div>;
    })}</div></details>
    <p style={{fontSize:12,color:"#64748b",margin:"12px 0 0"}}>{t("تُحسب المراحل من أحدث اعتماد معاينة وسجل المشروع الموثوق بالخادم؛ لا يعتبر الضغط على قبول العقد عملية سداد.","Progress is based on verified project records and the most recent preview approval; accepting a contract is not a payment.")}</p>
    {status==="payment_pending"&&<p role="status" style={{padding:12,background:"#fff4d6",borderRadius:10,color:"#83591b"}}>{t("العقد معتمد والطلب بانتظار الدفع. بوابة الدفع الإلكتروني لم يتم ربطها بعد؛ التنفيذ لن يبدأ تلقائيًا.","Contract approved; payment pending. Online payment is not connected yet, so work will not start automatically.")}</p>}
    {["paid","building","preview_ready","approved","delivered","support"].includes(status||"")&&<p role="status" style={{padding:12,background:"#e8f7f1",borderRadius:10,color:"#1b6547"}}>{t("تم تأكيد دفعة المشروع رسميًا من الخادم. متابعة التنفيذ والتسليم تظهر في أقسام حسابك.","A project payment has been verified by the server. Track development and delivery in your account.")}</p>}
   </div>
   <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
    <button type="button" className="atsh-hub-tab" onClick={()=>props.onTab("quotes")}>{t("الطلبات والعروض","Orders & quotes")} ({props.orderCount+props.quoteCount})</button>
    <button type="button" className="atsh-hub-tab" onClick={()=>props.onTab("contracts")}>{t("العقود","Contracts")} ({props.contractCount})</button>
    <button type="button" className="atsh-hub-tab" onClick={()=>props.onTab("invoices")}>{t("الفواتير","Invoices")} ({props.invoiceCount})</button>
    <button type="button" className="atsh-hub-tab" onClick={()=>props.onTab("deliveries")}>{t("التسليمات","Deliverables")} ({props.deliveryCount})</button>
   </div>
  </section>}
 </div>;
}
