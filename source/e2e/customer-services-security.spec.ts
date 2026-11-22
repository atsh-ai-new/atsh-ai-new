import {test,expect} from "@playwright/test";

const api=process.env.ATSH_API_BASE_URL||"http://127.0.0.1:3017";
const draftId="11111111-2222-4333-8444-555555555555";
const serviceId="22222222-3333-4444-8555-666666666666";

test("customer service administration refuses unauthenticated reads and mutations",async({request})=>{
 const operations=[
  {method:"GET",path:"/api/admin/customer-service-projects"},
  {method:"GET",path:"/api/admin/customer-services?projectDraftId="+draftId},
  {method:"POST",path:"/api/admin/customer-services",data:{projectDraftId:draftId,serviceCode:"hosting",serviceName:"Hosting",sourceType:"manual",status:"active"}},
  {method:"PATCH",path:"/api/admin/customer-services/"+serviceId,data:{status:"active"}}
 ] as const;
 for(const operation of operations){
  const response=await request.fetch(api+operation.path,{method:operation.method,...("data" in operation?{data:operation.data}:{})});
  expect([401,403],operation.method+" "+operation.path).toContain(response.status());
 }
});

test("anonymous users cannot read another customer's project services",async({request})=>{
 const response=await request.get(api+"/api/customer/auth/project-drafts/"+draftId+"/services");
 expect([401,403]).toContain(response.status());
});
