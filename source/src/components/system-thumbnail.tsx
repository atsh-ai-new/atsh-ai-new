"use client";
import {useEffect,useState} from "react";
import CatalogCardPreview from "@/components/catalog-card-preview";
export default function SystemThumbnail({slug,name,assetId,imageUrl,height=156}:{slug:string;name:string;assetId?:string;imageUrl?:string;height?:number}){
 const valid=typeof assetId==="string"&&/^[a-f0-9]{64}$/.test(assetId);
 const [retry,setRetry]=useState(0),[failed,setFailed]=useState(false);
 useEffect(()=>{setFailed(false);setRetry(0)},[assetId]);
 useEffect(()=>{if(!valid||!failed||retry>=2)return;const timer=setTimeout(()=>{setFailed(false);setRetry(n=>n+1)},10000);return()=>clearTimeout(timer)},[valid,failed,retry]);
 if(imageUrl&&(/^(\/api\/site-media\/[0-9a-f-]{36}$)/i.test(imageUrl)||imageUrl.startsWith("https://")))return <img src={imageUrl} alt={name} loading="lazy" decoding="async" style={{width:"100%",height,objectFit:"cover",borderRadius:11}}/>;
 if(valid&&!failed)return <img key={assetId+":"+retry} src={"/api/site-content/catalog?thumbnail="+assetId+"&version=2&attempt="+retry} alt={name} loading="lazy" decoding="async" onError={()=>setFailed(true)} style={{width:"100%",height,objectFit:"cover",objectPosition:"center",display:"block",background:"#f4f7fa",borderRadius:11}}/>;
 if(valid)return <div role="status" style={{height,display:"grid",placeItems:"center",background:"#f4f7fa",borderRadius:11}}>جارٍ تجهيز صورة المعاينة…</div>;
 return <CatalogCardPreview slug={slug} name={name}/>;
}
