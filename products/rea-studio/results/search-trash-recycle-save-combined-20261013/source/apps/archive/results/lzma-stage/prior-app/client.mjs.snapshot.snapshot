function node(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function field(parent,label,value = '',type = 'text') { const labelNode = node('label',label), input = type === 'textarea' ? node('textarea') : node('input'); if (type !== 'textarea') input.type = type; input.value = value; labelNode.append(input); parent.append(labelNode); return input; }
export async function render(root,api) {
  root.replaceChildren(); root.append(node('h2','REA Archive'),node('p','Create, inspect, verify and extract ZIP, 7Z, TAR, TAR.GZ, GZIP, Zstandard and TAR.ZST files inside this application workspace. Existing files and extraction folders are never replaced.','muted'));
  const status = node('p','', 'status'); root.append(status);
  function button(parent,label,fn) { const b = node('button',label,'button'); b.type = 'button'; b.addEventListener('click',async () => { b.disabled = true; status.textContent = 'Working…'; try { await fn(); status.textContent = 'Done.'; } catch (error) { status.textContent = error.message; } finally { b.disabled = false; } }); parent.append(b); }
  const sample = node('section',undefined,'card'); sample.append(node('h3','Create a workspace file')); root.append(sample);
  const filename = field(sample,'Workspace file path','archive/source/hello.txt'), text = field(sample,'Text content','Hello from REA Archive.','textarea');
  button(sample,'Create file',async () => { const result = await api('putFile',{ path: filename.value, content: text.value }); filename.value = result.path; });
  const create = node('section',undefined,'card'); create.append(node('h3','Create archive')); root.append(create);
  const formatLabel = node('label','Archive format'), format = node('select'); for (const [value, label] of [['zip','ZIP'],['sevenzip','7Z'],['tar','TAR'],['tgz','TAR.GZ'],['gzip','GZIP (one file)'],['zstd','Zstandard (one file)'],['tzst','TAR.ZST']]) { const option = node('option',label); option.value = value; format.append(option); } formatLabel.append(format); create.append(formatLabel);
  const source = field(create,'Source folder (one file for GZIP or Zstandard)','archive/source'), output = field(create,'New archive path','archive/hello.zip');
  const compressionLabel = node('label','Compression'), compression = node('select'); compressionLabel.append(compression); create.append(compressionLabel);
  const level = field(create,'Compression level (0–9)','6','number'); level.min = '0'; level.max = '9';
  const zip64 = field(create,'Use ZIP64 layout','','checkbox'), comment = field(create,'Archive comment','');
  const solid = field(create,'Compress 7Z files together (solid archive)','','checkbox');
  create.append(node('p','Zstandard compresses one file without its name or dates; extraction uses the archive basename. Choose TAR.ZST to preserve multiple paths and modification dates.','muted'));
  create.append(node('p','7Z supports DEFLATE and uncompressed store. Archives using compressed LZMA or LZMA2, including the usual 7-Zip defaults, cannot be opened yet.','muted'));
  function compressionControls() {
    const previous = compression.value; compression.replaceChildren();
    for (const [value, label] of [['deflate','DEFLATE'],['store','Store (uncompressed)'], ...(format.value === 'zip' ? [['zstd','Zstandard']] : [])]) { const option = node('option',label); option.value = value; compression.append(option); }
    compression.value = [...compression.options].some(o => o.value === previous) ? previous : 'deflate';
    const zstd = ['zstd','tzst'].includes(format.value) || format.value === 'zip' && compression.value === 'zstd';
    level.min = zstd ? '1' : '0'; level.max = zstd ? '19' : '9'; level.value = zstd ? '3' : '6';
    level.parentNode.firstChild.textContent = zstd ? 'Compression level (1–19)' : 'Compression level (0–9)';
    compression.disabled = !['zip','sevenzip'].includes(format.value); zip64.disabled = format.value !== 'zip'; solid.disabled = format.value !== 'sevenzip';
    level.disabled = format.value === 'tar' || ['zip','sevenzip'].includes(format.value) && compression.value === 'store'; comment.disabled = ['sevenzip','tar','tgz','zstd','tzst'].includes(format.value);
  }
  format.addEventListener('change', () => { output.value = output.value.replace(/\.(?:tar\.gz|tar\.zst|tgz|tzst|zip|7z|tar|gz|zst)$/i, '') + ({ zip: '.zip', sevenzip: '.7z', tar: '.tar', tgz: '.tar.gz', gzip: '.gz', zstd: '.zst', tzst: '.tar.zst' })[format.value]; compressionControls(); });
  compression.addEventListener('change', compressionControls);
  compressionControls();
  const created = node('p','', 'status'); create.append(created);
  button(create,'Create archive',async () => { const result = await api('create',{ source: source.value, output: output.value, format: format.value, compression: compression.value, level: Number(level.value), zip64: zip64.checked, solid: solid.checked, comment: comment.value }); created.textContent = `${result.entries} entries · ${result.originalBytes} input bytes → ${result.bytes} ${result.format === 'sevenzip' ? '7Z' : result.format.toUpperCase()} bytes`; archivePath.value = result.path; });
  const inspect = node('section',undefined,'card'); inspect.append(node('h3','Inspect and test archive')); root.append(inspect);
  const archivePath = field(inspect,'Archive path','archive/hello.zip'), listing = node('div'); inspect.append(listing);
  button(inspect,'List and verify every entry',async () => {
    const result = await api('list',{ path: archivePath.value }), label = result.format === 'sevenzip' ? '7Z' : result.format.toUpperCase(); listing.replaceChildren(node('p',`${label} integrity and size checks passed for ${result.entries.length} entries. TAR verifies header checksums; ZIP and GZIP verify content CRC. 7Z verifies content CRC when recorded. Zstandard verifies content checksums when present.`));
    const table = node('table'), head = node('tr'); for (const title of ['Path','Bytes','Stored bytes','Method','Layout','Modified','CRC-32']) head.append(node('th',title)); table.append(head);
    for (const entry of result.entries) { const row = node('tr'); for (const value of [entry.name,entry.size,entry.compressedSize ?? (entry.solid ? 'Shared solid block' : ''),entry.method,entry.zip64 ? 'ZIP64' : entry.solid ? '7Z solid' : label,entry.modifiedAt ?? '',entry.crc32 ?? 'Not recorded']) row.append(node('td',String(value))); table.append(row); } listing.append(table);
  });
  const extract = node('section',undefined,'card'); extract.append(node('h3','Extract to a new folder')); root.append(extract);
  const destination = field(extract,'New destination folder','archive/restored'), confirm = field(extract,'Confirm extraction','','checkbox'), result = node('p','', 'status'); extract.append(result);
  button(extract,'Verify and extract',async () => { const value = await api('extract',{ path: archivePath.value, destination: destination.value, confirm: confirm.checked }); result.textContent = `${value.extracted} entries extracted to ${value.destination}.`; });
}
