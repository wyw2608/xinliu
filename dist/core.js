export const CATEGORIES = [
  {id:'all',name:'全部内容',symbol:'◫'}, {id:'affairs',name:'时政',symbol:'◎'},
  {id:'ai',name:'AI',symbol:'✳'}, {id:'society',name:'社会热点',symbol:'◈'}, {id:'arts',name:'艺术',symbol:'◒'},
  {id:'city',name:'城市介绍',symbol:'⌁'}
];
export function readingMinutes(stories) {
  const text=stories.map(s=>[s.title,s.summary,...s.paragraphs,...s.perspectives.map(p=>p.label+p.text),s.uncertainty].join('')).join('');
  const units=(text.match(/\p{Script=Han}/gu)||[]).length+(text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[]).length;
  return Math.max(1,Math.ceil(units/350));
}
export function selectStories(stories,{category='all',query='',unread=false,savedOnly=false,readIds=[],savedIds=[]}={}) {
  const q=query.trim().toLocaleLowerCase('zh-CN');
  return stories.filter(s=>(category==='all'||s.section===category)&&(!unread||!readIds.includes(s.id))&&
    (!savedOnly||savedIds.includes(s.id))&&(!q||[s.title,s.summary,...s.paragraphs,...s.perspectives.map(p=>p.text)].join(' ').toLocaleLowerCase('zh-CN').includes(q)));
}
export function safeLoad(storage,key,fallback) {try {return JSON.parse(storage.getItem(key))??fallback;}catch{return fallback;}}
export function validIds(ids,stories) {return Array.isArray(ids)?[...new Set(ids.filter(id=>typeof id==='string'&&stories.some(s=>s.id===id)))]:[];}
export function escapeHtml(text) {return String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
export function safeSourceUrl(url) {try {const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function editionEntry(catalog,date) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
  return catalog?.editions?.find(e=>e.date===date&&e.path===`./editions/${date}.json`)||null;
}
export function readingState(stored,date,stories) {
  const entry=stored?.editions?.[date]||{};
  return {readIds:validIds(entry.readIds,stories),savedIds:validIds(entry.savedIds,stories)};
}
export function safeImagePath(path) {return /^\.\/assets\/[a-zA-Z0-9_/-]+\.(?:jpg|jpeg|png|webp)$/.test(path||'')?path:null;}
