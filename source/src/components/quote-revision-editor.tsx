"use client";
import {useState} from "react";

export type EditableQuote={id:number;revision:number;status:string;valid_until:string|null;items:Array<{label:string;quantity:number;unitPricePiasters:number;period?:string}>};
type Props={quote:EditableQuote;onSave:(items:EditableQuote["items"],validUntil:string|null)=>Promise<void>};
export default function QuoteRevisionEditor({quote,onSave}:Props){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [rows,setRows]=useState<EditableQuote["items"]>(()=>Array.isArray(quote.items)?quote.items.map(x=>({...x})):[]);
 const [date,setDate]=useState(quote.valid_until?new Date(quote.valid_until).toISOString().slice(0,10):"");
 const edit=(index:number,field:"label"|"quantity"|"unitPricePiasters",value:string)=>setRows(old=>old.map((row,i)=>i===index?{...row,[field]:field==="label"?value:field==="unitPricePiasters"?Math.round(Number(value)*100):Number(value)}:row));
 const submit=async()=>{setError("");
  if(!rows.length||rows.some(row=>!row.label.trim()||!Number.isSafeInteger(row.quantity)||row.quantity<1||!Number.isSafeInteger(row.unitPricePiasters)||row.unitPricePiasters<0)){setError("راجع البنود والكمية والأسعار قبل الحفظ.");return}
  setBusy(true);try{await onSave(rows,date?new Date(date+"T23:59:59+02:00").toISOString():null);setOpen(false)}catch(e){setError(e instanceof Error?e.message:"فشل تعديل العرض")}finally{setBusy(false)}
 };
 return <div style={{marginTop:9}}>
  <button type="button" onClick={()=>setOpen(v=>!v)}>{open?"إغلاق تعديل العرض":"إصدار نسخة معدّلة من البنود"}</button>
  {open&&<div style={{border:"1px solid #d7e0eb",background:"#f5f8fc",padding:14,borderRadius:12,marginTop:10}}>
   <p style={{fontSize:13}}>ينشئ التعديل عرضًا جديدًا ويُبطل العقد السابق غير الموقّع ورابط مراجعته. لا يمكن تعديل عقد موقّع.</p>
   <div style={{overflowX:"auto"}}><table style={{width:"100%"}}><thead><tr><th>البند</th><th>الكمية</th><th>سعر الوحدة بالجنيه</th><th>الإجراء</th></tr></thead><tbody>
    {rows.map((row,i)=><tr key={i}>
      <td><input aria-label={`وصف البند ${i+1}`} value={row.label} maxLength={250} onChange={e=>edit(i,"label",e.target.value)} style={{width:"100%",minWidth:110}}/></td>
      <td><input aria-label={`كمية البند ${i+1}`} type="number" min={1} max={100} value={row.quantity} onChange={e=>edit(i,"quantity",e.target.value)} style={{width:65}}/></td>
      <td><input aria-label={`سعر البند ${i+1}`} type="number" min={0} step={0.01} value={row.unitPricePiasters/100} onChange={e=>edit(i,"unitPricePiasters",e.target.value)} style={{width:100}}/></td>
      <td><button type="button" onClick={()=>setRows(old=>old.filter((_,j)=>j!==i))}>حذف</button></td>
    </tr>)}</tbody></table></div>
    <button type="button" onClick={()=>setRows(old=>[...old,{label:"بند إضافي",quantity:1,unitPricePiasters:0}])}>إضافة بند</button>
    <label style={{display:"block",marginTop:12}}>صلاحية العرض الجديدة <input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <p style={{fontWeight:800}}>الإجمالي بعد التعديل: {(rows.reduce((n,row)=>n+row.quantity*row.unitPricePiasters,0)/100).toLocaleString("ar-EG")} جنيه</p>
    {error&&<p role="alert" style={{color:"#b91c1c"}}>{error}</p>}
    <button type="button" disabled={busy||rows.length===0} onClick={()=>void submit()} style={{background:"#203958",color:"white",border:0,padding:"10px 16px",borderRadius:9}}>{busy?"جارٍ الحفظ…":"إنشاء إصدار جديد للمراجعة"}</button>
  </div>}
 </div>;
}
