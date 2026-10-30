import test from 'node:test';
import assert from 'node:assert/strict';
import {readingMinutes,selectStories,safeLoad,validIds,escapeHtml,safeSourceUrl} from '../dist/core.js';
import {EDITION} from '../dist/edition.js';

test('researched edition has four sections, domestic and international coverage, and traceable primary sources',()=>{
  assert.equal(EDITION.demo,false);assert.equal(EDITION.stories.length,8);
  assert.equal(new Set(EDITION.stories.map(s=>s.id)).size,8);
  assert.deepEqual([...new Set(EDITION.stories.map(s=>s.section))].sort(),['affairs','ai','arts','society']);
  assert.equal(EDITION.stories.filter(s=>s.region==='中国').length,4);
  assert.equal(EDITION.stories.filter(s=>s.region==='国际').length,4);
  assert.equal(new Set(EDITION.stories.flatMap(s=>s.sources.map(src=>src.id))).size,19);
  assert.equal(EDITION.generation.automatedDaily,false);
  for(const s of EDITION.stories){
    const ids=new Set(s.sources.map(src=>src.id));
    assert.equal(s.aiAssisted,true);assert.equal(s.review.status,'ai_source_checked');assert.equal(s.review.reviewer,null);
    assert.ok(s.freshness&&s.eventDate&&s.uncertainty);assert.equal(s.paragraphSources.length,s.paragraphs.length);
    for(const refs of [...s.paragraphSources,...s.perspectives.map(p=>p.sourceIds)])assert.ok(refs.every(id=>ids.has(id)));
    for(const src of s.sources){assert.equal(src.sourceType,'primary');assert.ok(safeSourceUrl(src.url));assert.ok(!src.url.includes('example.org'));assert.ok(src.retrievedAt);}
  }
  assert.ok(readingMinutes(EDITION.stories)>=15&&readingMinutes(EDITION.stories)<=22);
});
test('category, query, unread and saved filters compose',()=>{
  const stories=EDITION.stories;
  assert.equal(selectStories(stories,{category:'ai'}).length,2);
  assert.equal(selectStories(stories,{query:'实时语音模型继续更新'}).length,1);
  assert.equal(selectStories(stories,{category:'ai',savedOnly:true,savedIds:[stories[2].id]}).length,1);
  assert.equal(selectStories(stories,{category:'ai',savedOnly:true,savedIds:[stories[2].id],unread:true,readIds:[stories[2].id]}).length,0);
  assert.equal(selectStories(stories,{query:'不存在的关键词'}).length,0);
});
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
