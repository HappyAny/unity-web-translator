import assert from 'node:assert/strict';
import { NativeXHR, ProgressEvent } from './fixtures/xhr.mjs';
globalThis.ProgressEvent = ProgressEvent;
await import('../extension/native-xhr.js');
let release, transforms = 0;
const XHR = globalThis.__UnityTextXHR.create(NativeXHR, { maxBytes: 1024 * 1024,
  plan: meta => meta.method === 'GET' && meta.async !== false && meta.status === 200 && meta.url.includes('/story/') ? {} : null,
  transform: raw => { transforms++; return new Promise(resolve => { release = () => resolve({ changed: 1, text: raw.replace('こんにちは', '你好') }); }); } });
assert.equal(XHR.DONE, 4);
const tick = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
for (const responseType of ['', 'text', 'json', 'arraybuffer']) {
  const xhr = new XHR(), events = [], raw = '{"id":900719925474099312345,"text":"こんにちは"}';
  assert(xhr instanceof NativeXHR); xhr.open('GET', '/story/a.json'); xhr.responseType = responseType;
  xhr.addEventListener('readystatechange', () => { if (xhr.readyState === 4) events.push('done'); });
  xhr.onload = event => { events.push('load'); assert(event.lengthComputable); assert.equal(xhr.status, 200); };
  xhr.addEventListener('loadend', () => events.push('loadend')); xhr.send(); xhr.respond(raw);
  assert.equal(xhr.readyState, 3); assert.deepEqual(events, []); await tick(); release(); await tick();
  assert.equal(xhr.readyState, 4); assert.deepEqual(events, ['done', 'load', 'loadend']);
  const result = responseType === 'arraybuffer' ? new TextDecoder().decode(xhr.response) : responseType === 'json' ? JSON.stringify(xhr.response) : xhr.responseText;
  assert(result.includes('你好')); assert.equal(xhr.responseURL, 'https://canvas.example.test/story/a.json');
  if (responseType === 'arraybuffer' || responseType === 'json') assert.throws(() => xhr.responseText, /Wrong response/);
  assert.equal(xhr.getResponseHeader('Content-Length'), null); assert.equal(xhr.getResponseHeader('ETag'), null); assert(!xhr.getAllResponseHeaders().includes('content-length'));
  xhr.open('GET', '/other.json'); xhr.respond('{"text":"原文です"}'); assert.equal(xhr.readyState, 4); assert.equal(xhr.getResponseHeader('ETag'), 'original');
}
const before = transforms;
for (const [method, url, async] of [['POST', '/story/a.json', true], ['GET', '/other.json', true], ['GET', '/story/a.json', false]]) {
  const xhr = new XHR(), events = []; xhr.open(method, url, async); xhr.onload = () => events.push('load'); xhr.respond('{"text":"こんにちは"}');
  assert.deepEqual(events, ['load']); assert.equal(xhr.responseText, '{"text":"こんにちは"}');
}
assert.equal(transforms, before);
const aborted = new XHR(), abortEvents = []; aborted.open('GET', '/story/a.json'); aborted.onabort = () => abortEvents.push('abort'); aborted.onload = () => abortEvents.push('load'); aborted.onloadend = () => abortEvents.push('loadend');
aborted.respond('{"text":"こんにちは"}'); await tick(); aborted.abort(); assert.equal(aborted.readyState, 0); assert.equal(aborted.status, 0); assert.deepEqual(abortEvents, ['abort', 'loadend']); release(); await tick(); assert.deepEqual(abortEvents, ['abort', 'loadend']);
const reused = new XHR(); reused.open('GET', '/story/a.json'); reused.respond('{"text":"こんにちは"}'); await tick(); const oldRelease = release; reused.open('GET', '/other.json'); reused.respond('{"text":"現在です"}'); oldRelease(); await tick(); assert.equal(reused.responseText, '{"text":"現在です"}');
console.log('Native XHR: async completion ordering, response types, headers, untouched requests, abort and reuse passed.');
