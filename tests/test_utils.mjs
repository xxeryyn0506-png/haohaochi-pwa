import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORIES,STATUSES,escapeHtml,safeUrl,statusLabel,validateEntry} from '../src/utils.js';
const valid={title:' 红烧肉 ',category:'家常菜',status:'want_to_make',source_type:'homemade',source_url:'https://example.com/a',recipe:'',notes:'',merchant_name:'',price_note:''};
test('品类与状态配置可用',()=>{assert(CATEGORIES.length>=5);assert.equal(STATUSES.length,4);assert.equal(statusLabel('eaten'),'吃过');});
test('文字转义防止注入',()=>{assert.equal(escapeHtml('<img src="x">'),'&lt;img src=&quot;x&quot;&gt;');});
test('只允许 http(s) 来源链接',()=>{assert.equal(safeUrl('javascript:alert(1)'),'');assert.equal(safeUrl('file:///etc/passwd'),'');assert.equal(safeUrl('https://example.com/'),'https://example.com/');});
test('表单字段验证及规范化',()=>{let r=validateEntry(valid);assert.equal(r.title,'红烧肉');assert.equal(r.source_url,'https://example.com/a');assert.throws(()=>validateEntry({...valid,title:'  '}));assert.throws(()=>validateEntry({...valid,category:'未知'}));assert.throws(()=>validateEntry({...valid,source_url:'javascript:alert(1)'}));});
