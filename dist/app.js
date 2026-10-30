import { CATEGORIES,readingMinutes,selectStories,safeLoad,validIds,escapeHtml as esc,safeSourceUrl } from './core.js';
import { EDITION } from './edition.js?v=20261030-2';

const $=id=>document.getElementById(id);
const key='xinliu:v1';
let storage;try{storage=window.localStorage;}catch{storage=null;}
const prior=safeLoad(storage,key,{});
const stored=prior&&typeof prior==='object'&&!Array.isArray(prior)?prior:{};
let state={category:'all',query:'',unread:false,savedOnly:false,
  readIds:validIds(stored.readIds,EDITION.stories),savedIds:validIds(stored.savedIds,EDITION.stories),
  fontSize:Number.isInteger(stored.fontSize)&&stored.fontSize>=16&&stored.fontSize<=26?stored.fontSize:19,
  theme:stored.theme==='dark'?'dark':'light'};
let activeStory=null,previousFocus=null,toastTimer;
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
function persist(){try{storage.setItem(key,JSON.stringify({readIds:state.readIds,savedIds:state.savedIds,fontSize:state.fontSize,theme:state.theme}));return true;}catch{toast('浏览器未允许保存；本次操作仅在当前页面有效。');return false;}}
function theme(){document.documentElement.dataset.theme=state.theme;$('theme').setAttribute('aria-label',state.theme==='dark'?'切换浅色模式':'切换深色模式');}
function applyFont(){document.documentElement.style.setProperty('--reader-size',state.fontSize+'px');$('font-down').disabled=state.fontSize<=16;$('font-up').disabled=state.fontSize>=26;}
function categoryName(id){return CATEGORIES.find(c=>c.id===id)?.name||id;}
function card(s,i){const read=state.readIds.includes(s.id),saved=state.savedIds.includes(s.id);return `<article class="story-card ${i===0&&!state.savedOnly&&state.category==='all'&&!state.query&&!state.unread?'featured':''}">
  <div class="card-meta"><span class="section-label">${esc(categoryName(s.section))}</span><span>／</span><span>${esc(s.region||'')} · 约${readingMinutes([s])}分钟</span><span class="card-number">${String(EDITION.stories.indexOf(s)+1).padStart(2,'0')}</span></div>
  <h3 class="story-title"><button type="button" data-read="${esc(s.id)}">${esc(s.title.replace('【演示】',''))}</button></h3>
  <p class="card-summary">${esc(s.summary)}</p>
  <div class="card-footer"><span>${s.sources.length}项${EDITION.demo?'示例':'一手'}资料</span><span class="mini-dot"></span><span>${esc(s.freshness||'资料整理')}</span>${read?'<span class="mini-dot"></span><span class="read-status">✓ 已读</span>':''}<span class="card-arrow" aria-hidden="true">↗</span></div>
  <button class="save-button ${saved?'saved':''}" type="button" data-save="${esc(s.id)}" aria-label="${saved?'取消收藏':'收藏'}：${esc(s.title.replace('【演示】',''))}" aria-pressed="${saved}">${saved?'▣':'▢'}</button></article>`;}
