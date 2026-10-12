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
  try { const value = await api('status',{}); if (value.lastResult) status.textContent = `Last sync: ${value.lastResult.completedAt}`; } catch (error) { status.textContent = error.message; }
}
