import {openDb} from './db.js';
import {Commerce} from './core.js';
const c=new Commerce(openDb(process.env.COMMERCE_DB||'data/commerce.sqlite'));
const {store,token}=c.createStore({name:'دار — DARA',slug:'dara',theme:'furniture-canvas',mode:'copy',shipping:6500});
const m=c.auth(store.slug,token);
const products=[
 ['كرسي ميرا','كراسي','خشب طبيعي وقماش ناعم بتصميم معاصر',159900,'MIRA-01'],
 ['طاولة نور','طاولات','سطح خشبي أنيق مناسب لمساحات المعيشة',279900,'NOUR-01'],
 ['مصباح سكون','إضاءة','إضاءة دافئة بتفاصيل بسيطة',89000,'SOK-01'],
 ['مقعد لينا','كراسي','تصميم مريح ومساحة صغيرة',129000,'LINA-01']
];
for(const [i,[name,category,description,price,sku]] of products.entries()){const {id}=c.product(m,{name,category,description,variants:[{sku,label:'الطبيعي',price,quantity:12}]});c.run('UPDATE products SET image=? WHERE id=?','/assets/'+['chair','table','lamp','stool'][i]+'.svg',id)}
c.design(m,{design:{headline:'بيتٌ يشبهك، بتفاصيل تدوم.',subtitle:'تصاميم هادئة تجمع الخشب الطبيعي والخطوط العصرية. اكتشف تشكيلتنا المختارة.',story:'دار — مساحة للأثاث والديكور الذي يضيف الراحة إلى كل يوم.'}});
console.log('Store: http://localhost:3200/store/dara\nDashboard: http://localhost:3200/manage/dara\nOwner access token: '+token);
