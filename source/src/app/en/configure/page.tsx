import HomePage from "../../home-client";
import {redirect} from "next/navigation";
export default async function ConfigurePage({searchParams}:{searchParams:Promise<{package?:string}>}){const q=await searchParams;if(typeof q.package==="string"&&/^[a-zA-Z0-9-]{1,100}$/.test(q.package))redirect("/en/packages/"+encodeURIComponent(q.package)+"/pricing");return <HomePage locale="en" configuratorOnly pricingOnly/>;}
