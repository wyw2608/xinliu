import test from 'node:test';
import assert from 'node:assert/strict';
import {readingMinutes,selectStories,safeLoad,validIds,escapeHtml,safeSourceUrl,editionEntry,readingState,safeImagePath} from '../dist/core.js';
import {EDITION} from '../dist/edition.js';
import {readFileSync,existsSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../dist/editions/index.json',import.meta.url),'utf8'));
test('reader startup controls exist in the published page shell',()=>{
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  const dynamic=new Set(['mark-read','reader-save','reader-sources']);
  for(const [,id] of app.matchAll(/\$\('([^']+)'\)/g))if(!dynamic.has(id))assert.ok(html.includes(`id="${id}"`),`missing page control: ${id}`);
});

test('today has eight news stories and one sourced city with licensed local photos',()=>{
  assert.equal(EDITION.date,catalog.latest);assert.equal(EDITION.demo,false);assert.equal(EDITION.stories.length,9);
  assert.equal(new Set(EDITION.stories.map(s=>s.id)).size,9);
  assert.deepEqual([...new Set(EDITION.stories.map(s=>s.section))].sort(),['affairs','ai','arts','city','society']);
  assert.equal(EDITION.stories.filter(s=>s.region==='中国').length,4);
  assert.equal(EDITION.stories.filter(s=>s.region==='国际').length,4);
  assert.equal(new Set(EDITION.stories.flatMap(s=>s.sources.map(src=>src.id))).size,EDITION.sourceCount);
  assert.equal(EDITION.generation.automatedDaily,false);
  for(const s of EDITION.stories){
    const ids=new Set(s.sources.map(src=>src.id));
    assert.equal(s.aiAssisted,true);assert.equal(s.review.status,'ai_source_checked');assert.equal(s.review.reviewer,null);
    assert.ok(s.freshness&&s.eventDate);assert.equal(s.paragraphSources.length,s.paragraphs.length);
    for(const refs of [...s.paragraphSources,...s.perspectives.map(p=>p.sourceIds)])assert.ok(refs.every(id=>ids.has(id)));
    for(const src of s.sources){assert.equal(src.sourceType,'primary');assert.ok(safeSourceUrl(src.url));assert.ok(!src.url.includes('example.org'));assert.ok(src.retrievedAt);}
  }
  const city=EDITION.stories.find(s=>s.section==='city');assert.equal(city.city.englishName,'Bergen');assert.equal(city.images.length,2);
  for(const image of city.images){assert.ok(safeImagePath(image.src));assert.ok(existsSync(new URL('../dist/'+image.src,import.meta.url)));assert.ok(image.author&&image.alt&&image.license&&safeSourceUrl(image.sourceUrl)&&safeSourceUrl(image.licenseUrl));}
  assert.ok(readingMinutes(EDITION.stories)>1);
});
test('category, query, unread and saved filters compose',()=>{
  const stories=EDITION.stories;
  assert.equal(selectStories(stories,{category:'ai'}).length,2);
  assert.equal(selectStories(stories,{query:'十月制造业景气回落'}).length,1);
  assert.equal(selectStories(stories,{category:'ai',savedOnly:true,savedIds:[stories[2].id]}).length,1);
  assert.equal(selectStories(stories,{category:'ai',savedOnly:true,savedIds:[stories[2].id],unread:true,readIds:[stories[2].id]}).length,0);
  assert.equal(selectStories(stories,{query:'不存在的关键词'}).length,0);
});
test('date selection only opens published snapshots and preserves the previous edition',()=>{
  for(const item of catalog.editions){assert.ok(editionEntry(catalog,item.date));const data=JSON.parse(readFileSync(new URL('../dist/'+item.path,import.meta.url),'utf8'));assert.equal(data.date,item.date);assert.equal(data.issueNumber,item.issueNumber);}
  const old=JSON.parse(readFileSync(new URL('../dist/editions/2026-10-30.json',import.meta.url),'utf8'));assert.equal(old.stories.length,8);assert.equal(old.stories[0].id,'20261030-policy-ai-work');
  assert.equal(editionEntry(catalog,'2026-11-01'),null);assert.equal(editionEntry(catalog,'../../README.md'),null);assert.equal(editionEntry({editions:[{date:'2026-10-31',path:'https://example.org/'}]},'2026-10-31'),null);
});
test('reading and saved records stay separate across dates',()=>{
  const id=EDITION.stories[0].id,stored={editions:{'2026-10-31':{readIds:[id],savedIds:[id]},'2026-10-30':{readIds:['yesterday']}}};
  assert.deepEqual(readingState(stored,'2026-10-31',EDITION.stories),{readIds:[id],savedIds:[id]});assert.deepEqual(readingState(stored,'2026-10-30',EDITION.stories),{readIds:[],savedIds:[]});assert.deepEqual(readingState(null,'unknown',EDITION.stories),{readIds:[],savedIds:[]});
});
test('photos cannot load from remote tracking endpoints or arbitrary paths',()=>{assert.equal(safeImagePath('https://example.org/pixel.jpg'),null);assert.equal(safeImagePath('./assets/../../secret.jpg'),null);assert.equal(safeImagePath('data:image/png;base64,abc'),null);});
test('unknown and malformed persisted ids cannot distort progress',()=>{
  const id=EDITION.stories[0].id;
  assert.deepEqual(validIds([null,42,'unknown',id,id],EDITION.stories),[id]);
  assert.deepEqual(validIds({},EDITION.stories),[]);
});
test('disabled or corrupted browser storage is safe',()=>{
  assert.deepEqual(safeLoad(null,'key',{}),{});
  assert.deepEqual(safeLoad({getItem(){throw new Error('denied');}},'key',[]),[]);
  assert.deepEqual(safeLoad({getItem(){return '{bad';}},'key',[]),[]);
});
test('text is escaped and script/credentialed source links are rejected',()=>{
  assert.equal(escapeHtml('<script>"&\''),'&lt;script&gt;&quot;&amp;&#39;');
  assert.equal(safeSourceUrl('javascript:alert(1)'),null);
  assert.equal(safeSourceUrl('https://user:pass@example.org'),null);
  assert.equal(safeSourceUrl('http://example.org'),null);
  assert.equal(safeSourceUrl('https://example.org/'),'https://example.org/');
});
