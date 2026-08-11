// Node module load hook: inject import.meta.env polyfill at the top of every module.
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  // Source can be string, ArrayBuffer, or TypedArray
  let src = result.source;
  if (!src) return result;
  if (src instanceof Uint8Array || src instanceof ArrayBuffer) {
    src = new TextDecoder().decode(src);
  }
  if (typeof src === 'string' && src.includes('VITE_API_BASE')) {
    const polyfill = `import.meta.env ||= Object.create(null);import.meta.env.VITE_API_BASE ||= '/api/v1';import.meta.env.MODE ||= 'test';import.meta.env.DEV ||= false;import.meta.env.PROD ||= false;\n`;
    return { ...result, source: polyfill + src };
  }
  return result;
}
