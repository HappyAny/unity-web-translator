// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
export function createFontReader({ url, fetch: fetchFile = globalThis.fetch, maxBytes = 12000000 }) {
  let loading;
  return async payload => {
    const offset = payload?.offset;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > maxBytes || offset % 65536) throw new Error('Invalid font chunk');
    loading ||= Promise.resolve().then(async () => {
      const response = await fetchFile(url);
      if (!response.ok) throw new Error('Bundled font unavailable');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length < 1000 || bytes.length > maxBytes) throw new Error('Bundled font size limit');
      return bytes;
    }).catch(error => { loading = null; throw error; });
    const bytes = await loading;
    if (offset >= bytes.length) throw new Error('Font chunk outside file');
    let binary = ''; for (const value of bytes.subarray(offset, offset + 65536)) binary += String.fromCharCode(value);
    return { offset, total: bytes.length, data: btoa(binary) };
  };
}
