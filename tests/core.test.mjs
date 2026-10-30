import test from 'node:test';
import assert from 'node:assert/strict';
import {readingMinutes,selectStories,safeLoad,validIds,escapeHtml,safeSourceUrl} from '../dist/core.js';
import {EDITION} from '../dist/edition.js';

test('sample is explicitly demo with four populated sections and eight unique stories',()=>{
  assert.equal(EDITION.demo,true);assert.equal(EDITION.stories.length,8);
  assert.equal(new Set(EDITION.stories.map(s=>s.id)).size,8);
  assert.deepEqual([...new Set(EDITION.stories.map(s=>s.section))].sort(),['affairs','ai','arts','society']);
  assert.ok(EDITION.notice.includes('不是当日新闻'));assert.ok(readingMinutes(EDITION.stories)<18);
});
test('category, query, unread and saved filters compose',()=>{
  const stories=EDITION.stories;
  assert.equal(selectStories(stories,{category:'ai'}).length,2);
  assert.equal(selectStories(stories,{query:'模型评测'}).length,1);
  assert.equal(selectStories(stories,{category:'ai',savedOnly:true,savedIds:[stories[2].id]}).length,1);
  assert.equal(selectStories(stories,{category:'ai',savedOnly:true,savedIds:[stories[2].id],unread:true,readIds:[stories[2].id]}).length,0);
  assert.equal(selectStories(stories,{query:'不存在的关键词'}).length,0);
});
test('unknown and malformed persisted ids cannot distort progress',()=>{
  assert.deepEqual(validIds([null,42,'unknown','demo-01','demo-01'],EDITION.stories),['demo-01']);
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
