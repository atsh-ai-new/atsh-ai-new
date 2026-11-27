"use client";
import {useState} from "react";
import CartoonStudio from "./cartoon-studio";
import StudioAssets from "./studio-assets";
export default function ContentStudio(){
 const [mode,setMode]=useState<"production"|"library">("production");
 return <div className="content-studio" dir="rtl"><nav className="cartoon-mode" aria-label="أقسام الاستوديو">
 <button type="button" aria-pressed={mode==="production"} className={mode==="production"?"active":""} onClick={()=>setMode("production")}>الإنتاج والمشروعات</button>
 <button type="button" aria-pressed={mode==="library"} className={mode==="library"?"active":""} onClick={()=>setMode("library")}>مكتبة الأصول</button>
 </nav><div hidden={mode!=="production"}><CartoonStudio/></div>{mode==="library"&&<StudioAssets/>}</div>
}
