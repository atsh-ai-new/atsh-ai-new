"use client";
import {useEffect,useState} from "react";
type Quote={id:number;customer_email:string;status:string;revision:number;total_piasters:number;valid_until:string|null};
type Template={id:number;title:string;body:string;revision:number;category:string;is_published:boolean;is_archived:boolean};
type TemplateVersion={template_id:number;title:string;body:string;revision:number;edited_by:string|null;created_at:string;is_published:boolean};
type Invoice={id:number;quote_id:number;customer_email:string;amount_piasters:number;verified_paid_piasters:number;remaining_piasters:number;due_at:string|null;due_state:string;status:string};
type FinanceSummary={totals:{invoice_count:number;invoiced_piasters:string;paid_piasters:string;outstanding_piasters:string;overdue_count:number;overdue_piasters:string};nextDue:{id:number;customer_email:string;due_at:string|null;remaining_piasters:string;currency:string}[]};
type Payment={id:number;amount_piasters:number;paid_at:string;provider:string;provider_reference:string;recorded_by:string};
type Ticket={id:number;customer_email:string;subject:string;status:string};
async function request(path:string,method="GET",payload?:unknown){const r=await fetch(`/api/admin/commercial/${path}`,{method,credentials:"include",cache:"no-store",headers:payload?{"Content-Type":"application/json"}:undefined,body:payload?JSON.stringify(payload):undefined});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"تعذر تنفيذ الطلب");return data;}
export default function CommercialManager(){
 const [invoices,setInvoices]=useState<Invoice[]>([]);
 const [finance,setFinance]=useState<FinanceSummary|null>(null),[selectedInvoice,setSelectedInvoice]=useState<number|null>(null),[payments,setPayments]=useState<Payment[]>([]),[paymentsBusy,setPaymentsBusy]=useState(false);
 const [quotes,setQuotes]=useState<Quote[]>([]),[templates,setTemplates]=useState<Template[]>([]),[tickets,setTickets]=useState<Ticket[]>([]);
 const [email,setEmail]=useState(""),[description,setDescription]=useState(""),[amount,setAmount]=useState(""),[title,setTitle]=useState(""),[body,setBody]=useState(""),[message,setMessage]=useState("");
 const [selectedTemplate,setSelectedTemplate]=useState<number|null>(null);
 const [orderIdToQuote,setOrderIdToQuote]=useState("");
 const [contractCategory,setContractCategory]=useState("general");
 const [contractPublished,setContractPublished]=useState(false);
 const [contractArchived,setContractArchived]=useState(false);
 const [contractRevision,setContractRevision]=useState<number|null>(null);
 const [contractFilter,setContractFilter]=useState("");
 const [contractVersions,setContractVersions]=useState<TemplateVersion[]>([]);
 const [previewContract,setPreviewContract]=useState(false);
 function editContract(template:Template){
  setSelectedTemplate(template.id);setTitle(template.title);setBody(template.body);
  setContractCategory(template.category||"general");
  setContractPublished(Boolean(template.is_published));setContractArchived(Boolean(template.is_archived));
  setContractRevision(template.revision);setContractVersions([]);setPreviewContract(false);
 }
 function newContract(){setSelectedTemplate(null);setTitle("");setBody("");setContractCategory("general");setContractPublished(false);setContractArchived(false);setContractRevision(null);setContractVersions([]);setPreviewContract(false);}
 async function saveContract(){
  if(contractArchived&&contractPublished)throw Error("لا يمكن نشر قالب مؤرشف");
  const payload={title,body,category:contractCategory,isPublished:contractPublished};
  if(selectedTemplate===null){await request("contracts/templates","POST",payload);}
  else{
    if(contractRevision===null)throw Error("Version unavailable");
    await request(`contracts/templates/${selectedTemplate}`,"PATCH",{...payload,isArchived:contractArchived,expectedRevision:contractRevision});
  }
  newContract();
 }
 async function showContractVersions(id:number){try{const response=await request(`contracts/templates/${id}/versions`);setContractVersions(response.versions||[]);}catch(e){setMessage(e instanceof Error?e.message:"فشل تحميل الإصدارات");}}
 async function refresh(){try{const [q,t,s,i]=await Promise.all([request("quotes"),request("contracts/templates"),request("tickets"),request("invoices")]);setInvoices(i.invoices||[]);setQuotes(q.quotes||[]);setTemplates(t.templates||[]);setTickets(s.tickets||[]);try{setFinance(await request("finance/summary"))}catch{setFinance(null)}}catch(e){setMessage(String(e));}}
 useEffect(()=>{void refresh()},[]);
 async function showPayments(id:number){setSelectedInvoice(id);setPaymentsBusy(true);try{const result=await request(`invoices/${id}/payments`);setPayments(result.payments||[])}catch(e){setMessage(String(e));setPayments([])}finally{setPaymentsBusy(false)}}
 async function run(action:()=>Promise<unknown>){try{setMessage("");await action();setMessage("تم تنفيذ العملية بنجاح");await refresh()}catch(e){setMessage(e instanceof Error?e.message:"حدث خطأ")}}
 return <section dir="rtl" style={{padding:20,display:"grid",gap:22}}>
 <h2>إدارة المبيعات والعقود</h2><p>العروض الصادرة والعقود الموقعة تُحفظ بإصدارات ثابتة. الدفع والتسليم لا يتمان تلقائيًا من هذه الشاشة.</p>
 {message&&<p role="status">{message}</p>}
 <form onSubmit={e=>{e.preventDefault();void run(()=>request("quotes","POST",{customerEmail:email,items:[{label:description,quantity:1,unitPricePiasters:Math.round(Number(amount)*100)}]}))}} style={{display:"grid",gap:8,maxWidth:540}}>
 <h3>عرض سعر جديد</h3><input aria-label="بريد العميل" type="email" required placeholder="بريد العميل" value={email} onChange={e=>setEmail(e.target.value)}/><input aria-label="وصف الخدمة" required placeholder="وصف الخدمة" value={description} onChange={e=>setDescription(e.target.value)}/><input aria-label="السعر بالجنيه" required type="number" min="0" step="0.01" placeholder="السعر بالجنيه المصري" value={amount} onChange={e=>setAmount(e.target.value)}/><button type="submit">إنشاء عرض مسودة</button>
 </form>
 <form onSubmit={event=>{event.preventDefault();void run(async()=>{await request(`orders/${encodeURIComponent(orderIdToQuote.trim())}/quote`,"POST",{});setOrderIdToQuote("");});}} style={{display:"grid",gap:8,maxWidth:560,padding:14,border:"1px solid #d3dfec",borderRadius:12}}>
   <h3>إنشاء عرض سعر من طلب عميل ومعاينة معتمدة</h3>
   <p>يستخرج المحرك البنود والأسعار من الطلب الأصلي على الخادم، ويشترط حسابًا موثقًا واعتماد أحدث معاينة للمشروع. لا يُقبل إدخال مبلغ يدوي في هذا المسار.</p>
   <label>رقم الطلب UUID<input aria-label="رقم الطلب لإنشاء عرض السعر" required pattern="[a-fA-F0-9-]{36}" value={orderIdToQuote} onChange={e=>setOrderIdToQuote(e.target.value)} placeholder="رقم الطلب من لوحة الطلبات"/></label>
   <button type="submit">توليد عرض سعر مرتبط بالطلب</button>
  </form>
 <div><h3>عروض الأسعار</h3>{quotes.map(q=><div key={q.id} style={{border:"1px solid #bbb",padding:12,marginBottom:8}}><b>#{q.id}</b> — {q.customer_email} — {(Number(q.total_piasters)/100).toLocaleString("ar-EG")} ج.م — {q.status} — إصدار {q.revision}<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{q.status==="draft"&&<button onClick={()=>void run(()=>request(`quotes/${q.id}/issue`,"POST",{}))}>إصدار العرض</button>}{q.status==="issued"&&<><button onClick={()=>{const id=prompt("رقم قالب العقد");if(id)void run(()=>request("contracts/issue","POST",{quoteId:q.id,templateId:Number(id)}))}}>إصدار عقد من قالب</button><button onClick={()=>void run(async()=>{const result=await request(`quotes/${q.id}/review-link`,"POST",{});const url=`${location.origin}/commercial/review?token=${encodeURIComponent(result.reviewToken)}`;setMessage(`رابط مراجعة خاص — أرسله للعميل بشكل آمن: ${url}`)})}>رابط مراجعة العقد</button></>}</div></div>)}</div>
 <section style={{display:"grid",gap:14,border:"1px solid #d7e1ec",borderRadius:14,padding:18}}>
 <h3>العقود — إدارة الصياغة والإصدارات</h3>
 <p>يمكن للمالك أو المدير المخوّل تعديل القوالب ونسخها ونشرها. أي تعديل ينشئ إصدارًا جديدًا؛ العقود المُصدرة والموقعة تظل بنصوصها السابقة.</p>
 <label>ابحث عن قالب<input aria-label="البحث عن قالب عقد" value={contractFilter} onChange={e=>setContractFilter(e.target.value)} placeholder="عنوان أو نوع القالب" /></label>
 <div style={{display:"grid",gap:8}}>
 {templates.filter(t=>(t.title+" "+t.category).toLocaleLowerCase("ar").includes(contractFilter.toLocaleLowerCase("ar"))).map(t=><div key={t.id} style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",border:"1px solid #e2e8f0",padding:12,borderRadius:10}}>
 <strong>{t.title}</strong><small>#{t.id} · إصدار {t.revision} · {t.category} · {t.is_archived?"مؤرشف":t.is_published?"منشور":"مسودة"}</small>
 <button type="button" onClick={()=>editContract(t)}>فتح وتعديل</button>
 <button type="button" onClick={()=>void showContractVersions(t.id)}>سجل الإصدارات</button>
 <button type="button" onClick={()=>{newContract();setTitle(t.title+" — نسخة");setBody(t.body);setContractCategory(t.category);}}>استنساخ</button>
 </div>)}
 </div>
 {contractVersions.length>0&&<div role="region" aria-label="إصدارات القالب" style={{padding:12,background:"#f2f6fb"}}>
 <h4>الإصدارات السابقة (للقراءة فقط)</h4>
 {contractVersions.map(v=><details key={v.revision}><summary>الإصدار {v.revision} — {new Date(v.created_at).toLocaleString("ar-EG")} — {v.edited_by||"غير محدد"}</summary><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit"}}>{v.body}</pre></details>)}
 </div>}
 <form onSubmit={e=>{e.preventDefault();void run(saveContract);}} style={{display:"grid",gap:10,maxWidth:760}}>
 <h4>{selectedTemplate===null?"إنشاء قالب عقد جديد":`تعديل قالب #${selectedTemplate} — إصدار ${contractRevision}`}</h4>
 <label>عنوان العقد<input required minLength={2} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label>نوع العقد<select value={contractCategory} onChange={e=>setContractCategory(e.target.value)}>
 <option value="general">عام</option><option value="managed_monthly">اشتراك شهري مُدار</option><option value="managed_yearly">اشتراك سنوي مُدار</option><option value="source_code">شراء كود/ترخيص</option><option value="independent_hosting">استضافة مستقلة</option>
 </select></label>
 <p style={{fontSize:12,lineHeight:1.8}}>الحقول المدعومة عند إصدار العقد: <code>{"{{customer_email}}"}</code>، <code>{"{{quote_id}}"}</code>، <code>{"{{quote_revision}}"}</code>، <code>{"{{quote_total}}"}</code>، <code>{"{{quote_currency}}"}</code>، <code>{"{{quote_items}}"}</code>، <code>{"{{template_revision}}"}</code>، <code>{"{{contract_category}}"}</code>. تتم تعبئتها من البيانات الرسمية لحظة إصدار العقد وليس من المتصفح.</p>
 <label>صيغة العقد وبنوده<textarea required minLength={20} maxLength={30000} rows={14} value={body} onChange={e=>setBody(e.target.value)} placeholder="اكتب نص العقد الكامل وسياسات الملكية والدعم والتجديد والتسليم."/></label>
 <label><input type="checkbox" checked={contractPublished} disabled={contractArchived} onChange={e=>setContractPublished(e.target.checked)}/> منشور ويصلح لإصدار عقود جديدة</label>
 {selectedTemplate!==null&&<label><input type="checkbox" checked={contractArchived} onChange={e=>{setContractArchived(e.target.checked);if(e.target.checked)setContractPublished(false);}}/> أرشفة القالب ومنع استخدامه مستقبلًا</label>}
 <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
 <button type="button" onClick={()=>setPreviewContract(v=>!v)}>{previewContract?"إغلاق المعاينة":"معاينة النص"}</button>
 <button type="submit">{selectedTemplate===null?"إنشاء قالب":"حفظ كإصدار جديد"}</button>
 <button type="button" onClick={newContract}>قالب جديد / إلغاء التحرير</button>
 </div>
 {previewContract&&<article style={{padding:18,background:"white",border:"1px solid #cbd5e1",whiteSpace:"pre-wrap",lineHeight:1.9}}><h4>{title}</h4>{body}</article>}
 </form>
 <small>هذه إدارة صيغ العقود فقط؛ يلزم اعتماد الصياغات القانونية والتوقيع الإلكتروني قبل الاستخدام الإنتاجي.</small>
 </section>
 <div><h3>الملخص المالي المركزي</h3>{finance?<><div style={{display:"flex",gap:18,flexWrap:"wrap"}}>{([['إجمالي الفواتير',finance.totals.invoiced_piasters],['المحصل والمؤكد',finance.totals.paid_piasters],['المتبقي',finance.totals.outstanding_piasters],['المتأخر',finance.totals.overdue_piasters]] as const).map(([label,value])=><div key={label} style={{padding:12,border:'1px solid #aaa'}}><strong>{label}</strong><p>{(Number(value)/100).toLocaleString('ar-EG',{minimumFractionDigits:2})} جنيه</p></div>)}</div><p>عدد الفواتير: {finance.totals.invoice_count} | الفواتير المتأخرة: {finance.totals.overdue_count}</p><h4>الدفعات القادمة والمتأخرة</h4><div style={{overflowX:'auto'}}><table><thead><tr><th>الفاتورة</th><th>العميل</th><th>الاستحقاق</th><th>المتبقي</th></tr></thead><tbody>{finance.nextDue.map(d=><tr key={d.id}><td>#{d.id}</td><td>{d.customer_email}</td><td>{d.due_at?new Date(d.due_at).toLocaleDateString('ar-EG'):'غير محدد'}</td><td>{(Number(d.remaining_piasters)/100).toFixed(2)} {d.currency}</td></tr>)}</tbody></table></div></>:<p>تعذر تحميل الملخص المالي أو لا تملك صلاحية الاطلاع عليه.</p>}</div>
 <div><h3>متابعة الفواتير والدفعات</h3><p>المبالغ بالجنيه المصري. السداد اليدوي لا يُسجل إلا بواسطة مدير مخول وبعد مراجعة الإثبات.</p>
 <div style={{overflowX:"auto"}}><table><thead><tr><th>الفاتورة</th><th>العميل</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الاستحقاق</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{invoices.map(i=><tr key={i.id}><td>#{i.id}</td><td>{i.customer_email}</td><td>{(i.amount_piasters/100).toFixed(2)}</td><td>{(i.verified_paid_piasters/100).toFixed(2)}</td><td>{(i.remaining_piasters/100).toFixed(2)}</td><td>{i.due_at?new Date(i.due_at).toLocaleDateString("ar-EG"):"غير محدد"}</td><td>{i.due_state}</td><td>{i.status!=="void"&&i.remaining_piasters>0&&<button onClick={()=>{const amount=prompt("المبلغ المحقق بالجنيه");const ref=prompt("مرجع إثبات التحويل أو الإيصال");if(!amount||!ref)return;const value=Math.round(Number(amount)*100);if(!Number.isSafeInteger(value)||value<=0){setMessage("المبلغ غير صحيح");return;}void run(()=>request(`invoices/${i.id}/payments`,"POST",{amountPiasters:value,paidAt:new Date().toISOString(),provider:"manual_verified",providerReference:ref}))}}>تسجيل دفعة مُراجَعة</button>} <button type="button" onClick={()=>void showPayments(i.id)}>سجل الدفعات</button></td></tr>)}</tbody></table></div>
 {selectedInvoice!==null&&<div role="region" aria-label="سجل الدفعات"><h4>سجل دفعات الفاتورة #{selectedInvoice}</h4><button onClick={()=>setSelectedInvoice(null)}>إغلاق</button>{paymentsBusy?<p>جار التحميل...</p>:payments.length?<table><thead><tr><th>المبلغ</th><th>تاريخ الدفع</th><th>الطريقة</th><th>مرجع السداد</th><th>سجله</th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td>{(Number(p.amount_piasters)/100).toFixed(2)}</td><td>{new Date(p.paid_at).toLocaleString('ar-EG')}</td><td>{p.provider}</td><td>{p.provider_reference}</td><td>{p.recorded_by}</td></tr>)}</tbody></table>:<p>لا توجد دفعات مسجلة.</p>}</div>}
 <button onClick={()=>{const quoteId=Number(prompt("رقم عرض السعر الصادر"));const amounts=prompt("مبالغ الدفعات بالجنيه، مفصولة بفاصلة (مثال: 1200,800)");const dates=prompt("تواريخ الاستحقاق بنفس الترتيب YYYY-MM-DD مفصولة بفاصلة");if(!quoteId||!amounts||!dates)return;const a=amounts.split(",").map(x=>Math.round(Number(x.trim())*100));const d=dates.split(",").map(x=>x.trim());if(a.length!==d.length||a.some(x=>!Number.isSafeInteger(x)||x<1)){setMessage("بيانات الأقساط غير صحيحة");return;}void run(()=>request("invoices/schedule","POST",{quoteId,parts:a.map((amountPiasters,j)=>({amountPiasters,dueAt:d[j]}))}))}}>إنشاء جدول دفعات لعرض سعر</button></div>
 <div><h3>تذاكر الدعم</h3>{tickets.map(t=><p key={t.id}>#{t.id} — {t.customer_email} — {t.subject} — {t.status}</p>)}</div>
 </section>
}
