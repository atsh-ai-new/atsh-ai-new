"use client";
import type {CSSProperties} from "react";

type PreviewType="clinic"|"pharmacy"|"retail"|"legal"|"general";
const TYPES:Record<string,PreviewType>={eyadaty:"clinic",agzakhana:"pharmacy",supermarket:"retail",avocato:"legal"};
const screens:Record<PreviewType,{name:string;icon:string;metric:string;labels:string[];accent:string;values:string[]}>={
 clinic:{name:"نظام العيادة",icon:"🩺",metric:"المواعيد",labels:["المرضى","المواعيد","الفواتير"],accent:"#137a95",values:["24","8","12"]},
 pharmacy:{name:"نظام الصيدلية",icon:"💊",metric:"البيع",labels:["الأصناف","الفواتير","المخزون"],accent:"#1e8770",values:["64","11","3"]},
 retail:{name:"نقطة بيع",icon:"🛒",metric:"الكاشير",labels:["المبيعات","المخزون","الطلبات"],accent:"#345bb6",values:["12.4k","86","18"]},
 legal:{name:"إدارة القضايا",icon:"⚖️",metric:"الجلسات",labels:["القضايا","الجلسات","الموكلون"],accent:"#8063a5",values:["19","4","13"]},
 general:{name:"إدارة النشاط",icon:"▦",metric:"المشروعات",labels:["لوحة التحكم","المتابعة","التقارير"],accent:"#456d95",values:["12","24","8"]}
};
const container:CSSProperties={height:156,overflow:"hidden",border:"1px solid #dbe5f0",borderRadius:13,background:"#f8fbff",position:"relative",display:"flex",color:"#223c57",direction:"rtl"};
export default function CatalogCardPreview({slug,name}:{slug:string;name:string}){
 const example=screens[TYPES[slug]??"general"];
 return <div aria-hidden="true" style={container}>
  <aside style={{width:49,flexShrink:0,background:"#233a57",padding:"12px 8px",color:"white",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
   <span style={{fontSize:20}}>{example.icon}</span><span style={{opacity:.8}}>▦</span><span style={{opacity:.55}}>☷</span><span style={{opacity:.45}}>▤</span>
  </aside>
  <div style={{padding:"9px 10px",minWidth:0,flex:1}}>
   <div style={{height:19,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:9,marginBottom:10,opacity:.85}}><strong>{name}</strong><span>● ● ●</span></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:5,marginBottom:8}}>
    {example.labels.map((label,i)=><div key={label} style={{background:"white",padding:"6px 4px",border:"1px solid #e8eef7",borderRadius:6}}>
     <small style={{fontSize:7,color:"#7c8da0",display:"block",whiteSpace:"nowrap",overflow:"hidden"}}>{label}</small>
     <b style={{fontSize:14,color:example.accent}}>{example.values[i]}</b>
    </div>)}
   </div>
   <div style={{background:"white",padding:8,borderRadius:6,border:"1px solid #e8eef7",height:62}}>
    <div style={{fontSize:8,marginBottom:6,fontWeight:700}}>متابعة {example.metric}</div>
    {[80,65,90,46,72].map((v,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
     <span style={{width:22,height:3,background:"#dae6f3",borderRadius:4}}/>
     <span style={{height:3,width:`${v}%`,maxWidth:100,background:example.accent,opacity:.6,borderRadius:4}}/>
    </div>)}
   </div>
  </div>
  <span style={{position:"absolute",bottom:6,left:7,background:"#fff",border:"1px solid #e2e8f0",padding:"3px 6px",borderRadius:5,fontSize:8}}>لقطة توضيحية</span>
 </div>;
}
