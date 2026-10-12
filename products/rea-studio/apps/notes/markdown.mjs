/** Small safe Markdown subset. Parsing emits text, never HTML. */
export function inlineTokens(text) {
  // Precompute closing markers so malformed repeated openers cannot cause
  // quadratic regex backtracking (for example 200,000 unmatched brackets).
  const next = {};
  for (const delimiter of ['`', '**', '*', '](', ')', '\n']) {
    const positions = new Uint32Array(text.length + 1); let nearest = text.length; positions[text.length] = nearest;
    for (let at = text.length - 1; at >= 0; at--) { if (text.startsWith(delimiter, at)) nearest = at; positions[at] = nearest; }
    next[delimiter] = positions;
  }
  const tokens = []; let at = 0, plain = 0;
  function append(token, end) { if (at > plain) tokens.push({ type: 'text', text: text.slice(plain, at) }); tokens.push(token); at = plain = end; }
  while (at < text.length) {
    const marker = text[at] === '`' ? '`' : text.startsWith('**', at) ? '**' : text[at] === '*' ? '*' : null;
    if (marker) {
      const close = next[marker][at + marker.length], newline = next['\n'][at];
      if (close > at + marker.length && close < newline) { append({ type: marker === '`' ? 'code' : marker === '**' ? 'strong' : 'em', text: text.slice(at + marker.length, close) }, close + marker.length); continue; }
    }
    if (text[at] === '[') {
      const close = next[']('][at + 1], end = close < text.length ? next[')'][close + 2] : text.length, newline = next['\n'][at];
      if (close > at + 1 && end < newline && end < text.length) {
        const raw = text.slice(close + 2, end), internal = /^:\/([a-f0-9]{32})$/i.exec(raw); let url = null;
        if (raw && !/\s/.test(raw)) try { const parsed = new URL(raw); if (['https:', 'http:', 'mailto:'].includes(parsed.protocol)) url = parsed.href; } catch { /* Invalid links stay literal. */ }
        append(internal ? { type: 'internal-link', text: text.slice(at + 1, close), id: internal[1].toLowerCase() } : url ? { type: 'link', text: text.slice(at + 1, close), url } : { type: 'text', text: text.slice(at, end + 1) }, end + 1); continue;
      }
    }
    at++;
  }
  if (plain < text.length) tokens.push({ type: 'text', text: text.slice(plain) });
  return tokens;
}
export function markdownBlocks(markdown) {
  const lines = String(markdown).replaceAll('\r\n', '\n').split('\n'), blocks = [];
  let code = null, paragraph = [], list = null;
  function flushParagraph() { if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join('\n') }); paragraph = []; }
  function flushList() { if (list) blocks.push(list); list = null; }
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      flushParagraph(); flushList();
      if (code) { blocks.push({ type: 'code', text: code.join('\n') }); code = null; } else code = [];
      continue;
    }
    if (code) { code.push(line); continue; }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line), item = /^\s*(?:([-*+])|\d+\.)\s+(.+)$/.exec(line);
    if (!line.trim()) { flushParagraph(); flushList(); }
    else if (heading) { flushParagraph(); flushList(); blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] }); }
    else if (/^\s*(?:---+|\*\*\*+)\s*$/.test(line)) { flushParagraph(); flushList(); blocks.push({ type: 'rule' }); }
    else if (item) { flushParagraph(); const ordered = !item[1]; if (list && list.ordered !== ordered) flushList(); if (!list) list = { type: 'list', ordered, items: [] }; list.items.push(item[2]); }
    else if (/^>\s?/.test(line)) { flushParagraph(); flushList(); blocks.push({ type: 'quote', text: line.replace(/^>\s?/, '') }); }
    else { flushList(); paragraph.push(line); }
  }
  flushParagraph(); flushList(); if (code) blocks.push({ type: 'code', text: code.join('\n') });
  return blocks;
}
export function renderMarkdown(container, markdown, { onInternalLink } = {}) {
  container.replaceChildren();
  function inline(parent, text) {
    for (const token of inlineTokens(text)) {
      if (token.type === 'text') parent.append(document.createTextNode(token.text));
      else { const node = document.createElement({ strong: 'strong', em: 'em', code: 'code', link: 'a', 'internal-link': 'button' }[token.type]); node.textContent = token.text; if (token.type === 'link') { node.href = token.url; node.target = '_blank'; node.rel = 'noopener noreferrer'; } if (token.type === 'internal-link') { node.type = 'button'; node.className = 'button'; node.setAttribute('aria-label', `Open local note or attachment: ${token.text}`); node.disabled = !onInternalLink; node.onclick = () => onInternalLink?.(token.id); } parent.append(node); }
    }
  }
  for (const block of markdownBlocks(markdown)) {
    const node = document.createElement({ paragraph: 'p', heading: `h${block.level}`, code: 'pre', list: block.ordered ? 'ol' : 'ul', quote: 'blockquote', rule: 'hr' }[block.type]);
    if (block.type === 'code') node.textContent = block.text;
    else if (block.type === 'list') for (const item of block.items) { const li = document.createElement('li'); inline(li, item); node.append(li); }
    else if (block.text !== undefined) inline(node, block.text);
    container.append(node);
  }
}
