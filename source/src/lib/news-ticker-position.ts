// Ordered, persisted anchors. Unknown and legacy settings always start above the header.
export const newsTickerPositions = [
 {value:"top",label:"أعلى الصفحة — فوق الترويسة"},
 {value:"below_header",label:"أسفل الترويسة"},
 {value:"after_hero",label:"بعد الواجهة الرئيسية"},
 {value:"before_footer",label:"قبل تذييل الصفحة"}
] as const;
export type NewsTickerPosition=typeof newsTickerPositions[number]["value"];
export function normalizeNewsTickerPosition(value:unknown):NewsTickerPosition{
 return newsTickerPositions.find(position=>position.value===value)?.value??"top";
}
