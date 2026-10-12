function node(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function field(parent, label, type = 'text', value = '') {
  const wrapper = node('label',label), input = type === 'textarea' ? node('textarea') : node('input');
  if (type !== 'textarea') input.type = type; input.value = value; wrapper.append(input); parent.append(wrapper); return input;
}
export async function render(root, api) {
  const transport = api; let idleTimer;
  api = async (action,input) => {
    const result = await transport(action,input);
    if (!['status','generate'].includes(action)) {
      clearTimeout(idleTimer);
      if (action !== 'lock') idleTimer = setTimeout(async () => {
        if (content.parentElement !== root) return;
        generated.value = ''; selected = null; content.replaceChildren();
        try { await transport('lock',{}); await refresh(); status.textContent = 'Vault locked after five minutes of inactivity.'; }
        catch (error) { status.textContent = error.message; }
      },5 * 60 * 1000);
    }
    return result;
  };
  root.replaceChildren();
  root.append(node('h2','REA Vault'),node('p','Encrypted local entries, a password generator and one-time codes. The vault locks after five minutes without a vault request.','muted'));
  const status = node('p','', 'status'), content = node('div'), generator = node('section',undefined,'card'); root.append(status,content,generator);
  let selected = null;
  async function run(job) { status.textContent = 'Working…'; try { const value = await job(); status.textContent = 'Done.'; return value; } catch (error) { status.textContent = error.message; return null; } }
  function button(parent, title, fn) { const b = node('button',title,'button'); b.type = 'button'; b.addEventListener('click',() => run(async () => { b.disabled = true; try { await fn(); } finally { b.disabled = false; } })); parent.append(b); return b; }
  generator.append(node('h3','Generate a password'));
  const length = field(generator,'Length','number','24'), generated = field(generator,'Generated password','password'); generated.readOnly = true;
  button(generator,'Generate',async () => { generated.value = (await api('generate',{ length: Number(length.value) })).password; });
  button(generator,'Show / hide generated password',async () => { generated.type = generated.type === 'password' ? 'text' : 'password'; });
  async function refresh() {
    const state = await api('status',{}); content.replaceChildren();
    const gate = node('section',undefined,'card'); content.append(gate);
    if (state.locked) {
      selected = null; gate.append(node('h3',state.exists ? 'Unlock your vault' : 'Create your vault'));
      const master = field(gate,'Master password','password'); master.autocomplete = state.exists ? 'current-password' : 'new-password';
      button(gate,state.exists ? 'Unlock' : 'Create encrypted vault',async () => { try { await api(state.exists ? 'unlock' : 'create',{ password: master.value }); } finally { master.value = ''; } await refresh(); });
      const imported = field(gate,'Encrypted vault JSON to import','textarea');
      const confirmation = field(gate,'Replace an existing vault','checkbox');
      button(gate,'Import encrypted vault',async () => { await api('importEncrypted',{ document: imported.value, password: master.value, confirmReplace: confirmation.checked }); imported.value = ''; master.value = ''; await refresh(); });
      return;
    }
    gate.append(node('h3','Unlocked'));
    button(gate,'Lock now',async () => { await api('lock',{}); generated.value = ''; await refresh(); });
    const search = field(gate,'Search entries');
    const results = node('div',undefined,'grid'); gate.append(results);
    async function list() {
      const data = await api('list',{ search: search.value }); results.replaceChildren();
      if (!data.entries.length) results.append(node('p','No entries yet. Create one below.','muted'));
      for (const item of data.entries) {
        const row = node('section',undefined,'card'); row.append(node('strong',item.title),node('p',[item.group,item.username].filter(Boolean).join(' · ')));
        button(row,'Open entry',async () => { selected = (await api('read',{ id: item.id })).entry; editor(); }); results.append(row);
      }
    }
    button(gate,'Search',list); await list();
    const edit = node('section',undefined,'card'); content.append(edit);
    function editor() {
      edit.replaceChildren(); edit.append(node('h3',selected ? 'Edit entry' : 'New entry'));
      const title = field(edit,'Title','text',selected?.title ?? ''), group = field(edit,'Group','text',selected?.group ?? ''), username = field(edit,'Username','text',selected?.username ?? ''), secret = field(edit,'Password','password',selected?.password ?? ''), url = field(edit,'URL','text',selected?.url ?? ''), notes = field(edit,'Notes','textarea',selected?.notes ?? ''), otp = field(edit,'TOTP Base32 secret','password',selected?.totpSecret ?? '');
      button(edit,'Show / hide entry password',async () => { secret.type = secret.type === 'password' ? 'text' : 'password'; });
      button(edit,'Use generated password',async () => { if (!generated.value) generated.value = (await api('generate',{ length: Number(length.value) })).password; secret.value = generated.value; });
      button(edit,'Save encrypted entry',async () => { await api('save',{ id: selected?.id, title: title.value, group: group.value, username: username.value, password: secret.value, url: url.value, notes: notes.value, totpSecret: otp.value }); selected = null; await list(); editor(); });
      button(edit,'New entry',async () => { selected = null; editor(); });
      if (selected) {
        const code = node('p','', 'status'); edit.append(code);
        button(edit,'Generate one-time code',async () => { const value = await api('totp',{ id: selected.id }); code.textContent = `${value.code} · ${value.remainingSeconds} seconds remaining`; });
        const remove = field(edit,'Confirm entry deletion','checkbox');
        button(edit,'Delete entry',async () => { await api('delete',{ id: selected.id, confirm: remove.checked }); selected = null; await list(); editor(); });
      }
    }
    editor();
    const maintenance = node('section',undefined,'card'); maintenance.append(node('h3','Encrypted backup and master password')); content.append(maintenance);
    const exported = field(maintenance,'Encrypted vault backup JSON','textarea'); exported.readOnly = true;
    button(maintenance,'Show encrypted backup JSON',async () => { exported.value = JSON.stringify((await api('exportEncrypted',{})).document,null,2); });
    const old = field(maintenance,'Current master password','password'), replacement = field(maintenance,'New master password','password');
    button(maintenance,'Change master password',async () => { try { await api('changePassword',{ currentPassword: old.value, newPassword: replacement.value }); } finally { old.value = ''; replacement.value = ''; } });
  }
  await run(refresh);
}
