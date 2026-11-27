import {useEffect,useRef,useState,type CSSProperties} from "react";
import styles from "./news-bubbles.module.css";

const HEX_COLOR=/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;

export function NewsBubbles({ticker,english}:{
 ticker:{text:string;url:string;speed:number;color:string;background:string};
 english:boolean;
}){
 const [paused,setPaused]=useState(false);
 const [duration,setDuration]=useState(12);
 const list=useRef<HTMLUListElement>(null);
 const parts=ticker.text.split(/\r?\n|\s*[✦•|،]\s*|\s+[—–]\s+/).map(item=>item.trim()).filter(Boolean);
 const items=parts.length?parts:[ticker.text.trim()];
 const href=/^\/(?!\/)|^https:\/\//i.test(ticker.url||"")?ticker.url:undefined;
 const label=english?"Platform news":"أخبار المنصة";
 const isRtl=!english;

 useEffect(()=>{
  const element=list.current;
  if(!element)return;
  const speed=Math.max(8,Math.min(90,Number(ticker.speed)||25));
  const measure=()=>setDuration(Math.max(3,element.getBoundingClientRect().width/(75*25/speed)));
  measure();
  const observer=new ResizeObserver(measure);
  observer.observe(element);
  return()=>observer.disconnect();
 },[ticker.speed]);

 const theme={
  "--news-bg":HEX_COLOR.test(ticker.background)?ticker.background:"#ffffff",
  "--news-ink":HEX_COLOR.test(ticker.color)?ticker.color:"#14243C",
  "--news-duration":duration+"s",
 } as CSSProperties;

 return <section className={`atsh-news-ticker ${styles.bar}`} data-paused={paused} data-news-bubbles dir={isRtl?"rtl":"ltr"} aria-label={label} style={theme}>
  <div className={styles.viewport}>
   <div className={styles.track}>
    <ul ref={list} className={styles.items} dir={isRtl?"rtl":"ltr"} role="list">
     {items.map((item,index)=><li key={index}>
      {href?<a className={styles.bubble} href={href}>{item}</a>:<span className={styles.bubble}>{item}</span>}
     </li>)}
    </ul>
    <ul className={styles.items} dir={isRtl?"rtl":"ltr"} aria-hidden="true">
     {items.map((item,index)=><li key={index}>
      {href?<a tabIndex={-1} className={styles.bubble} href={href}>{item}</a>:<span className={styles.bubble}>{item}</span>}
     </li>)}
    </ul>
   </div>
  </div>
  <button type="button" className={styles.toggle} aria-pressed={paused}
   aria-label={english?"Pause news scrolling":"إيقاف حركة شريط الأخبار"}
   onClick={()=>setPaused(p=>!p)}>
   {paused?<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.5v9l7-4.5z"/></svg>:<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 3.5h2.6v9H4zm5.4 0H12v9H9.4z"/></svg>}
  </button>
 </section>;
}
