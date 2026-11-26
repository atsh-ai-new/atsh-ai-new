"use client";
import type {ReactNode} from "react";
import {groupAddons,type CategorizedAddon,type AddonCategoryOrder} from "@/lib/addon-categories";
export default function AddonGroups<T extends CategorizedAddon>({addons,locale="ar",order,render,grid=true}:{addons:T[];locale?:"ar"|"en";order?:AddonCategoryOrder[];render:(addon:T)=>ReactNode;grid?:boolean}){
 const en=locale==="en";
 const groups=groupAddons(addons,order).filter(g=>g.items.length);
 return <div className="addon-category-list">
  {groups.map((g,i)=><section key={g.code} className="addon-category-panel" aria-label={en?g.en:g.name} data-addon-category={g.code}>
    <div className="addon-category-heading"><span className="addon-category-index">{String(i+1).padStart(2,"0")}</span><div><h3>{en?g.en:g.name}</h3><p>{en?g.descriptionEn:g.description}</p></div><span className="addon-category-count">{g.items.length}</span></div>
    <div className={grid?"option-grid addon-grid addon-category-grid":"addon-category-rows"}>{g.items.map(render)}</div>
  </section>)}
 </div>;
}
