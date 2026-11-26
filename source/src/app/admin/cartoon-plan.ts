export type Voice = {engine:"tiny-ar-msa";pitch:number;speed:number;intonation:number};
export type Character={id:string;name:string;skin:string;shirt:string;hairColor:string;hair:"short"|"long"|"bald";glasses:boolean;beard:boolean;voice:Voice};
export type Placement={characterId:string;position:"left"|"center-left"|"center"|"center-right"|"right";expression:"neutral"|"happy"|"curious"|"serious";gesture:"idle"|"wave"|"point"|"explain";pose:"stand"|"sit"|"walk"};
export type Dialogue={id:string;speakerId:string;text:string;pronunciation:string;start:number};
export type Shot={sceneIndex:number;background:"studio"|"office"|"technology";placements:Placement[];dialogue:Dialogue[]};
export type Scene={seconds:number;visual:string;characters:string;lighting:string;script:string;caption:string;motion:"zoom-in"|"zoom-out"|"static";camera:string;props:string;sound:string};
export type Animation={version:1;mode:"cartoon";cast:Character[];shots:Shot[];subtitles:boolean;music:boolean;musicVolume:number;speechVolume:number;mouthIntensity:number};
export type CartoonPlan={version:1;approved:false;title:string;campaign:{objective:string;audience:string;keyMessage:string;tone:string;format:string;totalDurationSeconds:number};brand:{palette:string;logoPlacement:string;logoRules:string};concept:string;voiceover:string;musicAndSound:string;cta:string;scenes:Scene[];postProduction:string;openQuestions:string[];productionChecklist:string[];animation:Animation};
export type Brief={product:string;audience:string;benefit:string;cta:string;style:"story"|"problem"|"intro";background:Shot["background"];seconds:number;castCount:number};
export const newId=(prefix:string)=>prefix+"-"+Math.random().toString(36).slice(2,11);
export const slot=(count:number,index:number):Placement["position"]=>(count===1?["center"]:count===2?["left","right"]:count===3?["left","center","right"]:["left","center-left","center-right","right"])[index] as Placement["position"];
export function newCharacter(index:number):Character{
 const names=["نور","آدم","سلمى","عمر"];
 return {id:newId("c"),name:names[index]||"شخصية "+(index+1),skin:["#D89B71","#B77B52","#E9B38F","#BC8A65"][index%4],shirt:["#395F9D","#198C87","#B45A80","#A67A36"][index%4],hairColor:"#28202B",hair:index===2?"long":"short",glasses:false,beard:index===3,voice:{engine:"tiny-ar-msa",pitch:[0,-2,2,-1][index%4],speed:1,intonation:1}};
}
const localCopy={
 story:[["البداية","لحظة اختيار جديدة","هل نبدأ خطوة جديدة؟"],["التحدي","المشكلة في طريقنا","نحتاج حلًا أسهل."],["الحل","حل عملي وواضح","وجدنا الطريقة الأنسب."],["النهاية","الخطوة التالية","لنبدأ اليوم."]],
 problem:[["المشكلة","تحدي يومي","هذا يأخذ وقتًا طويلًا."],["الفرصة","طريقة مختلفة","هناك طريقة أسهل."],["الحل","اعرض القيمة","هكذا تصبح الأمور أبسط."],["الدعوة","ابدأ الخطوة","جرب الحل اليوم."]],
 intro:[["التعريف","مرحبًا بك","أهلًا بكم معنا."],["القيمة","ما نقدمه","معًا نحو تجربة أفضل."],["التميز","الفكرة الأساسية","لنصنع الفرق معًا."],["الدعوة","تواصل معنا","ابدأ الآن."]]
} as const;
const spoken=(s:string,fallback:string)=>s.trim()&&!/[A-Za-z]/.test(s)&&s.trim().split(/\s+/).length<=5?s.trim():fallback;
export function localPlan(b:Brief):CartoonPlan{
 const count=Math.max(1,Math.min(4,Math.ceil(b.seconds/8)));const duration=Math.max(3,Math.min(8,Math.floor(b.seconds/count)));
 const cast=Array.from({length:Math.max(1,Math.min(4,b.castCount))},(_,i)=>newCharacter(i));
 const steps=localCopy[b.style];const selected=count===1?[steps[3]]:count===2?[steps[0],steps[3]]:count===3?[steps[0],steps[2],steps[3]]:steps;
 const scenes:Scene[]=selected.map(([label,caption,dialogue],i)=>({seconds:duration+(i<b.seconds-duration*count?1:0),visual:"Original 2D animated advertisement, "+(b.background==="office"?"professional office":b.background==="technology"?"modern technology studio":"warm presentation studio")+", clear composition and warm lighting",characters:cast.map(c=>c.name).join("، "),lighting:"إضاءة ناعمة وواضحة",script:label+" — "+(i===count-1?b.cta:b.benefit||b.product),caption:(i===count-1?b.cta||caption:i===count-2?b.benefit||caption:caption).slice(0,42),motion:i===0?"zoom-in":"static",camera:"كادر رأسي",props:"ديكور الخلفية المحلية",sound:dialogue}));
 const shots:Shot[]=scenes.map((s,i)=>({sceneIndex:i,background:b.background,placements:cast.map((c,j)=>({characterId:c.id,position:slot(cast.length,j),expression:i===0?"curious":"happy",gesture:j===i%cast.length?"explain":"idle",pose:i===0&&cast.length===1?"walk":"stand"})),dialogue:[{id:newId("l"),speakerId:cast[i%cast.length].id,text:i===count-1?spoken(b.cta,selected[i][2]):i===count-2?spoken(b.benefit,selected[i][2]):selected[i][2],pronunciation:"",start:.3}]}));
 return {version:1,approved:false,title:b.product.trim().slice(0,180),campaign:{objective:"إعلان تعريفي أو ترويجي",audience:b.audience.slice(0,240),keyMessage:b.benefit.slice(0,240),tone:"واضح ودود",format:"9:16",totalDurationSeconds:scenes.reduce((n,s)=>n+s.seconds,0)},brand:{palette:"",logoPlacement:"",logoRules:""},concept:"إعلان كرتوني عن "+b.product+" — "+(b.benefit||"تقديم الخدمة بصورة مختصرة"),voiceover:"",musicAndSound:"موسيقى محلية خفيفة وحوار عربي",cta:b.cta.slice(0,28),scenes,postProduction:"مراجعة الحوار وتوقيت الجمل ثم التصدير الرأسي",openQuestions:[],productionChecklist:["تأكيد الفكرة","مراجعة الشخصيات والحوار","اعتماد الإنتاج"],animation:{version:1,mode:"cartoon",cast,shots,subtitles:true,music:true,musicVolume:.12,speechVolume:1,mouthIntensity:1}};
}
export function validateCartoon(p:CartoonPlan):string[]{
 const err:string[]=[];const a=p.animation;const slots={"left":.18,"center-left":.38,"center":.5,"center-right":.62,"right":.82};
 if(p.title.trim().length<2)err.push("اكتب اسم الحملة.");
 if(a.cast.some(c=>!c.name.trim())||new Set(a.cast.map(c=>c.name.trim())).size!==a.cast.length)err.push("أسماء الشخصيات يجب أن تكون مختلفة.");
 for(let i=0;i<p.scenes.length;i++){const s=p.scenes[i],shot=a.shots[i];if(!shot){err.push("مشهد بلا حركة.");continue}const pre=new Set(shot.placements.map(q=>q.characterId)),pos=shot.placements.map(q=>slots[q.position]).sort((x,y)=>x-y);if(!pre.size||pos.some((v,k)=>k>0&&v-pos[k-1]<.15))err.push("المشهد "+(i+1)+": وزّع الشخصيات دون تداخل.");if(!shot.dialogue.length||shot.dialogue.some(l=>!pre.has(l.speakerId)||!l.text.trim()||/[A-Za-z]/.test(l.pronunciation||l.text)||l.start>=s.seconds-.1||l.start<0)||new Set(shot.dialogue.map(l=>l.start)).size!==shot.dialogue.length)err.push("المشهد "+(i+1)+": راجع المتكلم والنطق العربي والتوقيت.");}
 if(a.shots.reduce((n,s)=>n+s.dialogue.length,0)>12)err.push("الحد الأقصى 12 جملة.");
 return err;
}
