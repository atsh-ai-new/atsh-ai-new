export const sectors = [
 ['fashion','ملابس وأزياء','Fashion','قمصان،فساتين،ملابس رسمية'],
 ['furniture','أثاث وديكور','Furniture','كراسي،طاولات،إضاءة'],
 ['electronics','إلكترونيات','Electronics','سماعات،هواتف،ملحقات'],
 ['kids','مستلزمات الأطفال','Kids','ملابس أطفال،حقائب،مستلزمات'],
 ['toys','ألعاب وهوايات','Toys','ألعاب تعليمية،مكعبات،هوايات'],
 ['shoes','أحذية وحقائب','Shoes & Bags','أحذية،حقائب،محافظ'],
 ['jewelry','مجوهرات وإكسسوارات','Jewelry','خواتم،أساور،قلائد'],
 ['fitness','صحة ولياقة','Fitness','معدات،ملابس رياضية،أدوات'],
 ['beauty','مستحضرات تجميل','Beauty','عناية بالبشرة،مكياج،عناية بالشعر'],
 ['glasses','ساعات ونظارات','Watches & Glasses','نظارات،ساعات،حافظات'],
 ['gifts','هدايا وحرف','Gifts','هدايا،حرف يدوية،تغليف'],
 ['garden','زراعة وحدائق','Garden','نباتات،أصص،أدوات زراعة'],
 ['perfume','عطور','Perfume','عطور،بخور،هدايا'],
 ['food','طعام ومشروبات','Food','وجبات،مشروبات،حلويات'],
 ['books','كتب','Books','روايات،كتب تعليمية،قرطاسية'],
 ['pets','حيوانات أليفة','Pets','أغذية،ألعاب،مستلزمات'],
 ['digital','منتجات رقمية','Digital','ملفات،تصاميم،دورات'],
 ['auto','سيارات وإكسسوارات','Automotive','ملحقات،عناية،أدوات'],
 ['home','منزل ومطبخ','Home & Kitchen','أواني،تنظيم،أدوات مطبخ'],
 ['general','متجر عام','General','عروض،منتجات منزلية،مستلزمات'],
 ['tools','أدوات ومعدات','Tools','عدد يدوية،أدوات كهربائية،ملحقات']
].map(([id,ar,en,categories])=>({id,ar,en,categories:categories.split('،')}));
export const layouts=[
 {id:'canvas',name:'Canvas',accent:'#46665a',bg:'#f4f1e9',ink:'#243d38',layout:'editorial',sections:['hero','categories','featured','story','products']},
 {id:'pulse',name:'Pulse',accent:'#ec6240',bg:'#fff8f1',ink:'#17202e',layout:'bold',sections:['hero','featured','categories','products','story']},
 {id:'atelier',name:'Atelier',accent:'#a9874c',bg:'#f9f5ed',ink:'#30241d',layout:'luxury',sections:['hero','story','featured','categories','products']},
 {id:'gridline',name:'Gridline',accent:'#1559ab',bg:'#eef4fa',ink:'#14263e',layout:'market',sections:['categories','hero','products','featured','story']},
 {id:'nightshift',name:'Nightshift',accent:'#9be7dc',bg:'#15212c',ink:'#f4f7fa',layout:'dark',sections:['hero','products','categories','featured','story']},
 {id:'grove',name:'Grove',accent:'#607e36',bg:'#f3f5dd',ink:'#293b26',layout:'organic',sections:['hero','story','categories','products','featured']},
 {id:'folio',name:'Folio',accent:'#7052b7',bg:'#f7f2ff',ink:'#25203a',layout:'split',sections:['hero','featured','story','products','categories']},
 {id:'swift',name:'Swift',accent:'#bd2e66',bg:'#fff5f8',ink:'#32222c',layout:'compact',sections:['categories','products','hero','featured','story']}
];
export const themes=sectors.flatMap(s=>layouts.map(l=>({...l,id:s.id+'-'+l.id,sector:s.id,sectorName:s.ar,name:l.name+' · '+s.en})));
export const getTheme=id=>themes.find(t=>t.id===id);
export const sections=['hero','categories','featured','story','products'];
export function normalizeDesign(input={},theme){
 const allowed=new Set(sections);
 const order=input.sections??theme.sections;
 if(!Array.isArray(order)||order.length!==5||new Set(order).size!==5||order.some(x=>!allowed.has(x)))throw Error('Invalid section order');
 const color=(v,d)=>{if(v===undefined)return d;if(!/^#[0-9a-f]{6}$/i.test(v))throw Error('Invalid color');return v};
 const str=(v,d,max)=>{if(v===undefined)return d;if(typeof v!=='string'||v.length>max)throw Error('Invalid design text');return v};
 const image=(v)=>{if(v===undefined||v==='')return '';let u;try{u=new URL(v)}catch{throw Error('Invalid image URL')}if(u.protocol!=='https:'||u.username||u.password)throw Error('HTTPS image URL required');return u.href};
 return {accent:color(input.accent,theme.accent),bg:color(input.bg,theme.bg),ink:color(input.ink,theme.ink),headline:str(input.headline,'تسوّق ما يناسبك',160),subtitle:str(input.subtitle,'مختارات بعناية لجودة تستحقها',300),story:str(input.story,'نختار منتجاتنا باهتمام ونقدم تجربة تسوق سهلة.',1000),banner:image(input.banner),logo:image(input.logo),sections:order};
}
