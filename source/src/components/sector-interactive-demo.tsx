"use client";

import {useEffect,useMemo,useState,type CSSProperties,type FormEvent} from "react";

type DomainSlug="supermarket"|"agzakhana"|"eyadaty"|"avocato";
type Product={id:string;name:string;price:number;stock:number};
type Sale={id:string;date:string;total:number;description:string};
type Contact={id:string;name:string;phone:string};
type Appointment={id:string;contactId:string;date:string;status:"قادم"|"مكتمل"|"ملغى"};
type Matter={id:string;title:string;contactId:string;status:"مفتوحة"|"قيد المتابعة"|"مغلقة";hearing:string};
type Invoice={id:string;contactId:string;amount:number;paid:boolean};
type DocumentRef={id:string;title:string;matterId:string};
type DemoData={products:Product[];sales:Sale[];contacts:Contact[];appointments:Appointment[];matters:Matter[];invoices:Invoice[];documents:DocumentRef[]};
type CartRow={productId:string;quantity:number};

const newId=()=>typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():`demo-${Date.now()}-${Math.random()}`;
const egp=(n:number)=>n.toLocaleString("ar-EG",{maximumFractionDigits:2,minimumFractionDigits:2})+" ج.م";
const box:CSSProperties={background:"#fff",padding:17,border:"1px solid #e2e8f0",borderRadius:14,marginBottom:15};
const field:CSSProperties={width:"100%",minWidth:0,padding:11,border:"1px solid #cbd5e1",borderRadius:10,background:"white",boxSizing:"border-box"};
const td:CSSProperties={padding:10,borderBottom:"1px solid #edf2f7",whiteSpace:"nowrap"};
function starter(slug:DomainSlug):DemoData{
 const isPharmacy=slug==="agzakhana";
 const products:Product[]=isPharmacy?[
  {id:"p1",name:"مستلزم صحي تجريبي أ",price:25,stock:14},
  {id:"p2",name:"منتج صيدلي تجريبي ب",price:45,stock:4},
  {id:"p3",name:"منتج عناية تجريبي ج",price:70,stock:12}
 ]:slug==="supermarket"?[
  {id:"p1",name:"أرز 1 كجم",price:42,stock:25},
  {id:"p2",name:"زيت 1 لتر",price:92,stock:9},
  {id:"p3",name:"سكر 1 كجم",price:32,stock:4}
 ]:[];
 const clinic=slug==="eyadaty",legal=slug==="avocato";
 return {products,sales:[],contacts:clinic?[{id:"a1",name:"مراجع افتراضي 001",phone:"بيانات تدريب"}]:
 legal?[{id:"a1",name:"موكل افتراضي 001",phone:"بيانات تدريب"}]:[],
  appointments:clinic?[{id:"v1",contactId:"a1",date:"2026-12-01T10:00",status:"قادم"}]:[],
  matters:legal?[{id:"c1",title:"قضية تدريبية 001",contactId:"a1",status:"مفتوحة",hearing:"2026-12-02"}]:[],
  invoices:[],documents:legal?[{id:"doc1",title:"مستند توضيحي فقط",matterId:"c1"}]:[]};
}
export const isInteractiveSector=(slug:string):slug is DomainSlug=>["supermarket","agzakhana","eyadaty","avocato"].includes(slug);
function table(headers:string[],rows:React.ReactNode[][]){
 return <div style={{overflowX:"auto",maxWidth:"100%"}}><table style={{borderCollapse:"collapse",width:"100%",textAlign:"right",fontSize:13,minWidth:440}}>
  <thead><tr>{headers.map(h=><th key={h} scope="col" style={{...td,background:"#f1f5fa",color:"#334155"}}>{h}</th>)}</tr></thead>
  <tbody>{rows.length?rows.map((cells,i)=><tr key={i}>{cells.map((cell,j)=><td key={j} style={td}>{cell}</td>)}</tr>):
   <tr><td colSpan={headers.length} style={{padding:20,color:"#64748b"}}>لا توجد سجلات بعد. استخدم أزرار الإضافة لتجربة النظام.</td></tr>}</tbody>
 </table></div>;
}
export default function SectorInteractiveDemo({slug,active,brand,onNavigate}:{slug:DomainSlug;active:string;brand:string;onNavigate:(module:string)=>void}){
 const [data,setData]=useState<DemoData>(()=>starter(slug));
 const [ready,setReady]=useState(false);
 const [notice,setNotice]=useState("");
 const [cart,setCart]=useState<CartRow[]>([]);
 const [selectedProduct,setSelectedProduct]=useState("p1");
 const [qty,setQty]=useState(1);
 const [formName,setFormName]=useState("");
 const [formSecondary,setFormSecondary]=useState("");
 const [formPrice,setFormPrice]=useState("25");
 const [formCount,setFormCount]=useState("10");
 const [selectedContact,setSelectedContact]=useState("a1");
 const [date,setDate]=useState("");
 const [amount,setAmount]=useState("250");
 const [selectedMatter,setSelectedMatter]=useState("c1");
 const [method,setMethod]=useState("نقدي");
 const storage=`atsh-demo-${slug}-v2`;
 useEffect(()=>{
   setReady(false);setData(starter(slug));setCart([]);setNotice("");
   try{const saved=window.sessionStorage.getItem(storage);if(saved){
     const value=JSON.parse(saved) as Partial<DemoData>;
     if(value&&Array.isArray(value.products)&&Array.isArray(value.sales)&&Array.isArray(value.contacts)&&Array.isArray(value.appointments)&&Array.isArray(value.matters)&&Array.isArray(value.invoices)&&Array.isArray(value.documents))
       setData(value as DemoData);
   }}catch{/* browsers may disable session storage */}
   setReady(true);
 },[slug,storage]);
 useEffect(()=>{if(ready)try{window.sessionStorage.setItem(storage,JSON.stringify(data));}catch{/* private or full storage */}},[ready,storage,data]);
 const action:CSSProperties={background:brand,color:"#fff",padding:"10px 15px",borderRadius:10,border:0,cursor:"pointer",fontWeight:700};
 const secondary:CSSProperties={padding:"8px 12px",background:"#ecf2fa",color:"#203958",borderRadius:9,border:"1px solid #d6e2f0",cursor:"pointer"};
 const productTotal=useMemo(()=>cart.reduce((sum,line)=>sum+(data.products.find(p=>p.id===line.productId)?.price??0)*line.quantity,0),[cart,data.products]);
 const sold=useMemo(()=>data.sales.reduce((sum,x)=>sum+x.total,0),[data.sales]);
 const contactName=(contactId:string)=>data.contacts.find(c=>c.id===contactId)?.name??"غير محدد";
 const report=(text:string)=>{setNotice(text);window.setTimeout(()=>setNotice(""),6500);};
 const reset=()=>{if(!window.confirm("إعادة ضبط بيانات المحاكاة فقط؟ لن يؤثر هذا في طلبك أو حسابك."))return;setData(starter(slug));setCart([]);report("أُعيد ضبط النموذج التجريبي.");};
 const navigation=(module:string)=>{onNavigate(module);setNotice("");};
 const saveContact=(event:FormEvent)=>{event.preventDefault();if(!formName.trim())return;
  const newContact={id:newId(),name:formName.trim().slice(0,80),phone:formSecondary.trim().slice(0,40)};
  setData(d=>({...d,contacts:[newContact,...d.contacts]}));setSelectedContact(newContact.id);setFormName("");setFormSecondary("");report("تمت إضافة بيانات تدريبية إلى هذا النموذج فقط.");};
 const addProduct=(event:FormEvent)=>{event.preventDefault();
  const price=Number(formPrice),stock=Number(formCount);
  if(!formName.trim()||!Number.isFinite(price)||price<0||price>1e7||!Number.isSafeInteger(stock)||stock<0||stock>100000){report("راجع اسم الصنف والسعر والكمية.");return;}
  const product={id:newId(),name:formName.trim().slice(0,80),price,stock};
  setData(d=>({...d,products:[product,...d.products]}));setSelectedProduct(product.id);setFormName("");report("أُضيف الصنف إلى مخزون المحاكاة.");};
 const addToCart=()=>{
  const product=data.products.find(p=>p.id===selectedProduct);
  const current=cart.find(x=>x.productId===selectedProduct)?.quantity??0;
  if(!product||!Number.isSafeInteger(qty)||qty<1||qty+current>product.stock){report("الكمية المطلوبة أكبر من المخزون المتاح.");return;}
  setCart(c=>c.find(x=>x.productId===selectedProduct)?c.map(x=>x.productId===selectedProduct?{...x,quantity:x.quantity+qty}:x):[...c,{productId:selectedProduct,quantity:qty}]);
  report("أُضيف الصنف إلى فاتورة الكاشير.");};
 const checkout=()=>{
  if(!cart.length){report("أضف صنفًا إلى الفاتورة أولًا.");return;}
  for(const line of cart){const product=data.products.find(x=>x.id===line.productId);if(!product||line.quantity>product.stock){report("مخزون غير كافٍ لإتمام البيع التجريبي.");return;}}
  const description=cart.map(line=>`${data.products.find(p=>p.id===line.productId)?.name} × ${line.quantity}`).join("، ");
  const receipt:Sale={id:newId(),date:new Date().toLocaleString("ar-EG"),total:productTotal,description:`${description} — ${method}`};
  setData(d=>({...d,products:d.products.map(p=>({...p,stock:p.stock-(cart.find(line=>line.productId===p.id)?.quantity??0)})),sales:[receipt,...d.sales]}));
  setCart([]);report(`صدرت فاتورة تجريبية بقيمة ${egp(productTotal)} وانخفض المخزون تلقائيًا.`);};
 const addAppointment=(event:FormEvent)=>{event.preventDefault();if(!selectedContact||!date){report("اختر اسمًا وموعدًا.");return;}
  setData(d=>({...d,appointments:[{id:newId(),contactId:selectedContact,date,status:"قادم"},...d.appointments]}));setDate("");report("تم حجز موعد تجريبي.");};
 const addMatter=(event:FormEvent)=>{event.preventDefault();if(!selectedContact||!formName.trim())return;
  setData(d=>({...d,matters:[{id:newId(),title:formName.trim().slice(0,100),contactId:selectedContact,status:"مفتوحة",hearing:date},...d.matters]}));
  setFormName("");setDate("");report("أُضيف ملف قضية تجريبي.");};
 const addInvoice=(event:FormEvent)=>{event.preventDefault();const value=Number(amount);if(!selectedContact||!Number.isFinite(value)||value<=0||value>1e7){report("قيمة غير صحيحة.");return;}
  setData(d=>({...d,invoices:[{id:newId(),contactId:selectedContact,amount:value,paid:false},...d.invoices]}));report("أُنشئت فاتورة تجريبية غير مدفوعة.");};
 const contactOptions=data.contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>);
 const miniForm=(onSubmit:(event:FormEvent)=>void,button:string,content:React.ReactNode)=>
 <form onSubmit={onSubmit} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,190px),1fr))",gap:12,alignItems:"end",marginTop:12,marginBottom:18}}>
  {content}<button type="submit" style={action}>{button}</button>
 </form>;
 const contactForm=miniForm(saveContact,"إضافة "+(slug==="eyadaty"?"مراجع":"موكل"),<>
  <label>الاسم التجريبي<input required maxLength={80} style={field} value={formName} onChange={e=>setFormName(e.target.value)}/></label>
  <label>معلومة اتصال تجريبية<input maxLength={40} style={field} value={formSecondary} onChange={e=>setFormSecondary(e.target.value)}/></label>
 </>);
 const contactTable=table(["الاسم","الاتصال","المصدر"],data.contacts.map(c=>[c.name,c.phone||"—","بيانات تجريبية"]));
 const isStore=slug==="supermarket"||slug==="agzakhana";
 const isClinic=slug==="eyadaty";
 const isLegal=slug==="avocato";
 const paidTotal=data.invoices.filter(x=>x.paid).reduce((sum,x)=>sum+x.amount,0);
 const stats=isStore?[
  ["إجمالي مبيعات المحاكاة",egp(sold)],["الفواتير",String(data.sales.length)],["الأصناف",String(data.products.length)],["نواقص المخزون",String(data.products.filter(p=>p.stock<5).length)]
 ]:isClinic?[
  ["المراجعون",String(data.contacts.length)],["المواعيد القادمة",String(data.appointments.filter(x=>x.status==="قادم").length)],["الكشوفات المكتملة",String(data.appointments.filter(x=>x.status==="مكتمل").length)],["فواتير التدريب",egp(data.invoices.reduce((sum,x)=>sum+x.amount,0))]
 ]:[
  ["ملفات القضايا",String(data.matters.length)],["القضايا المفتوحة",String(data.matters.filter(x=>x.status!=="مغلقة").length)],["الموكلون",String(data.contacts.length)],["أتعاب مسجلة",egp(data.invoices.reduce((sum,x)=>sum+x.amount,0))]
 ];
 return <section aria-label="لوحة تشغيل النموذج التفاعلي" style={{minWidth:0}}>
  <div style={{...box,background:"#eff6ff",borderColor:"#d2e2f4"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}>
    <strong style={{color:"#204466"}}>نظام تفاعلي للتجربة — بدون عمليات أو بيانات حقيقية</strong>
    <button style={secondary} onClick={reset} type="button">إعادة ضبط المحاكاة</button>
   </div>
   <p style={{color:"#49657e",fontSize:12,lineHeight:1.8,marginBottom:0}}>
    جرّب العمليات والأزرار والفواتير والمخزون أو المواعيد. البيانات محلية في تبويب متصفحك، ولا تُرسل إلى قاعدة عملاء أو نظام دفع. استخدم أسماء وهمية فقط.
   </p>
  </div>
  {notice&&<div role="status" style={{...box,background:"#e8f7ee",color:"#166534"}}>{notice}</div>}
  <h2 style={{color:brand,marginTop:12}}>{active}</h2>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,170px),1fr))",gap:10,marginBottom:20}}>
   {stats.map(([label,value])=><div key={label} style={{...box,marginBottom:0}}><small style={{color:"#64748b"}}>{label}</small><strong style={{display:"block",fontSize:23,marginTop:9,color:brand}}>{value}</strong></div>)}
  </div>
  {active==="لوحة القيادة"&&<section style={box}>
   <h3>العمليات السريعة</h3>
   <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18}}>
    {(isStore?["الكاشير",slug==="agzakhana"?"الأدوية":"الأصناف","المبيعات"]:isClinic?["المرضى","المواعيد","الفواتير"]:["القضايا","الموكلون","الجلسات"]).map(x=><button key={x} style={secondary} onClick={()=>navigation(x)}>{x} ←</button>)}
   </div>
   <h4>آخر نشاط بالمحاكاة</h4>
   {isStore?table(["تاريخ الفاتورة","المحتوى","القيمة"],data.sales.slice(0,5).map(x=>[x.date,x.description,egp(x.total)])):
    isClinic?table(["الاسم","التاريخ","الحالة"],data.appointments.slice(0,5).map(x=>[contactName(x.contactId),x.date,x.status])):
    table(["القضية","الموكل","الحالة"],data.matters.slice(0,5).map(x=>[x.title,contactName(x.contactId),x.status]))}
  </section>}
  {isStore&&active==="الكاشير"&&<section style={box}>
   <h3>كاشير POS تفاعلي</h3>
   <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"end"}}>
    <label style={{flex:"2 1 210px"}}>اختر صنفًا<select aria-label="اختر صنفًا" value={selectedProduct} onChange={e=>setSelectedProduct(e.target.value)} style={field}>
     {data.products.map(p=><option key={p.id} value={p.id}>{p.name} — {egp(p.price)} — رصيد {p.stock}</option>)}
    </select></label>
    <label style={{flex:"1 1 90px"}}>الكمية<input aria-label="كمية الكاشير" style={field} type="number" min={1} max={10000} value={qty} onChange={e=>setQty(Number(e.target.value))}/></label>
    <button type="button" style={action} onClick={addToCart}>إضافة للفاتورة</button>
   </div>
   <h4>الفاتورة الحالية</h4>
   {table(["الصنف","الكمية","الإجمالي","إجراء"],cart.map(line=>{const p=data.products.find(x=>x.id===line.productId);return [p?.name||"—",String(line.quantity),egp((p?.price??0)*line.quantity),
    <button key="delete" style={secondary} onClick={()=>setCart(c=>c.filter(x=>x.productId!==line.productId))}>إزالة</button>]}))}
   <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:18}}>
    <strong>إجمالي الفاتورة: {egp(productTotal)}</strong>
    <label>طريقة دفع افتراضية<select style={{...field,width:150}} value={method} onChange={e=>setMethod(e.target.value)}><option>نقدي</option><option>بطاقة (محاكاة)</option></select></label>
    <button type="button" style={action} onClick={checkout} disabled={!cart.length}>إتمام بيع تجريبي</button>
   </div>
  </section>}
  {isStore&&["الأصناف","الأدوية","المشتريات"].includes(active)&&<section style={box}>
   <h3>{active==="المشتريات"?"إضافة توريد إلى المخزون":"إدارة الأصناف والمخزون"}</h3>
   {miniForm(addProduct,"إضافة صنف",<>
    <label>اسم الصنف<input required maxLength={80} value={formName} onChange={e=>setFormName(e.target.value)} style={field}/></label>
    <label>السعر بالجنيه<input type="number" step=".01" min="0" value={formPrice} onChange={e=>setFormPrice(e.target.value)} style={field}/></label>
    <label>الكمية<input type="number" min="0" step="1" value={formCount} onChange={e=>setFormCount(e.target.value)} style={field}/></label>
   </>)}
   {table(["الصنف","السعر","المخزون","الحالة","إجراء"],data.products.map(p=>[
    p.name,egp(p.price),String(p.stock),p.stock<5?"مخزون منخفض":"متوفر",
    <button key="restock" style={secondary} type="button" onClick={()=>{setData(d=>({...d,products:d.products.map(x=>x.id===p.id?{...x,stock:x.stock+10}:x)}));report("أُضيف توريد تجريبي بكمية 10.");}}>توريد +10</button>
   ]))}
   {slug==="agzakhana"&&<p style={{color:"#9a5a12",fontSize:12}}>لا يدعم النموذج صرف وصفات أو التحقق الطبي أو إدارة أدوية حقيقية.</p>}
  </section>}
  {isStore&&active==="المبيعات"&&<section style={box}><h3>سجل فواتير المبيعات</h3>
   {table(["رقم العملية","الوقت","بنود الفاتورة","القيمة"],data.sales.map((x,i)=>[String(data.sales.length-i),x.date,x.description,egp(x.total)]))}
  </section>}
  {isStore&&active==="الموردون"&&<section style={box}><h3>الموردون والمخزون</h3><p>جرّب توريد الأصناف وزيادة الرصيد، ثم نفّذ عمليات بيع للكشف عن تغير المخزون.</p>
   <button style={action} onClick={()=>navigation("الأصناف")}>فتح إدارة المخزون</button>
  </section>}
  {isStore&&active==="التقارير"&&<section style={box}><h3>تقارير مباشرة من معاملات المحاكاة</h3>
   <p>إجمالي المبيعات التجريبية: <strong>{egp(sold)}</strong> · عدد الفواتير: <strong>{data.sales.length}</strong></p>
   {table(["الصنف","الرصيد الحالي","التنبيه"],data.products.map(p=>[p.name,String(p.stock),p.stock<5?"يحتاج توريدًا":"رصيد جيد"]))}
  </section>}
  {isClinic&&active==="المرضى"&&<section style={box}><h3>قائمة مراجعين تجريبية</h3>{contactForm}{contactTable}</section>}
  {isClinic&&["المواعيد","الكشوفات"].includes(active)&&<section style={box}>
   <h3>{active==="الكشوفات"?"قائمة الكشوفات":"إدارة وحجز المواعيد"}</h3>
   {miniForm(addAppointment,"حجز موعد",<>
    <label>المراجع<select style={field} value={selectedContact} onChange={e=>setSelectedContact(e.target.value)}>{contactOptions}</select></label>
    <label>التاريخ والوقت<input aria-label="تاريخ الموعد" required type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} style={field}/></label>
   </>)}
   {table(["المراجع","الموعد","الحالة","إجراء"],data.appointments.map(v=>[
    contactName(v.contactId),v.date.replace("T"," "),v.status,
    <div key="actions" style={{display:"flex",gap:5}}>{v.status==="قادم"&&<>
     <button type="button" style={secondary} onClick={()=>setData(d=>({...d,appointments:d.appointments.map(x=>x.id===v.id?{...x,status:"مكتمل"}:x)}))}>اكتمال الكشف</button>
     <button type="button" style={secondary} onClick={()=>setData(d=>({...d,appointments:d.appointments.map(x=>x.id===v.id?{...x,status:"ملغى"}:x)}))}>إلغاء</button>
    </>}</div>
   ]))}
  </section>}
  {isClinic&&active==="الروشتات"&&<section style={box}><h3>معاينة قسم الوصفات</h3><p>يظهر هذا القسم ضمن تخطيط النظام فقط. لا نصدر وصفات طبية أو قرارات علاجية داخل المعاينة العامة.</p>
    <button type="button" style={secondary} onClick={()=>navigation("الكشوفات")}>الانتقال إلى الكشوفات</button>
   </section>}
  {isLegal&&active==="الموكلون"&&<section style={box}><h3>دليل الموكلين التجريبي</h3>{contactForm}{contactTable}</section>}
  {isLegal&&active==="القضايا"&&<section style={box}>
   <h3>قضايا المكتب</h3>
   {miniForm(addMatter,"إضافة قضية تجريبية",<>
    <label>عنوان القضية<input required maxLength={100} value={formName} onChange={e=>setFormName(e.target.value)} style={field}/></label>
    <label>الموكل<select style={field} value={selectedContact} onChange={e=>setSelectedContact(e.target.value)}>{contactOptions}</select></label>
    <label>الجلسة التالية<input type="date" value={date} onChange={e=>setDate(e.target.value)} style={field}/></label>
   </>)}
   {table(["القضية","الموكل","الحالة","الجلسة","إجراء"],data.matters.map(m=>[
    m.title,contactName(m.contactId),m.status,m.hearing||"غير محددة",
    <button key="stage" type="button" style={secondary} onClick={()=>setData(d=>({...d,matters:d.matters.map(x=>x.id===m.id?{...x,status:x.status==="مفتوحة"?"قيد المتابعة":x.status==="قيد المتابعة"?"مغلقة":"مفتوحة"}:x)}))}>تغيير الحالة</button>
   ]))}
  </section>}
  {isLegal&&active==="الجلسات"&&<section style={box}><h3>جدول الجلسات</h3>
   {table(["القضية","الموكل","التاريخ","الحالة"],data.matters.map(m=>[m.title,contactName(m.contactId),m.hearing||"غير محددة",m.status]))}
   <button type="button" style={secondary} onClick={()=>navigation("القضايا")}>تعديل القضية أو تاريخ الجلسة</button>
  </section>}
  {(isClinic&&active==="الفواتير"||isLegal&&active==="الأتعاب")&&<section style={box}>
   <h3>{isClinic?"فواتير العيادة":"الأتعاب والفواتير"}</h3>
   {miniForm(addInvoice,"إصدار فاتورة تجريبية",<>
    <label>{isClinic?"المراجع":"الموكل"}<select style={field} value={selectedContact} onChange={e=>setSelectedContact(e.target.value)}>{contactOptions}</select></label>
    <label>القيمة بالجنيه<input type="number" min="1" max="10000000" step=".01" value={amount} onChange={e=>setAmount(e.target.value)} style={field}/></label>
   </>)}
   <p>إجمالي مدفوعات محاكاة: {egp(paidTotal)}</p>
   {table(["الاسم","القيمة","الحالة","إجراء"],data.invoices.map(v=>[
    contactName(v.contactId),egp(v.amount),v.paid?"مسددة تجريبيًا":"غير مسددة",
    <button type="button" key="pay" disabled={v.paid} style={secondary} onClick={()=>setData(d=>({...d,invoices:d.invoices.map(x=>x.id===v.id?{...x,paid:true}:x)}))}>تسجيل سداد تجريبي</button>
   ]))}
  </section>}
  {isLegal&&active==="المستندات"&&<section style={box}>
   <h3>مراجع مستندات تجريبية</h3>
   {miniForm((e)=>{e.preventDefault();if(!formName.trim()||!selectedMatter)return;
    setData(d=>({...d,documents:[{id:newId(),title:formName.trim().slice(0,100),matterId:selectedMatter},...d.documents]}));setFormName("");report("تم تسجيل اسم مرجع تجريبي فقط، دون رفع ملف.");},
    "تسجيل مرجع تجريبي",<>
    <label>اسم المستند<input required style={field} maxLength={100} value={formName} onChange={e=>setFormName(e.target.value)}/></label>
    <label>القضية<select style={field} value={selectedMatter} onChange={e=>setSelectedMatter(e.target.value)}>{data.matters.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
   </>)}
   {table(["اسم المرجع","القضية"],data.documents.map(x=>[x.title,data.matters.find(m=>m.id===x.matterId)?.title??"—"]))}
   <p style={{fontSize:12,color:"#64748b"}}>هذا لا يرفع ملفات فعلية ولا يحفظ مستندات قانونية للعميل.</p>
  </section>}
 </section>;
}
