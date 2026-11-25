"use client";
import {useEffect,useState} from "react";
import QuoteRevisionEditor from "@/components/quote-revision-editor";
type Quote={id:number;customer_email:string;status:string;revision:number;total_piasters:number;valid_until:string|null;items:Array<{label:string;quantity:number;unitPricePiasters:number;period?:string}>};
type EligibleOrder={id:string;reference:string;total:number;currency:string;project_title:string;latest_preview_status:string|null};
type EligibleDraft={id:string;title:string;email:string;draft:{solutionType?:string;requirements?:string;businessName?:string;deliveryMethod?:string};latest_preview_status:string|null};
type ChangeRequest={id:number;quote_id:number;customer_email:string;quote_status:string;revision:number;status:string;details:string;created_at:string;resolution_note?:string};
type Template={id:number;title:string;body:string;revision:number;category:string;is_published:boolean;is_archived:boolean};
type TemplateVersion={template_id:number;title:string;body:string;revision:number;edited_by:string|null;created_at:string;is_published:boolean};
type Invoice={id:number;quote_id:number;customer_email:string;amount_piasters:number;verified_paid_piasters:number;remaining_piasters:number;due_at:string|null;due_state:string;status:string};
type FinanceSummary={totals:{invoice_count:number;invoiced_piasters:string;paid_piasters:string;outstanding_piasters:string;overdue_count:number;overdue_piasters:string};nextDue:{id:number;customer_email:string;due_at:string|null;remaining_piasters:string;currency:string}[]};
type Payment={id:number;amount_piasters:number;paid_at:string;provider:string;provider_reference:string;recorded_by:string};
type Ticket={id:number;customer_email:string;subject:string;status:string};
async function request(path:string,method="GET",payload?:unknown){const r=await fetch(`/api/admin/commercial/${path}`,{method,credentials:"include",cache:"no-store",headers:payload?{"Content-Type":"application/json"}:undefined,body:payload?JSON.stringify(payload):undefined});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"تعذر تنفيذ الطلب");return data;}
export default function CommercialManager(){
 const [pdfs,setPdfs]=useState<Record<number,File>>({});
 const [methods,setMethods]=useState<Record<number,string[]>>({});
 const [instructionMethod,setInstructionMethod]=useState("cash"),[instructionText,setInstructionText]=useState(""),[instructionEnabled,setInstructionEnabled]=useState(false);
 const paymentLabels:Record<string,string>={cash:"نقدي",bank_transfer:"تحويل بنكي",instapay:"InstaPay",wallet_direct:"محفظة مباشرة",xpay:"XPay"};
 async function uploadPdf(quoteId:number){const file=pdfs[quoteId];if(!file||file.size>5*1024*1024)throw Error("اختر PDF لا يتجاوز 5 ميجابايت");const response=await fetch(`/api/admin/commercial/contracts/pdf?quoteId=${quoteId}`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/pdf"},body:file});const data=await response.json();if(!response.ok)throw Error(data.error||"فشل رفع العقد");}
 const [invoices,setInvoices]=useState<Invoice[]>([]);
 const [finance,setFinance]=useState<FinanceSummary|null>(null),[selectedInvoice,setSelectedInvoice]=useState<number|null>(null),[payments,setPayments]=useState<Payment[]>([]),[paymentsBusy,setPaymentsBusy]=useState(false);
 const [quotes,setQuotes]=useState<Quote[]>([]),[templates,setTemplates]=useState<Template[]>([]),[tickets,setTickets]=useState<Ticket[]>([]);
 const [eligibleOrders,setEligibleOrders]=useState<EligibleOrder[]>([]),[eligibleDrafts,setEligibleDrafts]=useState<EligibleDraft[]>([]),[changeRequests,setChangeRequests]=useState<ChangeRequest[]>([]),[contractChoices,setContractChoices]=useState<Record<number,string>>({});
 const [customPrices,setCustomPrices]=useState<Record<string,string>>({}),[customDescriptions,setCustomDescriptions]=useState<Record<string,string>>({});
 const [reviewLink,setReviewLink]=useState("");
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
 async function refresh(){try{const [q,t,s,i,o,f,d]=await Promise.all([request("quotes"),request("contracts/templates"),request("tickets"),request("invoices"),request("orders/eligible"),request("change-requests"),request("project-drafts/eligible")]);setInvoices(i.invoices||[]);setQuotes(q.quotes||[]);setTemplates(t.templates||[]);setTickets(s.tickets||[]);setEligibleOrders(o.orders||[]);setEligibleDrafts(d.drafts||[]);setChangeRequests(f.changeRequests||[]);try{setFinance(await request("finance/summary"))}catch{setFinance(null)}}catch(e){setMessage("تعذر تحديث بيانات المبيعات: "+String(e));throw e;}}
 useEffect(()=>{void refresh().catch(()=>undefined)},[]);
 async function showPayments(id:number){setSelectedInvoice(id);setPaymentsBusy(true);try{const result=await request(`invoices/${id}/payments`);setPayments(result.payments||[])}catch(e){setMessage(String(e));setPayments([])}finally{setPaymentsBusy(false)}}
 async function run(action:()=>Promise<unknown>){try{setMessage("");await action();try{await refresh();setMessage("تم تنفيذ العملية وتحديث بيانات المبيعات بنجاح");}catch{setMessage("تم إرسال العملية، لكن تعذر تحديث بيانات المبيعات. تحقق من السجل قبل إعادة الإرسال.");}}catch(e){setMessage(e instanceof Error?e.message:"حدث خطأ")}}
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
 <section aria-label="مشروعات مخصصة تنتظر تسعير الشركة" style={{padding:15,border:"1px solid #cbdcec",borderRadius:13,background:"#f5f7fc"}}>
  <h3>المشروعات المخصصة التي تحتاج عرض سعر من ATSH AI</h3>
  <p>تراجع الشركة وصف المشروع ومعاينته أولًا، ثم تدخل السعر الأساسي قبل الضريبة. يضيف الخادم الضريبة المضبوطة في لوحة الشركة، دون قبول إجمالي من المتصفح.</p>
  {!eligibleDrafts.length&&<p>لا توجد مسودات مخصصة جاهزة لإعداد العرض.</p>}
  {eligibleDrafts.filter(d=>d.draft?.solutionType||d.latest_preview_status==="approved").map(d=><div key={d.id} style={{border:"1px solid #d6e2ec",borderRadius:11,padding:13,margin:"10px 0",background:"white"}}>
    <strong>{d.title} — {d.email}</strong><p style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>نوع الحل: {d.draft.solutionType||"لم يُحدد"} · طريقة التسليم: {d.draft.deliveryMethod||"تحتاج تحديدًا"} · أحدث معاينة: {d.latest_preview_status==="approved"?"معتمدة":d.latest_preview_status||"لم تُنشأ"}</p>
    {d.draft.requirements&&<details><summary>متطلبات العميل</summary><p style={{whiteSpace:"pre-wrap"}}>{d.draft.requirements}</p></details>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,210px),1fr))",gap:9,marginTop:10}}>
      <label>اسم بند التنفيذ<input value={customDescriptions[d.id]??`تنفيذ مشروع: ${d.title}`} onChange={e=>setCustomDescriptions(old=>({...old,[d.id]:e.target.value}))} maxLength={250}/></label>
      <label>السعر قبل الضريبة بالجنيه<input type="number" min={0.01} step={0.01} value={customPrices[d.id]||""} onChange={e=>setCustomPrices(old=>({...old,[d.id]:e.target.value}))} placeholder="أدخل سعرًا مراجَعًا"/></label>
    </div>
    <button type="button" disabled={d.latest_preview_status!=="approved"||!customPrices[d.id]||Number(customPrices[d.id])<=0} onClick={()=>{const value=Math.round(Number(customPrices[d.id])*100);if(!Number.isSafeInteger(value)||value<1){setMessage("السعر غير صالح");return;}void run(()=>request(`project-drafts/${encodeURIComponent(d.id)}/quote`,"POST",{items:[{label:customDescriptions[d.id]??`تنفيذ مشروع: ${d.title}`,quantity:1,unitPricePiasters:value,period:"fixed"}]}));}}>إعداد عرض رسمي للمشروع المخصص</button>
    {d.latest_preview_status!=="approved"&&<small style={{display:"block",color:"#a45e24"}}>لا يمكن إصدار العرض قبل اعتماد أحدث نسخة معاينة من العميل.</small>}
   </div>)}
 </section>
 <section aria-label="الطلبات المؤهلة لإعداد عرض سعر" style={{padding:15,border:"1px solid #cfddea",borderRadius:13,background:"#f4f8fc"}}>
  <h3>طلبات العملاء الجاهزة للتسعير</h3>
  <p>يُنشأ العرض من بيانات الطلب المحفوظة على الخادم، ولا يمكن إصداره إلا بعد اعتماد العميل أحدث معاينة.</p>
  {!eligibleOrders.length&&<p>لا توجد طلبات جديدة مؤهلة حاليًا.</p>}
  {eligibleOrders.map(order=><div key={order.id} style={{padding:12,borderBottom:"1px solid #d7e1eb",display:"flex",flexWrap:"wrap",gap:12,justifyContent:"space-between",alignItems:"center"}}>
   <span><b>{order.reference}</b> — {order.project_title||"مشروع عميل"} — {Number(order.total).toLocaleString("ar-EG")} {order.currency}<br/><small>حالة أحدث معاينة: {order.latest_preview_status==="approved"?"معتمدة":order.latest_preview_status||"غير مُنشأة"}</small></span>
   <button type="button" disabled={order.latest_preview_status!=="approved"} onClick={()=>void run(()=>request(`orders/${encodeURIComponent(order.id)}/quote`,"POST",{}))}>توليد عرض السعر الرسمي</button>
  </div>)}
 </section>
 <section aria-label="طلبات تعديل العروض" style={{padding:15,border:"1px solid #d9e2ec",borderRadius:13}}>
  <h3>ملاحظات العملاء على عروض الأسعار</h3>
  {!changeRequests.some(row=>row.status==="pending")&&<p>لا توجد طلبات تعديل تنتظر المراجعة.</p>}
  {changeRequests.filter(row=>row.status==="pending").map(row=><article key={row.id} style={{background:"#fff6e8",padding:13,borderRadius:10,marginBottom:8}}>
    <strong>عرض #{row.quote_id} — {row.customer_email}</strong><p style={{whiteSpace:"pre-wrap"}}>{row.details}</p>
    <small>حالة العرض: {row.quote_status} · إصدار {row.revision}</small>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
     <button type="button" onClick={()=>document.getElementById(`quote-${row.quote_id}`)?.scrollIntoView({behavior:"smooth",block:"start"})}>فتح بنود العرض لتعديلها ↓</button>
     <button type="button" onClick={()=>{const note=prompt("سبب معالجة الملاحظة دون تغيير سعر أو شروط العرض");if(note?.trim()&&note.trim().length>=10)void run(()=>request(`change-requests/${row.id}/resolve`,"POST",{resolutionNote:note.trim()}))}}>توضيح للعميل وإغلاق الملاحظة</button>
    </div>
   </article>)}
 </section>
 <div><h3>عروض الأسعار وإصدار العقود</h3>{quotes.map(q=><article id={`quote-${q.id}`} key={q.id} style={{border:"1px solid #d4e1ec",borderRadius:12,padding:14,marginBottom:12,background:"#fff"}}>
  <strong>عرض #{q.id}</strong> — {q.customer_email} — {(Number(q.total_piasters)/100).toLocaleString("ar-EG")} ج.م — {q.status} — إصدار {q.revision}
  <div style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"center",marginTop:10}}>
   {q.status==="draft"&&<button type="button" onClick={()=>void run(()=>request(`quotes/${q.id}/issue`,"POST",{}))}>إصدار العرض للمراجعة</button>}
   {q.status==="issued"&&<>
    <select aria-label={`اختر قالب العقد للعرض ${q.id}`} value={contractChoices[q.id]||""} onChange={e=>setContractChoices(old=>({...old,[q.id]:e.target.value}))}>
     <option value="">اختر قالب عقد منشورًا</option>{templates.filter(t=>t.is_published&&!t.is_archived).map(t=><option key={t.id} value={t.id}>{t.title} — إصدار {t.revision}</option>)}
    </select>
    <button type="button" disabled={!contractChoices[q.id]} onClick={()=>void run(()=>request("contracts/issue","POST",{quoteId:q.id,templateId:Number(contractChoices[q.id])}))}>إصدار العقد</button>
    <button type="button" onClick={async()=>{try{const result=await request(`quotes/${q.id}/review-link`,"POST",{});setReviewLink(`${location.origin}/commercial/review?token=${encodeURIComponent(result.reviewToken)}`);setMessage("نسخة الرابط الخاص أُنشئت، شاركها مع العميل بأمان.")}catch(e){setMessage(e instanceof Error?e.message:"تعذر إنشاء الرابط؛ تأكد من إصدار العقد أولًا.")}}}>إنشاء رابط مراجعة مستقل</button>
   </>}
  </div>
  {q.status==="issued"&&<div style={{padding:10}}><label>العقد PDF <input type="file" accept="application/pdf,.pdf" onChange={e=>{const f=e.target.files?.[0];if(f)setPdfs(old=>({...old,[q.id]:f}));}}/></label><button disabled={!pdfs[q.id]} onClick={()=>void run(()=>uploadPdf(q.id))}>رفع وإرسال العقد للعميل</button></div>}
  {["draft","issued","accepted"].includes(q.status)&&<details><summary>طرق السداد المسموحة</summary>{Object.entries(paymentLabels).map(([key,label])=><label key={key} style={{display:"block"}}><input type="checkbox" checked={(methods[q.id]||[]).includes(key)} onChange={e=>setMethods(old=>({...old,[q.id]:e.target.checked?[...(old[q.id]||[]),key]:(old[q.id]||[]).filter(x=>x!==key)}))}/>{label}</label>)}<button disabled={!methods[q.id]?.length} onClick={()=>void run(()=>request(`quotes/${q.id}/payment-methods`,"PUT",{methods:methods[q.id]}))}>حفظ طرق الدفع</button></details>}
  {(q.status==="draft"||q.status==="issued")&&<QuoteRevisionEditor quote={q} onSave={async(items,validUntil)=>{await request(`quotes/${q.id}/revise`,"POST",{items,validUntil});await refresh();setMessage("أُصدر عرض معدل جديد. اعتمده ثم أنشئ عقدًا جديدًا من أحدث قالب.")}}/>}
 </article>)}</div>
 {reviewLink&&<section role="status" style={{border:"1px solid #b7d8ca",background:"#ebf8f1",borderRadius:12,padding:13,overflowWrap:"anywhere"}}><b>رابط خاص للعرض والعقد (يظهر هنا فقط):</b><p>{reviewLink}</p><button type="button" onClick={()=>void navigator.clipboard.writeText(reviewLink)}>نسخ الرابط</button><button type="button" onClick={()=>setReviewLink("")}>إخفاؤه</button><p><small>يمكن للعميل المسجّل مراجعة عرضه أيضًا من داخل حسابه، دون تداول رمز خاص.</small></p></section>}
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
 <section style={{padding:14,border:"1px solid #d4e1ec",borderRadius:12}}><h3>إعدادات طرق الدفع اليدوي</h3><select value={instructionMethod} onChange={e=>{setInstructionMethod(e.target.value);setInstructionText("");setInstructionEnabled(false);}}>{Object.entries(paymentLabels).filter(([k])=>k!=="xpay").map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><textarea value={instructionText} onChange={e=>setInstructionText(e.target.value)} placeholder="بيانات الحساب أو المحفظة وتعليمات السداد"/><label><input type="checkbox" checked={instructionEnabled} onChange={e=>setInstructionEnabled(e.target.checked)}/>مفعلة</label><button disabled={!instructionText.trim()} onClick={()=>void run(()=>request(`payment-instructions/${instructionMethod}`,"PUT",{instructions:instructionText,enabled:instructionEnabled}))}>حفظ الإعدادات</button><button onClick={()=>void run(async()=>{const result=await request("payment-instructions");const row=result.instructions?.find((x:{method:string})=>x.method===instructionMethod);setInstructionText(row?.instructions||"");setInstructionEnabled(!!row?.enabled);})}>تحميل الإعدادات الحالية</button></section>
 <div><h3>الملخص المالي المركزي</h3>{finance?<><div style={{display:"flex",gap:18,flexWrap:"wrap"}}>{([['إجمالي الفواتير',finance.totals.invoiced_piasters],['المحصل والمؤكد',finance.totals.paid_piasters],['المتبقي',finance.totals.outstanding_piasters],['المتأخر',finance.totals.overdue_piasters]] as const).map(([label,value])=><div key={label} style={{padding:12,border:'1px solid #aaa'}}><strong>{label}</strong><p>{(Number(value)/100).toLocaleString('ar-EG',{minimumFractionDigits:2})} جنيه</p></div>)}</div><p>عدد الفواتير: {finance.totals.invoice_count} | الفواتير المتأخرة: {finance.totals.overdue_count}</p><h4>الدفعات القادمة والمتأخرة</h4><div style={{overflowX:'auto'}}><table><thead><tr><th>الفاتورة</th><th>العميل</th><th>الاستحقاق</th><th>المتبقي</th></tr></thead><tbody>{finance.nextDue.map(d=><tr key={d.id}><td>#{d.id}</td><td>{d.customer_email}</td><td>{d.due_at?new Date(d.due_at).toLocaleDateString('ar-EG'):'غير محدد'}</td><td>{(Number(d.remaining_piasters)/100).toFixed(2)} {d.currency}</td></tr>)}</tbody></table></div></>:<p>تعذر تحميل الملخص المالي أو لا تملك صلاحية الاطلاع عليه.</p>}</div>
 <div><h3>متابعة الفواتير والدفعات</h3><p>المبالغ بالجنيه المصري. السداد اليدوي لا يُسجل إلا بواسطة مدير مخول وبعد مراجعة الإثبات.</p>
 <div style={{overflowX:"auto"}}><table><thead><tr><th>الفاتورة</th><th>العميل</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الاستحقاق</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{invoices.map(i=><tr key={i.id}><td>#{i.id}</td><td>{i.customer_email}</td><td>{(i.amount_piasters/100).toFixed(2)}</td><td>{(i.verified_paid_piasters/100).toFixed(2)}</td><td>{(i.remaining_piasters/100).toFixed(2)}</td><td>{i.due_at?new Date(i.due_at).toLocaleDateString("ar-EG"):"غير محدد"}</td><td>{i.due_state}</td><td>{i.status!=="void"&&i.remaining_piasters>0&&<button onClick={()=>{const amount=prompt("المبلغ المحقق بالجنيه");const ref=prompt("مرجع إثبات التحويل أو الإيصال");const paymentMethod=prompt("طريقة الدفع: cash / bank_transfer / instapay / wallet_direct","cash");if(!amount||!ref||!paymentMethod||!["cash","bank_transfer","instapay","wallet_direct"].includes(paymentMethod))return;const value=Math.round(Number(amount)*100);if(!Number.isSafeInteger(value)||value<=0){setMessage("المبلغ غير صحيح");return;}void run(()=>request(`invoices/${i.id}/payments`,"POST",{amountPiasters:value,paidAt:new Date().toISOString(),provider:"manual_verified",providerReference:ref,paymentMethod}))}}>تسجيل دفعة مُراجَعة</button>} {i.status!=="void"&&i.remaining_piasters>0&&<button type="button" onClick={()=>{const milestone=prompt("مرحلة الاستحقاق");if(milestone)void run(()=>request(`invoices/${i.id}/release`,"PATCH",{released:true,milestone}));}}>إتاحة الدفعة</button>} <button type="button" onClick={()=>void showPayments(i.id)}>سجل الدفعات</button></td></tr>)}</tbody></table></div>
 {selectedInvoice!==null&&<div role="region" aria-label="سجل الدفعات"><h4>سجل دفعات الفاتورة #{selectedInvoice}</h4><button onClick={()=>setSelectedInvoice(null)}>إغلاق</button>{paymentsBusy?<p>جار التحميل...</p>:payments.length?<table><thead><tr><th>المبلغ</th><th>تاريخ الدفع</th><th>الطريقة</th><th>مرجع السداد</th><th>سجله</th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td>{(Number(p.amount_piasters)/100).toFixed(2)}</td><td>{new Date(p.paid_at).toLocaleString('ar-EG')}</td><td>{p.provider}</td><td>{p.provider_reference}</td><td>{p.recorded_by}</td></tr>)}</tbody></table>:<p>لا توجد دفعات مسجلة.</p>}</div>}
 <button onClick={()=>{const quoteId=Number(prompt("رقم عرض السعر الصادر"));const amounts=prompt("مبالغ الدفعات بالجنيه، مفصولة بفاصلة (مثال: 1200,800)");const dates=prompt("تواريخ الاستحقاق بنفس الترتيب YYYY-MM-DD مفصولة بفاصلة");if(!quoteId||!amounts||!dates)return;const a=amounts.split(",").map(x=>Math.round(Number(x.trim())*100));const d=dates.split(",").map(x=>x.trim());if(a.length!==d.length||a.some(x=>!Number.isSafeInteger(x)||x<1)){setMessage("بيانات الأقساط غير صحيحة");return;}void run(()=>request("invoices/schedule","POST",{quoteId,parts:a.map((amountPiasters,j)=>({amountPiasters,dueAt:d[j]}))}))}}>إنشاء جدول دفعات لعرض سعر</button></div>
 <div><h3>تذاكر الدعم</h3>{tickets.map(t=><p key={t.id}>#{t.id} — {t.customer_email} — {t.subject} — {t.status}</p>)}</div>
 </section>
}
