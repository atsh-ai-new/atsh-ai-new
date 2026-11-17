// Trusted server-side substitution only; customers cannot supply token values.
const placeholders=new Set(["customer_email","quote_id","quote_revision","quote_total","quote_currency","quote_items","template_revision","contract_category"]);
const text=(value)=>String(value??"").slice(0,12000);
export function renderContractTemplate(body,context){
 if(typeof body!=="string"||body.length>30000)throw Error("Invalid contract body");
 const provided=new Set([...body.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map(m=>m[1]));
 for(const token of provided)if(!placeholders.has(token))throw Error("Unsupported contract variable: "+token);
 const output=body.replace(/\{\{\s*([^{}]+?)\s*\}\}/g,(_,token)=>text(context[token]));
 if(output.length>50000)throw Error("Contract output too long");
 return output;
}
export function contractTemplateVariables(){return [...placeholders].map(x=>`{{${x}}}`);}
export function makeContractContext(quote,template){
 return {
  customer_email:quote.customer_email,
  quote_id:quote.id,
  quote_revision:quote.revision,
  quote_total:(Number(quote.total_piasters)/100).toFixed(2),
  quote_currency:quote.currency,
  quote_items:JSON.stringify(quote.items),
  template_revision:template.revision,
  contract_category:template.category
 };
}
