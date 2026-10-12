function node(tag,text,className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function field(parent,label,value = '',type = 'text') { const wrapper = node('label',label), input = type === 'textarea' ? node('textarea') : node('input'); if (type !== 'textarea') input.type = type; input.value = value; wrapper.append(input); parent.append(wrapper); return input; }
export async function render(root,api) {
  root.replaceChildren(); root.append(node('h2','REA Sync'),node('p','Preview SHA-256 differences before copying local folders. Every differing existing file requires a choice. Replaced or removed files are preserved in local sync history.','muted'));
  const status = node('p','', 'status'); root.append(status);
  function button(parent,label,fn) { const b = node('button',label,'button'); b.type = 'button'; b.addEventListener('click',async () => { b.disabled = true; status.textContent = 'Working…'; try { await fn(); status.textContent = 'Done.'; } catch (error) { status.textContent = error.message; } finally { b.disabled = false; } }); parent.append(b); }
  const sample = node('section',undefined,'card'); sample.append(node('h3','Create a workspace file')); root.append(sample);
  const filename = field(sample,'New file path','sync/source/hello.txt'), contents = field(sample,'Text content','Hello from REA Sync.','textarea'); button(sample,'Create file',async () => { await api('putFile',{ path: filename.value, content: contents.value }); });
  const configuration = node('section',undefined,'card'); configuration.append(node('h3','Compare folders')); root.append(configuration);
  const source = field(configuration,'Source folder','sync/source'), target = field(configuration,'Target folder','sync/target');
  const modeLabel = node('label','Mode'), mode = node('select');
  for (const [value,title] of [['copy','Copy source to target; keep target extras'],['mirror','Mirror source; explicitly approve target removals'],['twoWay','Copy additions in both directions; resolve differing files']]) { const option = node('option',title); option.value = value; mode.append(option); } modeLabel.append(mode); configuration.append(modeLabel);
  const preview = node('section',undefined,'card'); preview.append(node('h3','Plan')); root.append(preview); const detail = node('div'); preview.append(detail); let plan, resolutions = {};
  button(configuration,'Preview changes',async () => {
    plan = await api('plan',{ source: source.value, target: target.value, mode: mode.value }); resolutions = {}; detail.replaceChildren();
    detail.append(node('p',`${plan.operations.length} proposed operations · ${plan.conflicts.length} conflicts · ${plan.unchangedFiles} files skipped. Plan expires in 30 minutes.`));
    for (const operation of plan.operations) detail.append(node('p',operation.type === 'delete' ? `Remove target file: ${operation.path}` : `Copy ${operation.from} → ${operation.to}: ${operation.path}`));
    for (const conflict of plan.conflicts) {
      const label = node('label',`${conflict.path} · ${conflict.reason}`), choice = node('select');
      const choices = [['','Choose a resolution'],['source','Use source; preserve old target in history'],['target',plan.mode === 'twoWay' ? 'Use target; preserve old source in history' : 'Keep target unchanged'],['skip','Skip this conflict']];
      for (const [value,title] of choices) { const option = node('option',title); option.value = value; choice.append(option); } choice.addEventListener('change',() => { resolutions[conflict.path] = choice.value; }); label.append(choice); detail.append(label);
    }
  });
  const confirm = field(preview,'Confirm applying this preview','','checkbox'), deletions = field(preview,'Separately approve mirror file removals','','checkbox'), result = node('p','', 'status'); preview.append(result);
  button(preview,'Apply reviewed plan',async () => {
    if (!plan) throw new Error('Preview the folders first.');
    const value = await api('apply',{ token: plan.token, resolutions, confirm: confirm.checked, allowDelete: deletions.checked });
    result.textContent = `${value.copied} files copied · ${value.removed} files removed.${value.historyFolder ? ` Previous files preserved in ${value.historyFolder}.` : ''}`; plan = null; detail.replaceChildren(); confirm.checked = false; deletions.checked = false;
  });
  const native = node('section',undefined,'card'); native.dataset.testid = 'rclone-controls'; native.append(node('h3','Copy with rclone rules'),node('p','Use local copy or sync rules from rclone 1.75.2. Sync removes selected target files absent from the source; filtered files stay in place. Review first, then approve the changes.','muted')); root.append(native);
  const nativeSource = field(native,'Source folder','sync/source'), nativeTarget = field(native,'Target folder','sync/target'); nativeSource.dataset.testid = 'rclone-source'; nativeTarget.dataset.testid = 'rclone-target';
  function select(parent,label,options) { const wrapper = node('label',label), input = node('select'); for (const [value,title] of options) { const option = node('option',title); option.value = value; input.append(option); } wrapper.append(input); parent.append(wrapper); return input; }
  const nativeMode = select(native,'Operation',[['copy','Copy; keep target extras'],['sync','Sync; remove selected target extras']]); nativeMode.dataset.testid = 'rclone-mode';
  const comparison = select(native,'Compare existing files',[['default','Size and modification time'],['checksum','Size and MD5 content checksum'],['sizeOnly','Size only']]); comparison.dataset.testid = 'rclone-comparison';
  const filterText = field(native,'Ordered filter rules (+ include, - exclude, ! reset)','','textarea'); filterText.placeholder = '- /private/**\n+ *.txt\n- **'; filterText.dataset.testid = 'rclone-filter';
  const advanced = node('details'), summary = node('summary','More comparison and filter options'); advanced.append(summary); native.append(advanced);
  const comparisonFields = {};
  for (const [key,label] of [['ignoreSize','Ignore file size during comparison'],['ignoreTimes','Copy selected files even if unchanged'],['ignoreExisting','Keep every existing target file'],['update','Keep target files newer than source'],['noUpdateModtime','Keep timestamps when content already matches']]) comparisonFields[key] = field(advanced,label,'','checkbox');
  const tolerance = field(advanced,'Modification-time tolerance (whole milliseconds)','0','number'); tolerance.min = '0'; tolerance.max = '86400000';
  const include = field(advanced,'Include patterns (one per line)','','textarea'), exclude = field(advanced,'Exclude patterns (one per line)','','textarea'), specificFiles = field(advanced,'Specific source file paths (one per line; use alone)','','textarea');
  const ignoreCase = field(advanced,'Match filters without regard to letter case','','checkbox'), createEmpty = field(advanced,'Create empty source folders in the target','','checkbox'), minSize = field(advanced,'Minimum file size in bytes','','number'), maxSize = field(advanced,'Maximum file size in bytes','','number'); minSize.min = maxSize.min = '0';
  const nativePreview = node('div'); nativePreview.dataset.testid = 'rclone-plan'; native.append(nativePreview); let nativePlan;
  const nativeConfirm = field(native,'Approve the displayed rclone preview','','checkbox'), nativeDelete = field(native,'Separately approve selected file and empty-folder removals','','checkbox'), nativeResult = node('p','', 'status'); nativeConfirm.dataset.testid = 'rclone-confirm'; nativeDelete.dataset.testid = 'rclone-delete'; nativeResult.dataset.testid = 'rclone-result'; native.append(nativeResult);
  for (const input of [nativeSource,nativeTarget,nativeMode,comparison,filterText,...Object.values(comparisonFields),tolerance,include,exclude,specificFiles,ignoreCase,createEmpty,minSize,maxSize]) input.addEventListener('input',() => { nativePlan = null; nativePreview.replaceChildren(); nativeConfirm.checked = nativeDelete.checked = false; nativeResult.textContent = 'Settings changed. Create a new preview.'; });
  button(native,'Preview rclone copy/sync',async () => {
    nativePlan = null; nativeConfirm.checked = nativeDelete.checked = false; nativeResult.textContent = ''; nativePreview.replaceChildren();
    if (!/^\d+$/.test(tolerance.value) || Number(tolerance.value) > 86400000) throw new Error('Choose a tolerance from 0 through 86,400,000 whole milliseconds.');
    const filters = {ignoreCase:ignoreCase.checked};
    for (const [key,input] of [['includeFrom',include],['excludeFrom',exclude],['filterFrom',filterText],['filesFrom',specificFiles]]) if (input.value) filters[key] = [input.value];
    for (const [key,input] of [['minSize',minSize],['maxSize',maxSize]]) if (input.value) { if (!/^\d+$/.test(input.value)) throw new Error('File sizes must be whole byte counts.'); filters[key] = Number(input.value); }
    const options = {modifyWindowNs:(BigInt(tolerance.value)*1000000n).toString()}; if (comparison.value !== 'default') options[comparison.value] = true; for (const [key,input] of Object.entries(comparisonFields)) options[key] = input.checked;
    nativePlan = await api('rclone-plan',{source:nativeSource.value,target:nativeTarget.value,mode:nativeMode.value,filters,comparison:options,createEmptySrcDirs:createEmpty.checked});
    nativePreview.append(node('p',`${nativePlan.mode === 'sync' ? 'Sync':'Copy'}: ${nativePlan.source} → ${nativePlan.target}`));
    const counts = nativePlan.operations.reduce((all,operation) => (all[operation.type] = (all[operation.type] ?? 0)+1,all),{});
    nativePreview.append(node('p',`${counts.copy ?? 0} copies · ${counts.updateModtime ?? 0} timestamp updates · ${counts.delete ?? 0} file removals · ${counts.rmdir ?? 0} empty-folder removals · ${counts.mkdir ?? 0} folders created · ${nativePlan.skipped.length} files skipped. Preview changes nothing and expires in 30 minutes.`));
    nativePreview.append(node('p',`${nativePlan.excludedSourceFiles} source files and ${nativePlan.excludedTargetFiles} target files excluded by rules.`));
    const unequal = nativePlan.skipped.filter(item => !item.byteHashesEqual).length; if (unequal) nativePreview.append(node('p',`${unequal} skipped files have different bytes under the selected rules. Review the content checksum comparison and the options that keep existing or newer target files.`, 'status'));
    for (const operation of nativePlan.operations.slice(0,100)) nativePreview.append(node('p',`${{copy:'Copy source to target',updateModtime:'Update target timestamp',delete:'Remove target file',rmdir:'Remove empty target folder',mkdir:'Create target folder'}[operation.type]}: ${operation.path || '(target root)'}`));
    if (nativePlan.operations.length > 100) nativePreview.append(node('p',`Showing the first 100 of ${nativePlan.operations.length} operations.`));
    const rules = node('details'); rules.append(node('summary','Resolved rules and comparison settings'),node('pre',JSON.stringify({filters:nativePlan.filters,comparison:nativePlan.comparison},null,2))); nativePreview.append(rules);
  });
  button(native,'Download full rclone preview',async () => { if (!nativePlan) throw new Error('Create a rclone preview first.'); const url = URL.createObjectURL(new Blob([JSON.stringify(nativePlan,null,2)+'\n'],{type:'application/json'})), link = node('a'); link.href = url; link.download = 'rea-rclone-preview.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); });
  button(native,'Apply rclone preview',async () => {
    if (!nativePlan) throw new Error('Create a rclone preview first.');
    const value = await api('rclone-apply',{token:nativePlan.token,confirm:nativeConfirm.checked,allowDelete:nativeDelete.checked}); nativePlan = null; nativePreview.replaceChildren(); nativeConfirm.checked = nativeDelete.checked = false;
    nativeResult.textContent = `${value.copied} files copied · ${value.timestampsUpdated} timestamps updated · ${value.removed} files removed · ${value.directoriesRemoved} empty folders removed.${value.historyFolder ? ` Previous target bytes preserved in ${value.historyFolder}.`:''}`;
  });
  try { const value = await api('rclone-status',{}); if (value.lastResult) nativeResult.textContent = `Last rclone operation: ${value.lastResult.status} at ${value.lastResult.completedAt}.`; } catch (error) { nativeResult.textContent = error.message; }
  try { const value = await api('status',{}); if (value.lastResult) status.textContent = `Last sync: ${value.lastResult.completedAt}`; } catch (error) { status.textContent = error.message; }
}
