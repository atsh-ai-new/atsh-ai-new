"use client";
import {newsTickerPositions,type NewsTickerPosition} from "@/lib/news-ticker-position";

export function NewsTickerPositionEditor({position,text,onChange,onPreview}:{position:NewsTickerPosition;text:string;onChange:(position:NewsTickerPosition)=>void;onPreview:()=>void}){
 const index=newsTickerPositions.findIndex(p=>p.value===position);
 const move=(delta:-1|1)=>{const next=newsTickerPositions[index+delta];if(next)onChange(next.value)};
 const rowStyle={padding:"8px 12px",borderRadius:6,border:"1px solid #d9e2eb",background:"#f5f7fa",textAlign:"center" as const,color:"#42566b"};
 const slot=(value:NewsTickerPosition)=>position===value?<div data-news-ticker-preview={value} style={{...rowStyle,background:"#fff",color:"#14243C",border:"2px solid #29709a",fontWeight:700,overflowWrap:"anywhere"}}>{text.trim()||"شريط الأخبار"} <small style={{display:"block",fontWeight:500}}>موضع الشريط</small></div>:null;
 return <fieldset style={{border:"1px solid #d9e2eb",borderRadius:10,padding:12,marginBlock:12,minWidth:0}}>
   <legend><strong>مكان عرض شريط الأخبار</strong></legend>
   <label className="admin-field">موضع الشريط في الصفحة<select value={position} onChange={e=>onChange(e.target.value as NewsTickerPosition)}>{newsTickerPositions.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
   <div className="admin-actions" style={{flexWrap:"wrap",gap:8}}>
     <button type="button" className="button button-outline button-small" disabled={index===0} onClick={()=>move(-1)}>↑ نقل الشريط للأعلى</button>
     <button type="button" className="button button-outline button-small" disabled={index===newsTickerPositions.length-1} onClick={()=>move(1)}>↓ نقل الشريط للأسفل</button>
     <button type="button" className="button button-outline button-small" onClick={onPreview}>معاينة الموضع على الصفحة</button>
   </div>
   <div aria-label="معاينة ترتيب شريط الأخبار" style={{display:"grid",gap:5,maxWidth:520,marginBlock:12,padding:8,background:"#e8edf2",borderRadius:8}}>
     {slot("top")}
     <div style={rowStyle}>الترويسة · اللوجو والقائمة</div>
     {slot("below_header")}
     <div style={{...rowStyle,paddingBlock:20}}>الواجهة الرئيسية</div>
     {slot("after_hero")}
     <div style={{...rowStyle,paddingBlock:20}}>محتوى الصفحة</div>
     {slot("before_footer")}
     <div style={rowStyle}>تذييل الصفحة</div>
   </div>
   <p className="field-hint">المعاينة التوضيحية تتغير فور تحريك الشريط؛ استخدم معاينة الصفحة لرؤية النتيجة بالحجم الحقيقي. احفظ وانشر لتطبيقها للزوار. ينطبق الموضع على الصفحات العامة؛ يظل الشريط أعلى لوحة الإدارة وبوابة العميل والفريق، وكذلك الصفحات التي لا تحتوي على الموضع المختار.</p>
 </fieldset>;
}
