"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { sectorTemplates, type SectorTemplate } from "@/lib/sector-catalog";
type Item = SectorTemplate & { published?:boolean; archived?:boolean; sortOrder?:number; imageUrl?:string; previewUrl?:string };
const fallback:Item[]=sectorTemplates.map((item,index)=>({...item,published:true,sortOrder:index*10}));
export default function CatalogPage() {
  const [items,setItems]=useState<Item[]>(fallback);
  const [warning,setWarning]=useState("");
  useEffect(()=>{
    let active=true;
    fetch("/api/site-content/catalog",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw Error("الكتالوج غير متصل بعد");
      return response.json();
    }).then(payload=>{
      if(!active)return;
      const raw=payload?.page?.content?.items;
      if(!Array.isArray(raw))return;
      setItems(raw.filter((x:Item)=>x&&typeof x.slug==="string"&&typeof x.name==="string"&&x.published!==false&&!x.archived).sort((a:Item,b:Item)=>(a.sortOrder??0)-(b.sortOrder??0)));
      setWarning("");
    }).catch(()=>{if(active)setWarning("تُعرض حاليًا النماذج الافتراضية إلى حين ربط قاعدة بيانات الكتالوج.");});
    return()=>{active=false};
  },[]);
  return <main dir="rtl" style={{maxWidth:1180,margin:"auto",padding:"32px 20px 72px",minHeight:"100vh"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <Link href="/" style={{fontWeight:800,color:"#203958"}}>ATSH AI</Link><Link href="/#configurator" style={{border:"1px solid #ccd1d6",borderRadius:10,padding:"10px 16px"}}>محرك التسعير والباقات</Link>
    </header>
    <section style={{padding:"52px 0 30px"}}>
      <p style={{color:"#4c78ae",fontWeight:700}}>معرض ATSH AI التفاعلي</p>
      <h1 style={{fontSize:"clamp(30px,4vw,54px)",color:"#203958",margin:"12px 0"}}>اختر مجال عملك، ثم شاهد نموذج النظام</h1>
      <p style={{lineHeight:2,maxWidth:730,color:"#64748b"}}>نماذج تفاعلية توضيحية قابلة للتخصيص، وليست أنظمة متصلة ببيانات حقيقية. يمكنك اختيار الإضافات وحساب السعر من محرك التسعير.</p>
      {warning&&<p role="status" style={{fontSize:12,color:"#9a6700"}}>{warning}</p>}
    </section>
    <section aria-label="القطاعات المتاحة" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,255px),1fr))",gap:18}}>
      {items.map(item=><article key={item.slug} style={{background:"#fff",border:"1px solid #e3e1d9",borderRadius:18,padding:23,boxShadow:"0 9px 25px #20395809",display:"flex",flexDirection:"column",gap:12}}>
        {item.imageUrl?.startsWith("https://")?<img src={item.imageUrl} alt={item.name} style={{width:"100%",height:155,objectFit:"cover",borderRadius:12}}/>:<span aria-hidden style={{fontSize:34}}>{item.icon||"📁"}</span>}
        <small style={{color:"#4c78ae"}}>{item.category}</small><h2 style={{margin:0,color:"#203958"}}>{item.name}</h2>
        <p style={{lineHeight:1.9,color:"#64748b",flex:1}}>{item.description}</p>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{(item.features??[]).map(f=><span key={f} style={{background:"#edf3f8",padding:"5px 10px",borderRadius:99,fontSize:12}}>{f}</span>)}</div>
        <Link href={`/catalog/${encodeURIComponent(item.slug)}`} style={{padding:"12px 14px",background:"#203958",color:"white",borderRadius:10,textAlign:"center",fontWeight:700}}>افتح المعاينة التفاعلية ←</Link>
      </article>)}
    </section>
  </main>;
}
