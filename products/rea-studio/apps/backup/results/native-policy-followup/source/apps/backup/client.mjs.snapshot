function node(tag,text,className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function field(parent,label,value = '',type = 'text') { const wrapper = node('label',label), input = type === 'textarea' ? node('textarea') : node('input'); if (type !== 'textarea') input.type = type; input.value = value; wrapper.append(input); parent.append(wrapper); return input; }
export async function render(root,api) {
  root.replaceChildren(); root.append(node('h2','REA Backup'),node('p','Choose application snapshots below, or an encrypted restic repository. Restore always creates a new folder. Application snapshots are stored without encryption.','muted'));
  const status = node('p','', 'status'); root.append(status);
  function button(parent,label,fn) { const b = node('button',label,'button'); b.type = 'button'; b.addEventListener('click',async () => { b.disabled = true; status.textContent = 'Working…'; try { await fn(); status.textContent = 'Done.'; } catch (error) { status.textContent = error.message; } finally { b.disabled = false; } }); parent.append(b); }
  const sample = node('section',undefined,'card'); sample.append(node('h3','Create a workspace file')); root.append(sample);
  const file = field(sample,'New file path','backup/source/hello.txt'), contents = field(sample,'Text content','Hello from REA Backup.','textarea'); button(sample,'Create file',async () => { await api('putFile',{ path: file.value, content: contents.value }); });
  const capture = node('section',undefined,'card'); capture.append(node('h3','Create snapshot')); root.append(capture);
  const source = field(capture,'Source folder','backup/source'), label = field(capture,'Snapshot label','First snapshot'); const captured = node('p','', 'status'); capture.append(captured);
  button(capture,'Save snapshot',async () => { const value = await api('snapshot',{ source: source.value, label: label.value }); captured.textContent = `${value.files} files · ${value.bytes} bytes · ${value.id}`; selected.value = value.id; await refresh(); });
  const browse = node('section',undefined,'card'); browse.append(node('h3','Snapshots')); root.append(browse); const listing = node('div'); browse.append(listing);
  const restore = node('section',undefined,'card'); restore.append(node('h3','Check and restore')); root.append(restore);
  const selected = field(restore,'Snapshot ID'), destination = field(restore,'New restore folder','backup/restored'), confirm = field(restore,'Confirm restore','','checkbox'), result = node('p','', 'status'); restore.append(result);
  button(restore,'Verify snapshot contents',async () => { const value = await api('check',{ id: selected.value }); result.textContent = `${value.files} files verified · ${value.uniqueChunks} unique chunks · ${value.checkedBytes} bytes.`; });
  button(restore,'Restore to new folder',async () => { const value = await api('restore',{ id: selected.value, destination: destination.value, confirm: confirm.checked }); result.textContent = `${value.restored} files restored to ${value.destination}.`; });
  async function refresh() {
    const { snapshots } = await api('list',{}); listing.replaceChildren();
    if (!snapshots.length) listing.append(node('p','No saved snapshots.','muted'));
    for (const snapshot of snapshots) {
      const row = node('section',undefined,'card'); row.append(node('strong',snapshot.label || snapshot.source),node('p',`${snapshot.createdAt} · ${snapshot.files} files · ${snapshot.bytes} bytes`));
      button(row,'Select snapshot',async () => { selected.value = snapshot.id; result.textContent = `Selected ${snapshot.id}`; }); listing.append(row);
    }
  }
  button(browse,'Refresh snapshots',refresh);
  const retention = node('section',undefined,'card'); retention.append(node('h3','Retention')); root.append(retention);
  const keep = field(retention,'Number of newest snapshots to keep','5','number'), confirmed = field(retention,'Confirm removal of listed application backups','','checkbox'), preview = node('p','', 'status'); retention.append(preview); let plan;
  button(retention,'Preview retention',async () => { plan = await api('planRetention',{ keepLast: Number(keep.value) }); preview.textContent = `Keep ${plan.keep.length} snapshots; remove ${plan.remove.length} older snapshots and ${plan.unusedChunks.length} unused chunks.`; });
  button(retention,'Apply retention',async () => { if (!plan) throw new Error('Preview retention first.'); const value = await api('prune',{ keepLast: Number(keep.value), token: plan.token, confirm: confirmed.checked }); preview.textContent = `Removed ${value.removedSnapshots} snapshots and ${value.removedChunks} unused chunks.`; plan = null; await refresh(); });
  const native = node('section',undefined,'card'); native.append(node('h3','Encrypted restic repositories'),node('p','Create or open a local restic repository inside this workspace. Enter its password for each operation; it is cleared afterward and is never saved by the app. Keep your own copy of the password.','muted')); root.append(native);
  const nativeRepository = field(native,'Restic repository folder','backup/restic'), nativePassword = field(native,'Repository password','','password'); nativePassword.autocomplete = 'off'; nativePassword.spellcheck = false;
  const nativeVersion = field(native,'New repository format version (1 or 2)','1','number'); nativeVersion.min = '1'; nativeVersion.max = '2';
  const compressionLabel = node('label','Compression for new snapshot data'), nativeCompression = node('select');
  for (const [value,label] of [['auto','Automatic'],['off','Off for file data'],['fastest','Fastest'],['better','Better compression'],['max','Maximum compression']]) { const option = node('option',label); option.value = value; nativeCompression.append(option); }
  compressionLabel.append(nativeCompression); native.append(compressionLabel,node('p','Compression requires repository format 2. Existing file data is reused; choosing a mode does not rewrite earlier backups.','muted'));
  const nativeSource = field(native,'Source folder','backup/source'), nativeLabel = field(native,'Snapshot label',''), nativeID = field(native,'Restic snapshot ID'), nativeDestination = field(native,'New restore folder','backup/restic-restored'), nativeConfirm = field(native,'Confirm restore','','checkbox');
  const nativeResult = node('pre',''); native.append(nativeResult);
  async function nativeCall(action,input = {}) {
    try { const value = await api(action,{ repository:nativeRepository.value,password:nativePassword.value,...input }); nativeResult.textContent = JSON.stringify(value,null,2); return value; }
    finally { nativePassword.value = ''; }
  }
  button(native,'Create encrypted repository',() => nativeCall('nativeInit',{ version:Number(nativeVersion.value) }));
  button(native,'Open repository',() => nativeCall('nativeInfo'));
  button(native,'List restic snapshots',() => nativeCall('nativeList'));
  button(native,'Save restic snapshot',async () => { const value = await nativeCall('nativeSnapshot',{ source:nativeSource.value,label:nativeLabel.value,compression:nativeCompression.value }); nativeID.value = value.id; });
  button(native,'Inspect restic snapshot',() => nativeCall('nativeInspect',{ id:nativeID.value }));
  button(native,'Verify restic snapshot',() => nativeCall('nativeCheck',{ id:nativeID.value }));
  button(native,'Restore restic snapshot',() => nativeCall('nativeRestore',{ id:nativeID.value,destination:nativeDestination.value,confirm:nativeConfirm.checked }));
  try { await refresh(); } catch (error) { status.textContent = error.message; }
}
