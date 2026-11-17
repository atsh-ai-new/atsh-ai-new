import Link from "next/link";
import { sectorTemplates } from "@/lib/sector-catalog";

export const metadata = { title: "معرض الأنظمة | ATSH AI", description: "استكشف نماذج الأنظمة التفاعلية حسب مجال عملك." };

export default function CatalogPage() {
  return <main dir="rtl" style={{maxWidth:1180,margin:"auto",padding:"32px 20px 72px",minHeight:"100vh"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <Link href="/" style={{fontWeight:800,color:"#203958"}}>ATSH AI</Link><Link href="/#configurator" style={{border:"1px solid #ccd1d6",borderRadius:10,padding:"10px 16px"}}>محرك التسعير والباقات</Link>
    </header>
    <section style={{padding:"52px 0 30px"}}>
      <p style={{color:"#4c78ae",fontWeight:700}}>معرض ATSH AI التفاعلي</p>
      <h1 style={{fontSize:"clamp(30px,4vw,54px)",color:"#203958",margin:"12px 0"}}>اختر مجال عملك، ثم شاهد نموذج النظام</h1>
      <p style={{lineHeight:2,maxWidth:730,color:"#64748b"}}>هذه نماذج توضيحية قابلة للتصفح وليست خدمات مرتبطة ببيانات حقيقية. المعرض قابل للتوسع، ويمكن تخصيص النظام بشعارك وألوانك وإضافاتك لاحقًا.</p>
    </section>
    <section aria-label="القطاعات المتاحة" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,255px),1fr))",gap:18}}>
      {sectorTemplates.map(item=><article key={item.slug} style={{background:"#fff",border:"1px solid #e3e1d9",borderRadius:18,padding:23,boxShadow:"0 9px 25px #20395809",display:"flex",flexDirection:"column",gap:12}}>
        <span aria-hidden style={{fontSize:34}}>{item.icon}</span>
        <small style={{color:"#4c78ae"}}>{item.category}</small>
        <h2 style={{margin:0,color:"#203958"}}>{item.name}</h2>
        <p style={{lineHeight:1.9,color:"#64748b",flex:1}}>{item.description}</p>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{item.features.map(f=><span key={f} style={{background:"#edf3f8",padding:"5px 10px",borderRadius:99,fontSize:12}}>{f}</span>)}</div>
        <Link href={`/catalog/${item.slug}`} style={{padding:"12px 14px",background:"#203958",color:"white",borderRadius:10,textAlign:"center",fontWeight:700}}>افتح المعاينة التفاعلية ←</Link>
      </article>)}
    </section>
    <p style={{marginTop:32,color:"#64748b"}}>المزيد من القطاعات والنماذج سيُضاف من لوحة الإدارة. الأسعار النهائية تُحسب من محرك التسعير، لا من هذه البطاقات.</p>
  </main>;
}
