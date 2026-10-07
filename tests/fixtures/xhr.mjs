export class ProgressEvent extends Event {
  constructor(type, values = {}) { super(type); Object.assign(this, { lengthComputable: false, loaded: 0, total: 0 }, values); }
}
export class NativeXHR extends EventTarget {
  static DONE = 4;
  constructor() { super(); this._state = 0; this._status = 0; this._raw = ''; this._url = ''; this.responseType = ''; this.headers = new Map([['content-type', 'application/json'], ['content-length', '100'], ['etag', 'original']]); }
  get readyState() { return this._state; }
  get status() { return this._status; }
  get statusText() { return this._status === 200 ? 'OK' : ''; }
  get responseURL() { return this._url; }
  get responseText() { if (!['', 'text'].includes(this.responseType)) throw new DOMException('Wrong response type', 'InvalidStateError'); return this._state >= 3 ? this._raw : ''; }
  get response() { if (this._state !== 4) return ['', 'text'].includes(this.responseType) ? this.responseText : null; return this.responseType === 'json' ? JSON.parse(this._raw) : this.responseType === 'arraybuffer' ? new TextEncoder().encode(this._raw).buffer : this._raw; }
  open(method, url, async = true) { this.method = method; this._url = new URL(url, 'https://canvas.example.test/view').href; this.async = async; this._state = 1; this.dispatchEvent(new Event('readystatechange')); }
  send(body) { this.body = body; }
  abort() { const wasActive = this._state > 0 && this._state < 4; this._state = 0; this._status = 0; if (wasActive) { this.dispatchEvent(new Event('readystatechange')); this.dispatchEvent(new ProgressEvent('abort')); this.dispatchEvent(new ProgressEvent('loadend')); } }
  getResponseHeader(name) { return this.headers.get(String(name).toLowerCase()) || null; }
  getAllResponseHeaders() { return [...this.headers].map(([key, value]) => key + ': ' + value).join('\r\n') + '\r\n'; }
  respond(raw, status = 200) { this._raw = raw; this._status = status; for (const state of [2, 3, 4]) { this._state = state; this.dispatchEvent(new Event('readystatechange')); } this.dispatchEvent(new ProgressEvent('load', { loaded: raw.length, total: raw.length, lengthComputable: true })); this.dispatchEvent(new ProgressEvent('loadend', { loaded: raw.length, total: raw.length, lengthComputable: true })); }
}
for (const type of ['readystatechange', 'load', 'loadend', 'abort']) Object.defineProperty(NativeXHR.prototype, 'on' + type, { configurable: true,
  get() { return this['_on' + type] || null; }, set(callback) { if (this['_on' + type]) this.removeEventListener(type, this['_on' + type]); this['_on' + type] = callback; if (typeof callback === 'function') this.addEventListener(type, callback); } });
