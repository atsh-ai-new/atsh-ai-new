export type DemoProduct={id:string;name:string;en:string;category:number;price:number;stock:number;tag:string;variant:string[]};
type ProductSpec=[string,string,number,number,string?];
const products:Record<string,ProductSpec[]>={
 fashion:[["قميص كتان كلاسيكي","Classic linen shirt",0,780],["فستان صيفي","Summer dress",1,1290],["جاكيت رسمي","Tailored jacket",2,1850],["قميص قطن أساسي","Cotton essential",0,550]],
 furniture:[["كرسي دارا الخشبي","Dara lounge chair",0,3850],["طاولة بلوط","Oak coffee table",1,4200],["مصباح سيراميك","Ceramic lamp",2,1190],["كرسي جانبي","Accent chair",0,2790]],
 electronics:[["سماعات لاسلكية","Wireless headphones",0,1450],["هاتف ذكي","Smartphone",1,8990],["شاحن سريع","Fast charger",2,560],["سماعة محمولة","Portable speaker",0,950]],
 kids:[["طقم قطن للأطفال","Cotton kids set",0,490],["حقيبة أطفال","Kids backpack",1,560],["كوب تدريب","Training cup",2,180],["بيجامة مريحة","Soft pajamas",0,420]],
 toys:[["مجموعة تعلم الألوان","Color learning set",0,340],["مكعبات بناء","Building blocks",1,590],["طقم رسم","Art kit",2,290],["أحجية خشبية","Wooden puzzle",0,250]],
 shoes:[["حذاء يومي","Everyday sneakers",0,990],["حقيبة جلدية","Leather tote",1,1290],["محفظة صغيرة","Compact wallet",2,380],["حذاء رياضي","Running shoes",0,1490]],
 jewelry:[["خاتم فضي","Silver ring",0,690],["سوار بسيط","Minimal bracelet",1,550],["قلادة كلاسيكية","Classic necklace",2,1050],["خاتم هندسي","Geometric ring",0,750]],
 fitness:[["مجموعة أوزان","Dumbbell set",0,1750],["طقم تدريب","Training outfit",1,780],["حبل مقاومة","Resistance band",2,270],["سجادة تمارين","Exercise mat",0,560]],
 beauty:[["مصل ترطيب","Hydrating serum",0,390],["مجموعة مكياج","Makeup kit",1,750],["زيت عناية للشعر","Hair care oil",2,280],["كريم عناية يومية","Daily moisturizer",0,320]],
 glasses:[["نظارة شمسية","Sunglasses",0,690],["ساعة كلاسيكية","Classic watch",1,2290],["حافظة نظارات","Glasses case",2,220],["نظارة بإطار خفيف","Lightweight frames",0,580]],
 gifts:[["صندوق هدية","Gift box",0,650],["شمعة يدوية","Handmade candle",1,290],["تغليف فاخر","Premium wrapping",2,120],["باقة مناسبات","Occasion bundle",0,790]],
 garden:[["نبتة داخلية","Indoor plant",0,380],["أصيص سيراميك","Ceramic planter",1,260],["طقم أدوات زراعة","Garden tool set",2,490],["نبات مكتبي","Desk plant",0,195]],
 perfume:[["عطر عنبر","Amber fragrance",0,890],["بخور فاخر","Premium incense",1,390],["طقم عطور هدية","Fragrance gift set",2,1490],["عطر ورد","Rose fragrance",0,790]],
 food:[["بوكس وجبة طازجة","Fresh meal box",0,180],["عصير فواكه","Fruit juice",1,65],["قطعة كيك","Cake slice",2,85],["ساندوتش خاص","Signature sandwich",0,115]],
 books:[["رواية مختارة","Selected novel",0,230],["كتاب تعلم","Learning handbook",1,340],["دفتر ملاحظات","Notebook",2,120],["رواية جديدة","New novel",0,270]],
 pets:[["وجبات حيوانات أليفة","Pet food",0,420],["لعبة تفاعلية","Interactive toy",1,195],["وعاء طعام","Feeding bowl",2,210],["مكافآت تدريب","Training treats",0,170]],
 digital:[["حزمة ملفات رقمية","Digital file bundle",0,280],["قوالب تصميم","Design template pack",1,490],["دورة مسجلة","Recorded course",2,950],["ملفات تنظيم","Planner files",0,190]],
 auto:[["منظم السيارة","Car organizer",0,390],["منظف وعناية","Car care kit",1,430],["حامل هاتف","Phone mount",2,280],["غطاء مقعد","Seat cover",0,680]],
 home:[["طقم أواني","Cookware set",0,1890],["وحدة تنظيم","Storage organizer",1,450],["أدوات مطبخ","Kitchen utensils",2,290],["وعاء تقديم","Serving bowl",0,370]],
 general:[["حقيبة متعددة الاستخدام","Everyday bag",0,420],["منظم منزل","Home organizer",1,390],["مجموعة عناية","Care bundle",2,580],["باقة مختارة","Signature bundle",0,750]],
 tools:[["مفك متعدد","Multi-bit screwdriver",0,390],["مثقاب كهربائي","Electric drill",1,2150],["طقم قياس","Measurement kit",2,560],["صندوق أدوات","Tool box",0,890]]
};
export const demoProducts=(sector:string):DemoProduct[]=>(products[sector]??products.general).map((p,i)=>({id:sector+"-"+i,name:p[0],en:p[1],category:p[2],price:p[3],stock:[12,7,18,3][i],tag:["مختارات","جديد","الأكثر طلبًا","إصدار محدود"][i],variant:sector==="fashion"||sector==="shoes"?["S","M","L"]:["Standard","Premium"]}));
export const designNotes:Record<string,[string,string]>={editorial:["واجهة تحريرية هادئة، مساحة واسعة للمنتجات","Editorial layout, generous product imagery"],bold:["ألوان جريئة، عروض بارزة، تسوق سريع","Bold colors, prominent offers, fast shopping"],luxury:["هوية راقية، قصة العلامة في المقدمة","Elegant identity, brand story in focus"],market:["تصنيفات فورية وكثافة منتجات عالية","Category-first, dense product discovery"],dark:["تباين داكن، تفاصيل منتجات واضحة","Dark contrast, strong product detail"],organic:["أشكال ناعمة وهوية طبيعية","Soft forms, organic identity"],split:["واجهة مقسمة وهوية بصرية قوية","Split hero, strong visual identity"],compact:["واجهة مختصرة للوصول السريع للشراء","Compact layout, quick path to checkout"]};
