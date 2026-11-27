import {sectors,themes} from "../../commerce-engine/src/themes.js";
import {localPath,noIndex,pageMetadata,type Locale} from "./seo";

// One purchase-intent entry per sector. Layout variants remain interactive demos.
// These are needs to discuss, not a promise that an integration is included.
const guides:Record<string,readonly [string,string]>={
 fashion:["حدّد المقاسات والألوان والاستبدال قبل الاتفاق على تنفيذ المتجر.","Plan size and colour options, returns and exchanges before implementation."],
 furniture:["راجع تفاصيل الخامات والمقاسات، ومناطق التوصيل للقطع الكبيرة.","Plan dimensions, materials and delivery coverage for bulky products."],
 electronics:["اعرض المواصفات الفنية بوضوح وراجع الضمان ومخزون كل موديل.","Specify technical details, warranty terms and stock for each model."],
 kids:["قسّم المنتجات حسب العمر والاستخدام وأظهر معلومات المقاس بوضوح.","Group products by age and use, and show sizing information clearly."],
 toys:["خطّط لتصنيفات حسب السن والهواية وأضف إرشادات الاستخدام عند الحاجة.","Plan age and interest categories, and include usage information where needed."],
 shoes:["اتفق على جدول المقاسات وتوفر كل لون وسياسة الاستبدال.","Plan size charts, colour availability and exchange conditions."],
 jewelry:["فرّق بين الخامات والمقاسات، وحدّد تفاصيل التغليف والتوصيل.","Describe materials and sizing and set clear packaging and delivery expectations."],
 fitness:["حدد المواصفات المناسبة للمعدات مثل الوزن والأبعاد والاستخدام.","Specify equipment weight, dimensions and intended use where relevant."],
 beauty:["اعرض المكونات والكميات وطريقة الاستخدام من غير وعود صحية غير مثبتة.","Show ingredients, sizes and directions without unsupported health claims."],
 glasses:["وضّح مقاسات الإطار أو الساعة وخيارات الألوان وتفاصيل الضمان.","Show frame or watch measurements, colour options and warranty details."],
 gifts:["ناقش كتابة الإهداء والتغليف ومواعيد التسليم قبل ربطها بسلة الشراء.","Discuss gift notes, wrapping and delivery dates before implementing checkout options."],
 garden:["وضّح أحجام الأصص وطريقة العناية وحدود توصيل النباتات.","Document pot sizes, care requirements and live-plant delivery limits."],
 perfume:["اعرض حجم العبوة وطبيعة الرائحة والبدائل من غير ادعاء غير مثبت.","Describe bottle size, scent characteristics and available variants."],
 food:["خطّط لعرض المكونات ومناطق التوصيل ومواعيد تحضير الطلب.","Plan ingredient details, delivery zones and order preparation times."],
 books:["نظّم الكتب حسب المؤلف والتصنيف والطبعة وحالة التوفر.","Organize books by author, genre, edition and availability."],
 pets:["حدّد نوع الحيوان والاستخدام وحجم العبوة في بطاقات المنتجات.","Show target pet type, intended use and pack size on product pages."],
 digital:["وضّح صيغة الملف وحقوق الاستخدام وطريقة التسليم بعد الطلب.","Clarify formats, usage rights and how buyers receive digital files."],
 auto:["اعرض توافق القطعة مع الموديل وسنة التصنيع قبل الطلب.","Show part compatibility with vehicle models and years before ordering."],
 home:["اعرض الأبعاد والخامات وخيارات الشحن للأدوات المنزلية.","Describe dimensions, materials and shipping options for homewares."],
 general:["ابدأ بتصنيفات واضحة وبحث يساعد العميل وسط المنتجات المتنوعة.","Start with clear categories and a search experience for a varied catalog."],
 tools:["اشرح الاستخدام والمقاسات ومتطلبات الكهرباء أو الملحقات عند الحاجة.","Describe use, dimensions, power requirements and compatible accessories."],
};
export const storeSectorSlugs=sectors.filter(s=>Object.hasOwn(guides,s.id)).map(s=>s.id);
export function storeSector(locale:Locale,slug:string){
 const data=sectors.find(s=>s.id===slug);
 if(!data||!Object.hasOwn(guides,slug))return;
 const ar=locale==="ar",label=ar?data.ar:data.en,guidance=guides[slug][ar?0:1],designs=themes.filter(t=>t.sector===slug);
 if(!designs.length)return;
 const title=ar?"تصميم متجر إلكتروني لقطاع "+label:label+" e-commerce store design";
 const description=ar?"شاهد تصميمات متجر "+label+" على ATSH AI، وجرّب عرض المنتجات وسلة تسوق تجريبية قبل طلب متجرك.":"Explore "+label.toLowerCase()+" store layouts from ATSH AI and try a sample storefront and cart before requesting development.";
 return {title,description,label,guidance,designs};
}
export function storeSectorMetadata(locale:Locale,slug:string){
 const sector=storeSector(locale,slug);
 const p="/stores/sectors/"+slug;
 return sector?pageMetadata(locale,localPath(locale,p),sector.title,sector.description,localPath(locale==="ar"?"en":"ar",p)):noIndex;
}
