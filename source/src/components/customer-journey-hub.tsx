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
 {id:"projects",label:"طلبي ومتابعته"},
 {id:"messages",label:"مراسلات الإدارة"},
 {id:"preview",label:"معاينة المشروع"},
 {id:"services",label:"لوحة خدماتي"}
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
  <nav aria-label={t("رحلة العميل","Customer journey")} style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,margin:"12px 0 18px"}}>
   {tabs.filter(tab=>tab.id!=="services"||["delivered","support"].includes(props.currentJourneyStatus||"")).map(tab=><button key={tab.id} type="button" aria-current={props.active===tab.id?"page":undefined} onClick={()=>props.onTab(tab.id)} style={{padding:"13px 6px",borderRadius:12,border:"1px solid #d0dced",background:props.active===tab.id?"#203958":"#fff",color:props.active===tab.id?"#fff":"#203958",fontWeight:800,fontSize:13,cursor:"pointer"}}>{en?translatedTabs[tab.id]:tab.label}</button>)}
  </nav>
  {props.active==="overview"&&<section aria-label={t("لوحة العميل","Customer dashboard")}>
   <div style={{background:"#fff",border:"1px solid #dce4ee",borderRadius:16,padding:18,marginBottom:14}}>
    <small style={{color:"#64748b"}}>{t("مشروعك الحالي","Current project")}</small>
    <h2 style={{margin:"7px 0",fontSize:22}}>{props.currentProject?.title||t("لم تختر مشروعًا بعد","No project selected")}</h2>
    <p style={{margin:"0 0 12px",color:"#64748b",fontSize:14}}>{props.currentProject?.sectorName||t("يمكنك متابعة طلبك من قسم مشروعي","Track your request from My project")}</p>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
     <span style={{background:"#eef3f8",borderRadius:20,padding:"6px 12px",fontSize:13,fontWeight:700}}>{!props.currentProject?t("لم يبدأ","Not started"):status==="delivered"||status==="support"?t("تم التسليم","Delivered"):status==="building"?t("قيد التنفيذ","In progress"):status==="payment_pending"?t("بانتظار الدفع","Payment pending"):t("قيد المتابعة","In review")}</span>
     <button type="button" className="atsh-hub-tab" onClick={()=>props.onTab("projects")}>{t("فتح المشروع","Open project")}</button>
    </div>
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
    {([{id:"projects",icon:"📁",ar:"مشروعي",en:"My project",detail:props.draftCount},{id:"invoices",icon:"🧾",ar:"الفاتورة",en:"Invoice",detail:props.invoiceCount},{id:"messages",icon:"✉️",ar:"الرسائل",en:"Messages",detail:null},{id:"preview",icon:"👁️",ar:"المعاينة",en:"Preview",detail:null},{id:"quotes",icon:"📄",ar:"العروض والعقود",en:"Quotes & contracts",detail:props.quoteCount+props.contractCount},{id:"services",icon:"🛠️",ar:"خدماتي",en:"My services",detail:null}] as const).map(item=><button type="button" key={item.id} onClick={()=>props.onTab(item.id)} style={{textAlign:"start",border:"1px solid #dce4ee",background:"#fff",borderRadius:15,padding:"18px 14px",minHeight:108,color:"#203958",cursor:"pointer",font:"inherit"}}>
     <span style={{fontSize:23}}>{item.icon}</span><strong style={{display:"block",fontSize:16,marginTop:8}}>{en?item.en:item.ar}</strong>{item.detail!==null&&<small style={{color:"#64748b"}}>{item.detail}</small>}
    </button>)}
   </div>
  </section>}
 </div>;
}
