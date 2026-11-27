import {useId} from "react";
// Original vector artwork: a visual placeholder family for the illustrative catalog, not real product photography.
export default function CommerceArt({sector,accent,index=0}:{sector:string;accent:string;index?:number}){
 const id=useId().replaceAll(":","");
 const common={fill:accent,stroke:"#fff",strokeWidth:2};
 const shapes:Record<string,React.ReactNode>={
 fashion:<path d="M110 62l37-19 15 21 15-21 37 19 32 36-28 25-16-18v77h-80v-77l-16 18-28-25z" {...common}/>,
 furniture:<><rect x="112" y="46" width="94" height="82" rx="21" {...common}/><rect x="86" y="115" width="145" height="40" rx="18" {...common}/><path d="M105 153l-11 40m120-40 11 40" stroke="#524132" strokeWidth="8" strokeLinecap="round"/></>,
 electronics:<><rect x="125" y="38" width="74" height="145" rx="15" {...common}/><rect x="133" y="50" width="58" height="112" rx="7" fill="#eff4fc"/><circle cx="162" cy="172" r="5" fill="white"/></>,
 kids:<><rect x="111" y="67" width="102" height="110" rx="23" {...common}/><path d="M143 67v-9a20 20 0 0140 0v9" fill="none" stroke={accent} strokeWidth="11"/><rect x="129" y="116" width="66" height="38" rx="12" fill="#fff8"/></>,
 toys:<><rect x="78" y="104" width="64" height="64" rx="9" {...common}/><rect x="147" y="72" width="66" height="96" rx="9" fill="#e5af6d"/><circle cx="219" cy="126" r="38" fill="#8daeaa" stroke="white" strokeWidth="2"/></>,
 shoes:<path d="M83 133l58-72 32 50 52 18q24 10 29 29l-12 14H81q-18-5-12-24z" {...common}/>,
 jewelry:<><circle cx="160" cy="129" r="43" fill="none" stroke={accent} strokeWidth="13"/><path d="M132 73l28-23 28 23-28 20z" fill="#d5bc87" stroke="white" strokeWidth="3"/></>,
 fitness:<><path d="M103 114h118" stroke="#374451" strokeWidth="17"/>{[75,222].map(x=><rect key={x} x={x} y="83" width="31" height="62" rx="7" {...common}/>)}</>,
 beauty:<><rect x="112" y="65" width="58" height="115" rx="16" {...common}/><rect x="126" y="44" width="30" height="25" rx="5" fill="#c5b6aa"/><rect x="178" y="108" width="55" height="70" rx="12" fill="#d5adad" stroke="white" strokeWidth="2"/><path d="M182 108h47" stroke="#9d746b" strokeWidth="8"/></>,
 glasses:<><circle cx="120" cy="112" r="37" fill={accent} fillOpacity=".5" stroke={accent} strokeWidth="8"/><circle cx="204" cy="112" r="37" fill={accent} fillOpacity=".5" stroke={accent} strokeWidth="8"/><path d="M158 112h9M81 111l-25-16m185 16 25-16" stroke={accent} strokeWidth="7" fill="none"/></>,
 gifts:<><rect x="103" y="87" width="118" height="91" rx="4" {...common}/><rect x="95" y="75" width="134" height="22" rx="5" fill={accent}/><path d="M162 76v102" stroke="#efd0a3" strokeWidth="17"/><path d="M162 78q-56-54-51-20t51 20q56-54 51-20t-51 20" stroke="#d0a478" strokeWidth="8" fill="none"/></>,
 garden:<><path d="M117 130h89l-15 54h-57z" fill={accent}/><path d="M161 131V59M161 103Q127 47 103 66q8 45 58 37M162 87q30-49 56-27-9 35-56 27" stroke="#4d7657" strokeWidth="9" fill="#7fa374" strokeLinecap="round"/></>,
 perfume:<><rect x="112" y="74" width="100" height="105" rx="22" {...common}/><rect x="141" y="45" width="43" height="31" rx="5" fill="#aa8e5f"/><rect x="133" y="108" width="59" height="39" rx="4" fill="white" opacity=".65"/></>,
 food:<><ellipse cx="162" cy="140" rx="102" ry="42" fill="#fff" stroke="#e4d9c6" strokeWidth="4"/><ellipse cx="162" cy="133" rx="71" ry="24" fill="#72946b"/><path d="M96 125q66-66 134 0z" fill="#d7a663"/><path d="M99 132h127" stroke="#c85f42" strokeWidth="11" strokeLinecap="round"/></>,
 books:<><path d="M91 51q47-8 71 8v120q-32-17-71-4z" fill={accent} stroke="#fff" strokeWidth="2"/><path d="M233 51q-47-8-71 8v120q32-17 71-4z" fill="#c8b799" stroke="#fff" strokeWidth="2"/>{[85,103,121,139].map(y=><path key={y} d={'M105 '+y+'h42m30 0h42'} stroke="white" strokeWidth="3" opacity=".7"/>)}</>,
 pets:<><path d="M96 129h132l-18 47h-96z" {...common}/><ellipse cx="162" cy="129" rx="66" ry="18" fill="#b99773"/>{[111,141,171,201].map(x=><circle cx={x} cy="129" r="9" fill="#886b50" key={x}/>)}</>,
 digital:<><rect x="87" y="54" width="150" height="115" rx="10" {...common}/><rect x="98" y="65" width="128" height="88" rx="5" fill="#eff4f4"/><path d="M64 173h196" stroke={accent} strokeWidth="14" strokeLinecap="round"/><path d="M126 108l20 18 51-41" stroke={accent} strokeLinecap="round" strokeWidth="8" fill="none"/></>,
 auto:<><path d="M76 136l22-36 29-21h68l31 23 24 34v29H76z" {...common}/><path d="M114 108l20-20h53l20 20z" fill="#c7dce5"/><circle cx="109" cy="165" r="19" fill="#34434a"/><circle cx="217" cy="165" r="19" fill="#34434a"/></>,
 home:<><path d="M99 112h126v40q0 25-30 25h-66q-30 0-30-25z" {...common}/><path d="M82 114h159M126 92h73" stroke={accent} strokeWidth="9" strokeLinecap="round"/><path d="M153 90v-12h18v12" stroke={accent} strokeWidth="7" fill="none"/></>,
 general:<><path d="M102 78h120l13 104H89z" {...common}/><path d="M132 78V63a30 30 0 0160 0v15" stroke={accent} strokeWidth="8" fill="none"/><circle cx="162" cy="126" r="21" fill="#fff6"/></>,
 tools:<><path d="M101 176l-19-19 91-91 17 17z" {...common}/><path d="M168 66l27-28 35 32-27 28z" fill="#657278" stroke="white" strokeWidth="2"/></>
 };
 return <svg aria-hidden="true" viewBox="0 0 324 218" style={{width:"100%",height:"100%",display:"block"}}><defs><linearGradient id={id} x2="1" y2="1"><stop stopColor="#f9f8f5"/><stop offset="1" stopColor={accent} stopOpacity=".2"/></linearGradient></defs><rect width="324" height="218" fill={"url(#"+id+")"}/><circle cx={index%2?241:83} cy="59" r="53" fill="white" opacity=".55"/><ellipse cx="163" cy="189" rx="93" ry="12" fill="#26343b" opacity=".10"/><g transform={index%2?"translate(8 3) scale(.94)":"translate(0 0)"}>{shapes[sector]??shapes.general}</g></svg>
}
