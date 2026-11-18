"use client";
import Link from "next/link";

export type HubTab="overview"|"projects"|"quotes"|"contracts"|"invoices"|"deliveries"|"settings";
type Props={
 active:HubTab;onTab:(tab:HubTab)=>void;
 draftCount:number;projectCount:number;orderCount:number;quoteCount:number;
 contractCount:number;invoiceCount:number;deliveryCount:number;
 currentProject?:{title:string;sectorName?:string;id:string;revision:number};
 currentPreviewStatus?:"pending"|"approved"|"changes_requested"|string;
};
const tabs:Array<{id:HubTab;label:string}>= [
 {id:"overview",label:"الرئيسية"},
 {id:"projects",label:"مشروعاتي ومعايناتي"},
 {id:"quotes",label:"الطلبات وعروض الأسعار"},
 {id:"contracts",label:"العقود"},
 {id:"invoices",label:"الفواتير والمدفوعات"},
 {id:"deliveries",label:"التسليم والمراجعات"},
 {id:"settings",label:"إعدادات الحساب"}
];
const stages=["اختيار المواصفات","تخصيص النموذج","اعتماد المعاينة","عرض السعر والعقد","المدفوعات","التنفيذ والتسليم"];
export default function CustomerJourneyHub(props:Props){
 const counts=[{title:"مسودات المشروعات",number:props.draftCount},{title:"مشروعات مرتبطة",number:props.projectCount},{title:"طلبات",number:props.orderCount},{title:"عروض أسعار",number:props.quoteCount}];
 const previewStatus=props.currentPreviewStatus;
 // Do not infer financial or delivery completion from an unrelated invoice or project.
 const completed=props.currentProject?(previewStatus==="approved"?3:previewStatus?2:1):0;
 return <div dir="rtl" style={{marginBottom:24}}>
  <style>{`.atsh-hub-nav{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.atsh-hub-tab{border:1px solid #d0dced;border-radius:11px;padding:11px 13px;cursor:pointer;background:white;color:#203958;font:inherit;font-size:14px}.atsh-hub-tab[aria-current="page"]{background:#203958;color:white;font-weight:800}.atsh-hub-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:10px}.atsh-hub-flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}@media(max-width:600px){.atsh-hub-flow{grid-template-columns:repeat(2,minmax(0,1fr))}.atsh-hub-tab{flex:1 1 130px}.atsh-hub-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}`}</style>
  <header style={{background:"linear-gradient(125deg,#203958,#2c5c87)",color:"white",padding:"22px 20px",borderRadius:19,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
    <div><p style={{margin:"0 0 6px",opacity:.8,fontSize:14}}>بوابتك الموحدة في ATSH AI</p><h2 style={{margin:"0 0 6px",fontSize:"clamp(22px,4vw,30px)"}}>من الفكرة حتى تسليم مشروعك</h2><p style={{margin:0,opacity:.85,fontSize:13}}>تابع الاختيارات والمعاينات والموافقات والمستندات من الحساب نفسه.</p></div>
    <div style={{display:"flex",flexWrap:"wrap",gap:9}}><Link href="/start" style={{background:"#fff",color:"#203958",borderRadius:11,padding:"12px 16px",fontWeight:800,textDecoration:"none"}}>مشروع جديد ←</Link><Link href="/catalog" style={{border:"1px solid #a9bad0",color:"white",borderRadius:11,padding:"12px 16px",fontWeight:800,textDecoration:"none"}}>المعرض التفاعلي</Link></div>
  </header>
  <nav aria-label="أقسام حساب العميل" className="atsh-hub-nav">
    {tabs.map(tab=><button key={tab.id} className="atsh-hub-tab" type="button" aria-current={props.active===tab.id?"page":undefined} onClick={()=>props.onTab(tab.id)}>{tab.label}</button>)}
  </nav>
  {props.active==="overview"&&<section aria-label="ملخص رحلة العميل">
   <div className="atsh-hub-stats">
     {counts.map(item=><div key={item.title} style={{background:"#fff",border:"1px solid #dce4ee",padding:17,borderRadius:14}}><small style={{color:"#536983"}}>{item.title}</small><strong style={{display:"block",fontSize:25,color:"#203958",marginTop:6}}>{item.number}</strong></div>)}
   </div>
   <div style={{border:"1px solid #dce4ee",background:"#fff",padding:"19px",borderRadius:15,marginTop:14}}>
    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:9,alignItems:"center"}}>
      <div><h3 style={{margin:"0 0 6px"}}>رحلة المشروع الحالية</h3><p style={{margin:0,color:"#64748b",fontSize:14}}>{props.currentProject?`${props.currentProject.title} · ${props.currentProject.sectorName||"مشروع قيد التجهيز"}`:"ابدأ مشروعًا أو اختر نموذجًا لإنشاء مسودة تخصك."}</p></div>
      <button type="button" onClick={()=>props.onTab("projects")} style={{border:0,background:"#203958",color:"white",padding:"10px 14px",borderRadius:10,cursor:"pointer"}}>{props.currentProject?"استكمال المشروع":"إنشاء مشروع"} ←</button>
    </div>
    <div className="atsh-hub-flow" style={{marginTop:18}}>{stages.map((label,index)=>{
      const state=index<completed?"done":index===completed?"current":"waiting";
      return <div key={label} aria-current={state==="current"?"step":undefined} style={{border:"1px solid "+(state==="done"?"#a2d4be":state==="current"?"#89aacb":"#e1e6ed"),background:state==="done"?"#edf9f2":state==="current"?"#eff5ff":"#f9fafb",borderRadius:12,padding:12,minWidth:0}}>
      <span style={{fontSize:12,fontWeight:800,color:state==="done"?"#17633f":"#203958"}}>{state==="done"?"✓ مكتمل":state==="current"?"● المرحلة الحالية":"○ لاحقًا"}</span><div style={{fontWeight:700,marginTop:8,fontSize:13}}>{index+1}. {label}</div></div>;
    })}</div>
    <p style={{fontSize:12,color:"#64748b",margin:"12px 0 0"}}>يُعرض التقدم المؤكد لمسودة المعاينة فقط؛ مراحل الدفع والتنفيذ لا تعتبر مكتملة إلا بعد تحقق سجلاتها الخاصة.</p>
   </div>
   <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
    <button type="button" className="atsh-hub-tab" onClick={()=>props.onTab("quotes")}>الطلبات والعروض ({props.orderCount+props.quoteCount})</button>
    <button type="button" className="atsh-hub-tab" onClick={()=>props.onTab("contracts")}>العقود ({props.contractCount})</button>
    <button type="button" className="atsh-hub-tab" onClick={()=>props.onTab("invoices")}>الفواتير ({props.invoiceCount})</button>
    <button type="button" className="atsh-hub-tab" onClick={()=>props.onTab("deliveries")}>التسليمات ({props.deliveryCount})</button>
   </div>
  </section>}
 </div>;
}
