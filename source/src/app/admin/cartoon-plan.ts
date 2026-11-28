export type ArtPose="stand"|"walk-a"|"walk-b"|"talk-open"|"sit"|"enter"|"exit"|"eat"|"wave"|"point"|"explain"|"think"|"tablet"|"closed"|"open";
export type ArtImage={pose:ArtPose;image:string};
export type RigPart="torso"|"head"|"left-arm"|"right-arm"|"left-leg"|"right-leg"|"mouth-open"|"eyes-closed";
export type RigLayer={part:RigPart;image:string;pivotX:number;pivotY:number};
export type Outfit={id:string;name:string;images:ArtImage[];rig?:RigLayer[]};
export type ArtSnapshot={id:string;revision:number;images:ArtImage[];rig?:RigLayer[];outfits?:Outfit[]};
export type SceneArtwork={id:string;revision:number;image:string;mode:"background"|"full";framing?:"fit"|"fill"};
export type PropArtwork={id:string;revision:number;image:string;x:number;y:number;size:number;foreground:boolean;stateImage?:string;motion?:"static"|"open"|"close"|"drive";motionStart?:number};
export type ScreenText={text:string;start:number;end:number;position:"top"|"middle"|"bottom"};
export type ArtAction="stand"|"walk"|"sit"|"stairs-up"|"stairs-down"|"enter"|"exit"|"eat"|"think"|"tablet";
export type VoiceId="local-msa"|"egyptian-male"|"egyptian-female"|"egyptian-child-male"|"egyptian-child-female"|"egyptian-teen-male"|"egyptian-teen-female"|"alexandrian-male"|"alexandrian-female"|"alexandrian-child-male"|"alexandrian-child-female"|"alexandrian-teen-male"|"alexandrian-teen-female"|"saidi-male"|"saidi-female"|"saidi-child-male"|"saidi-child-female"|"saidi-teen-male"|"saidi-teen-female"|"saudi-male"|"saudi-female"|"gulf-male"|"gulf-female";
export type Voice = {voiceId?:VoiceId;engine:"tiny-ar-msa";pitch:number;speed:number;intonation:number};
export type Character={id:string;name:string;skin:string;shirt:string;hairColor:string;hair:"short"|"long"|"bald";glasses:boolean;beard:boolean;voice:Voice;artwork?:ArtSnapshot};
export type Placement={characterId:string;position:"left"|"center-left"|"center"|"center-right"|"right";expression:"neutral"|"happy"|"curious"|"serious";gesture:"idle"|"wave"|"point"|"explain";outfitId?:string;pose:"stand"|"sit"|"walk";action?:ArtAction};
export type Dialogue={id:string;speakerId:string;text:string;pronunciation:string;start:number};
export type AudioSnapshot={id:string;revision:number;audio:string};
export type Shot={sceneIndex:number;background:"studio"|"office"|"technology";placements:Placement[];dialogue:Dialogue[];artwork?:SceneArtwork;props?:PropArtwork[];screenTexts?:ScreenText[];effect?:AudioSnapshot};
export type Scene={seconds:number;visual:string;characters:string;lighting:string;script:string;caption:string;motion:"zoom-in"|"zoom-out"|"static";camera:string;props:string;sound:string};
export type Animation={version:1;mode:"cartoon";renderer?:"layers-v1";cast:Character[];shots:Shot[];subtitles:boolean;music:boolean;musicTrack?:AudioSnapshot;musicVolume:number;speechVolume:number;mouthIntensity:number};
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
 for(const s of a.shots)if(s.screenTexts?.some(t=>!t.text.trim()||t.start<0||t.end<=t.start||t.end>p.scenes[s.sceneIndex].seconds))err.push("راجع توقيت النص الظاهر على الشاشة.");
 const artSize=a.cast.reduce((n,c)=>n+(c.artwork?[c.artwork,...(c.artwork.outfits||[])].reduce((m,a)=>m+a.images.reduce((k,i)=>k+i.image.length,0)+(a.rig||[]).reduce((k,i)=>k+i.image.length,0),0):0),0)+a.shots.reduce((n,s)=>n+(s.artwork?.image.length||0)+(s.props?.reduce((m,p)=>m+p.image.length+(p.stateImage?.length||0),0)||0),0);if(artSize+(a.musicTrack?.audio.length||0)+a.shots.reduce((n,s)=>n+(s.effect?.audio.length||0),0)>3400000)err.push("حجم صور المشروع أكبر من الحد المسموح.");
 for(const s of a.shots)for(const x of s.placements){if(s.artwork?.mode==="full"||!x.action||x.action==="stand")continue;const art0=a.cast.find(c=>c.id===x.characterId)?.artwork;const art=x.outfitId?art0?.outfits?.find(o=>o.id===x.outfitId):art0; if(a.renderer==="layers-v1"&&art?.rig&&["walk","sit","stairs-up","stairs-down"].includes(x.action))continue;const poses=new Set(art?.images.map(i=>i.pose)||[]);if(x.action==="walk"||x.action.startsWith("stairs")){if(!poses.has("walk-a")||!poses.has("walk-b"))err.push("المشي والسلالم يتطلبان صورتين لخطوتين مختلفتين.");}else if(!poses.has(x.action as ArtPose))err.push("صورة الوضعية المطلوبة غير موجودة.");}
 if(a.shots.reduce((n,s)=>n+s.dialogue.length,0)>12)err.push("الحد الأقصى 12 جملة.");
 return err;
}


// Preserve the user's dialogue, never send the optional stage direction to TTS.
export function singleScriptPlan(character:Character,input:string,seconds:number):CartoonPlan {
 const lines=input.trim().split(/\r?\n/);
 const direction=lines[0]?.match(/^\[([^\[\]]{1,160})\]\s*$/u);
 if(direction)lines.shift();
 const text=lines.join(" ").replace(/\s+/gu," ").trim();
 if(!character.artwork?.images.some(p=>p.pose==="stand"))throw Error("اختار شخصية بصورة وقوف من المكتبة.");
 if(!text||text.length>90||!/\p{Script=Arabic}/u.test(text)||/[A-Za-z[\]]/u.test(text))throw Error("اكتب جملة حوار بالعربي لحد 90 حرف. لو فيه توجيه، حطه بين [ ] في أول سطر لوحده.");
 if(!Number.isInteger(seconds)||seconds<3||seconds>8)throw Error("مدة اللقطة من 3 إلى 8 ثواني.");
 const title=("مشهد "+character.name).slice(0,180);
 const plan=localPlan({product:title,audience:"",benefit:"",cta:"",style:"story",background:"office",seconds,castCount:1});
 const visual=direction?.[1].trim()||"لقطة كاملة ثابتة للشخصية";
 const l={id:newId("l"),speakerId:character.id,text,pronunciation:"",start:.3};
 return {...plan,concept:"لقطة من سيناريو مكتوب",musicAndSound:"الحوار فقط",scenes:[
   {...plan.scenes[0],seconds,visual,characters:character.name,script:text,sound:text,caption:"",camera:"wide",motion:"static"}
 ],animation:{...plan.animation,renderer:"layers-v1",music:false,subtitles:false,cast:[character],shots:[
   {...plan.animation.shots[0],placements:[{characterId:character.id,position:"center",expression:"neutral",gesture:"idle",pose:"stand",action:"stand"}],dialogue:[l]}
 ]}};
}
