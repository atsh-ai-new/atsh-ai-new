"use client";
import type {ReactNode} from "react";
import {groupAddons,type CategorizedAddon,type AddonCategoryOrder} from "@/lib/addon-categories";
export default function AddonGroups<T extends CategorizedAddon>({addons,locale="ar",order,render,grid=true,isSelected}:{addons:T[];locale?:"ar"|"en";order?:AddonCategoryOrder[];render:(addon:T)=>ReactNode;grid?:boolean;isSelected?:(addon:T)=>boolean}){
 const en=locale==="en";
 const groups=groupAddons(addons,order).filter(g=>g.items.length);
 return <div className="addon-category-list">
  {groups.map((g,i)=>{
    const selectedCount=isSelected?g.items.filter(isSelected).length:0;
    return <details key={g.code} className="addon-category-panel addon-category-collapsible" aria-label={en?g.en:g.name} data-addon-category={g.code}>
      <summary className="addon-category-heading"><span className="addon-category-index">{String(i+1).padStart(2,"0")}</span><span className="addon-category-label"><strong>{en?g.en:g.name}</strong><span>{en?g.descriptionEn:g.description}</span></span><span className="addon-category-count">{g.items.length} {en?"add-ons":"إضافة"}{selectedCount>0&&<span className="addon-category-selected">{en?`${selectedCount} selected`:`تم اختيار ${selectedCount}`}</span>}</span><span className="addon-category-chevron" aria-hidden="true"/></summary>
      <div className={grid?"option-grid addon-grid addon-category-grid":"addon-category-rows"}>{g.items.map(render)}</div>
    </details>;
  })}
 </div>;
}
