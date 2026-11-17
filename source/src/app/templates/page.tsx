"use client";
import {useEffect,useState} from "react";
type Template={id:string;slug:string;title:string;sector:string;description:string;preview_url:string|null};
export default function TemplatesPage(){
 const [items,setItems]=useState<Template[]>([]);const [error,setError]=useState("");
 useEffect(()=>{const controller=new AbortController();fetch("/api/templates",{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error("تعذر تحميل القوالب");return r.json();}).then(data=>setItems(data.templates||[])).catch(e=>{if(e.name!=="AbortError")setError(e.message);});return()=>controller.abort();},[]);
 return <main dir="rtl" style={{maxWidth:1100,margin:"auto",padding:"3rem 1.25rem",color:"#203958"}}><h1>مكتبة نماذج ATSH AI</h1><p>نماذج منشورة ومعاينات فعلية عند توافر رابط بناء مستقل.</p>{error&&<p role="alert">{error}</p>}<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20}}>{items.map(t=><article key={t.id} style={{border:"1px solid #d9e0ea",borderRadius:16,padding:20,background:"#fff"}}><small>{t.sector}</small><h2>{t.title}</h2><p>{t.description}</p>{t.preview_url?<a href={t.preview_url} target="_blank" rel="noopener noreferrer">فتح المعاينة التفاعلية ↗</a>:<span>المعاينة غير منشورة بعد</span>}</article>)}</div>{!error&&items.length===0&&<p>لا توجد قوالب منشورة حاليًا.</p>}</main>;
}