function render(){
  const selected=selectStories(EDITION.stories,state);
  $('categories').innerHTML=CATEGORIES.map(c=>`<button type="button" class="category ${c.id===state.category?'active':''}" data-category="${c.id}" aria-pressed="${c.id===state.category}"><span class="category-symbol" aria-hidden="true">${c.symbol}</span>${c.name}<span class="category-count">${c.id==='all'?EDITION.stories.length:EDITION.stories.filter(s=>s.section===c.id).length}</span></button>`).join('');
  $('cards').innerHTML=selected.map(card).join('');$('empty').hidden=selected.length>0;
  $('list-title').innerHTML=(state.savedOnly?'我的收藏':state.category==='all'?'本期精选':esc(categoryName(state.category)))+' <span>THE BRIEFING</span>';
  $('result-count').textContent=`${selected.length} 篇内容${state.query?' · 搜索“'+state.query+'”':' · 按栏目编排'}`;
  $('empty-title').textContent=state.savedOnly&&state.savedIds.length===0?'把值得再读的内容，留在这里。':'暂时没有匹配的内容';
  $('empty-text').textContent=state.savedOnly&&state.savedIds.length===0?'点击文章右上角的收藏按钮，即可保存到这个浏览器。':'换一个关键词，或试试其他栏目。';
  $('read-count').textContent=state.readIds.length;$('unread-count').textContent=EDITION.stories.length-state.readIds.length;
  $('saved-count').textContent=state.savedIds.length;$('progress-bar').style.width=100*state.readIds.length/EDITION.stories.length+'%';
  $('progress-ring').style.background=`conic-gradient(#647458 ${360*state.readIds.length/EDITION.stories.length}deg, ${state.theme==='dark'?'#4a5745':'#d6dacd'} 0deg)`;
  $('progress-note').textContent=state.readIds.length===EDITION.stories.length?'本期读完了。今天，给自己留一点空白。':state.readIds.length?`已读${state.readIds.length}篇，还剩${EDITION.stories.length-state.readIds.length}篇。按自己的节奏来。`:'从一篇开始，慢慢读。';
  $('end-text').textContent=state.readIds.length===EDITION.stories.length?'本期读完了。明天见。':'阅读有尽头，思考没有。';
  $('nav-edition').classList.toggle('active',!state.savedOnly);$('nav-saved').classList.toggle('active',state.savedOnly);
}
function section(title,body,extra=''){return `<section class="reader-section ${extra}"><h3>${title}</h3>${body}</section>`;}
function citations(ids=[]){return ids.map(id=>`<a href="#source-${esc(id)}" class="source-cite" aria-label="查看来源${esc(id)}">[${esc(id)}]</a>`).join(' ');}
function renderReader(){if(!activeStory)return;const s=activeStory;
  $('reader-content').innerHTML=`<div class="eyebrow"><span class="section-label">${esc(categoryName(s.section))}</span> · ${esc(s.region||'')} · ${esc(s.freshness||'资料整理')} · 约${readingMinutes([s])}分钟</div><h2 id="reader-title">${esc(s.title.replace('【演示】',''))}</h2>
  <p class="reader-meta">本期日期：${esc(EDITION.date)} · 主要资料/事件日期：${esc(s.eventDate||'见来源')}<br>整理更新：${esc(s.updatedAt.replace('T',' ').replace(/\+08:00$/,' UTC+8'))}</p><div class="reader-demo"><strong>${EDITION.demo?'原创演示材料，不是真实新闻。':'AI检索与原创综合 · 非独立采访'}</strong><br>${esc(s.attributionNote||'来源及审核记录为虚构占位。')}</div>
  ${section('01 / 概要',`<p>${esc(s.summary)}</p>`)}
  ${section('02 / 事实与背景',s.paragraphs.map((p,i)=>`<p>${esc(p)} ${citations(s.paragraphSources?.[i]||[])}</p>`).join(''))}
  ${s.perspectives.map(p=>section('03 / '+esc(p.label),`<p>${esc(p.text)} ${citations(p.sourceIds)}</p>${p.sourceIds.length?'':'<p class="evidence">信流分析 · 不是受访者发言</p>'}`,'perspective')).join('')}
  ${section('04 / 尚不确定',`<p>${esc(s.uncertainty)}</p>`)}
  ${section('05 / 原始资料与检索记录',s.sources.map(src=>`<div class="source-item" id="source-${esc(src.id)}"><strong>[${esc(src.id)}] ${esc(src.publisher)}</strong><p>${esc(src.title)}<br>资料日期 ${esc(src.publishedAt||'页面未标注')}<br>检索时间 ${esc(src.retrievedAt)}${src.note?'<br>资料说明：'+esc(src.note):''}</p>${safeSourceUrl(src.url)?`<a href="${esc(safeSourceUrl(src.url))}" target="_blank" rel="noopener noreferrer">阅读原始资料 ↗</a>`:'<span>来源链接不可用</span>'}</div>`).join(''))}
  <div class="reader-actions"><button id="mark-read" type="button">${state.readIds.includes(s.id)?'✓ 已读 · 点击撤销':'读完了，标记已读'}</button><button id="reader-save" type="button">${state.savedIds.includes(s.id)?'▣ 已收藏':'▢ 收藏这篇'}</button></div>`;
  $('mark-read').onclick=()=>{const isRead=state.readIds.includes(s.id);state.readIds=isRead?state.readIds.filter(id=>id!==s.id):[...state.readIds,s.id];persist();render();renderReader();$('mark-read').focus();toast(isRead?'已取消已读标记':'已保存阅读进度。');};
  $('reader-save').onclick=()=>{toggleSave(s.id);renderReader();$('reader-save').focus();};
}
function toggleSave(id){const saved=state.savedIds.includes(id);state.savedIds=saved?state.savedIds.filter(x=>x!==id):[...state.savedIds,id];persist();render();toast(saved?'已取消收藏':'已收藏到这个浏览器。');}
function openReader(id){activeStory=EDITION.stories.find(s=>s.id===id);if(!activeStory)return;previousFocus=document.activeElement;renderReader();$('reader').showModal();$('reader').scrollTop=0;}
function closeReader(){$('reader').close();activeStory=null;if(previousFocus?.isConnected)previousFocus.focus();}
function resetFilters(){state.category='all';state.query='';state.unread=false;state.savedOnly=false;$('unread').checked=false;$('search').value='';render();}
document.addEventListener('click',e=>{const cat=e.target.closest('[data-category]'),read=e.target.closest('[data-read]'),save=e.target.closest('[data-save]');if(cat){state.category=cat.dataset.category;render();}else if(save){toggleSave(save.dataset.save);}else if(read){openReader(read.dataset.read);}});
$('search').addEventListener('input',e=>{state.query=e.target.value;render();});$('unread').addEventListener('change',e=>{state.unread=e.target.checked;render();});
$('nav-edition').onclick=resetFilters;$('nav-saved').onclick=()=>{resetFilters();state.savedOnly=true;render();};$('reset-filters').onclick=resetFilters;
for(const id of ['nav-about','notice-about','editor-about'])$(id).onclick=()=>$('about').showModal();
$('about-close').onclick=()=>$('about').close();$('reader-close').onclick=closeReader;$('reader').addEventListener('cancel',()=>{activeStory=null;});
for(const id of ['reader','about','clear-dialog'])$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();}});
$('font-up').onclick=()=>{state.fontSize=Math.min(26,state.fontSize+1);applyFont();persist();};$('font-down').onclick=()=>{state.fontSize=Math.max(16,state.fontSize-1);applyFont();persist();};
$('theme').onclick=()=>{state.theme=state.theme==='dark'?'light':'dark';theme();render();persist();};
$('clear-data').onclick=()=>$('clear-dialog').showModal();$('clear-cancel').onclick=()=>$('clear-dialog').close();$('clear-confirm').onclick=()=>{let success=true;try{storage.removeItem(key);}catch{success=false;}state.readIds=[];state.savedIds=[];state.fontSize=19;state.theme='light';theme();applyFont();render();$('clear-dialog').close();toast(success?'已清除信流在这个浏览器保存的数据。':'页面记录已重置；浏览器存储不可访问。');};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!document.querySelector('dialog[open]')&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('search').focus();}});
$('edition-date').textContent=EDITION.date.replaceAll('-','.');$('minutes').textContent=readingMinutes(EDITION.stories);
$('reader-total').textContent='/ '+EDITION.stories.length+' 篇';$('issue-label').textContent=EDITION.issueLabel||'简报';$('issue-number').textContent='NO. '+(EDITION.issueNumber||'001');
$('notice-text').textContent=EDITION.notice;theme();applyFont();render();
