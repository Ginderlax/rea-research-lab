function node(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function field(parent,label,value = '',type = 'text') { const labelNode = node('label',label), input = type === 'textarea' ? node('textarea') : node('input'); if (type !== 'textarea') input.type = type; input.value = value; labelNode.append(input); parent.append(labelNode); return input; }
export async function render(root,api) {
  root.replaceChildren(); root.append(node('h2','REA Archive'),node('p','Create, inspect, verify and extract real ZIP files inside this application workspace. Existing files and extraction folders are never replaced.','muted'));
  const status = node('p','', 'status'); root.append(status);
  function button(parent,label,fn) { const b = node('button',label,'button'); b.type = 'button'; b.addEventListener('click',async () => { b.disabled = true; status.textContent = 'Working…'; try { await fn(); status.textContent = 'Done.'; } catch (error) { status.textContent = error.message; } finally { b.disabled = false; } }); parent.append(b); }
  const sample = node('section',undefined,'card'); sample.append(node('h3','Create a workspace file')); root.append(sample);
  const filename = field(sample,'Workspace file path','archive/source/hello.txt'), text = field(sample,'Text content','Hello from REA Archive.','textarea');
  button(sample,'Create file',async () => { const result = await api('putFile',{ path: filename.value, content: text.value }); filename.value = result.path; });
  const create = node('section',undefined,'card'); create.append(node('h3','Create ZIP')); root.append(create);
  const source = field(create,'Source folder','archive/source'), output = field(create,'New ZIP path','archive/hello.zip');
  const compressionLabel = node('label','Compression'), compression = node('select'); for (const value of ['deflate','store']) { const option = node('option',value); option.value = value; compression.append(option); } compressionLabel.append(compression); create.append(compressionLabel);
  const created = node('p','', 'status'); create.append(created);
  button(create,'Create ZIP',async () => { const result = await api('create',{ source: source.value, output: output.value, compression: compression.value }); created.textContent = `${result.entries} entries · ${result.originalBytes} input bytes → ${result.bytes} ZIP bytes`; archivePath.value = result.path; });
  const inspect = node('section',undefined,'card'); inspect.append(node('h3','Inspect and test ZIP')); root.append(inspect);
  const archivePath = field(inspect,'ZIP path','archive/hello.zip'), listing = node('div'); inspect.append(listing);
  button(inspect,'List and verify every entry',async () => {
    const result = await api('list',{ path: archivePath.value }); listing.replaceChildren(node('p',`CRC and size checks passed for ${result.entries.length} entries.`));
    const table = node('table'), head = node('tr'); for (const title of ['Path','Bytes','Stored bytes','Method','CRC-32']) head.append(node('th',title)); table.append(head);
    for (const entry of result.entries) { const row = node('tr'); for (const value of [entry.name,entry.size,entry.compressedSize,entry.method,entry.crc32]) row.append(node('td',String(value))); table.append(row); } listing.append(table);
  });
  const extract = node('section',undefined,'card'); extract.append(node('h3','Extract to a new folder')); root.append(extract);
  const destination = field(extract,'New destination folder','archive/restored'), confirm = field(extract,'Confirm extraction','','checkbox'), result = node('p','', 'status'); extract.append(result);
  button(extract,'Verify and extract',async () => { const value = await api('extract',{ path: archivePath.value, destination: destination.value, confirm: confirm.checked }); result.textContent = `${value.extracted} entries extracted to ${value.destination}.`; });
}
