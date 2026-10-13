function node(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function field(parent, label, type = 'text', value = '') {
  const wrapper = node('label',label), input = type === 'textarea' ? node('textarea') : node('input');
  if (type !== 'textarea') input.type = type; input.value = value; wrapper.append(input); parent.append(wrapper); return input;
}
export async function render(root, api) {
  const transport = api; let idleTimer,sessionEpoch=0,selectionGeneration=0,refreshGeneration=0,disposed=false;
  api = async (action,input) => {
    if(disposed)throw new Error('This vault view is closed.');
    if(['lock','create','unlock','importEncrypted','importKdbx'].includes(action)){sessionEpoch++;clearTimeout(idleTimer);}
    const epoch=sessionEpoch;
    const result = await transport(action,input);
    if(disposed)throw new Error('This vault view is closed.');
    if (epoch===sessionEpoch&&content.parentElement===root&&!['status','generate'].includes(action)) {
      clearTimeout(idleTimer);
      if (action !== 'lock') idleTimer = setTimeout(async () => {
        if (disposed||content.parentElement !== root) return;
        generated.value = ''; selected = null; selectionGeneration++; content.replaceChildren();
        try { await transport('lock',{}); if(disposed)return;await refresh();if(!disposed)status.textContent = 'Vault locked after five minutes of inactivity.'; }
        catch (error) { if(!disposed)status.textContent = error.message; }
      },5 * 60 * 1000);
    }
    return result;
  };
  root.replaceChildren();
  root.append(node('h2','REA Vault'),node('p','Encrypted local entries, a password generator and one-time codes. The vault locks after five minutes without a vault request.','muted'));
  const status = node('p','', 'status'), content = node('div'), generator = node('section',undefined,'card'); root.append(status,content,generator);
  let selected = null;
  async function run(job) { if(disposed)return null;status.textContent = 'Working…'; try { const value = await job(); if(!disposed&&status.textContent==='Working…')status.textContent = 'Done.'; return value; } catch (error) { if(!disposed)status.textContent = error.message; return null; } }
  function button(parent, title, fn) { const b = node('button',title,'button'); b.type = 'button'; b.addEventListener('click',() => run(async () => { b.disabled = true; try { await fn(); } finally { b.disabled = false; } })); parent.append(b); return b; }
  async function fileBase64(input,required = false) {
    const file = input.files?.[0]; if (!file) { if (required) throw new Error('Choose a KDBX database file.'); return undefined; }
    const max = required ? 8 * 1024 * 1024 : 1024 * 1024;
    if (file.size > max) throw new Error(required ? 'Database files must be at most 8 MiB.' : 'Key files must be at most 1 MiB.');
    const bytes = new Uint8Array(await file.arrayBuffer()); let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i,i + 8192));
    const value = btoa(binary); bytes.fill(0); return value;
  }
  function select(parent,label,choices) { const wrapper = node('label',label), input = node('select'); for (const [value,title] of choices) { const option = node('option',title); option.value = value; input.append(option); } wrapper.append(input); parent.append(wrapper); return input; }
  function kdbxImport(parent) {
    const section = node('section',undefined,'card'); section.append(node('h3','Import a KeePass database'),node('p','KDBX 3.1, 4.0 and 4.1. The complete document and attachments stay encrypted locally; extra KeePass fields are preserved for export. Import replaces the local vault.','muted')); parent.append(section);
    const file = field(section,'KeePass database file','file'); file.accept = '.kdbx';
    const source = field(section,'KeePass database password','password'), use = field(section,'Use password component (uncheck for a key file only)','checkbox'); use.checked = true;
    const keyFile = field(section,'Optional KeePass key file','file');
    const local = field(section,'Local vault master password (at least 10 characters)','password'); local.autocomplete = 'new-password';
    const replace = field(section,'Confirm replacement of the existing local vault','checkbox');
    button(section,'Import KDBX database',async () => {
      try { const value = await api('importKdbx',{ fileBase64: await fileBase64(file,true),password: source.value,usePassword: use.checked,keyFileBase64: await fileBase64(keyFile),localPassword: local.value,confirmReplace: replace.checked }); selected = null; await refresh(); status.textContent = `Imported ${value.entries} entries from KDBX ${value.sourceVersion}.`; }
      finally { source.value = ''; local.value = ''; keyFile.value = ''; }
    });
  }
  generator.append(node('h3','Generate a password'));
  const length = field(generator,'Length','number','24'), generated = field(generator,'Generated password','password'); generated.readOnly = true;
  button(generator,'Generate',async () => { generated.value = (await api('generate',{ length: Number(length.value) })).password; });
  button(generator,'Show / hide generated password',async () => { generated.type = generated.type === 'password' ? 'text' : 'password'; });
  async function refresh() {
    const view=++refreshGeneration;selectionGeneration++;
    const state = await api('status',{});if(view!==refreshGeneration||content.parentElement!==root)return; content.replaceChildren();
    const gate = node('section',undefined,'card'); content.append(gate);
    if (state.locked) {
      selected = null; gate.append(node('h3',state.exists ? 'Unlock your vault' : 'Create your vault'));
      const master = field(gate,'Master password','password'); master.autocomplete = state.exists ? 'current-password' : 'new-password';
      button(gate,state.exists ? 'Unlock' : 'Create encrypted vault',async () => { try { await api(state.exists ? 'unlock' : 'create',{ password: master.value }); } finally { master.value = ''; } await refresh(); });
      const imported = field(gate,'Encrypted vault JSON to import','textarea');
      const confirmation = field(gate,'Replace an existing vault','checkbox');
      button(gate,'Import encrypted vault',async () => { await api('importEncrypted',{ document: imported.value, password: master.value, confirmReplace: confirmation.checked }); imported.value = ''; master.value = ''; await refresh(); });
      kdbxImport(content);
      return;
    }
    gate.append(node('h3','Unlocked'));
    button(gate,'Lock now',async () => { selectionGeneration++;selected=null; await api('lock',{}); generated.value = ''; await refresh(); });
    const search = field(gate,'Search entries');
    const results = node('div',undefined,'grid'); gate.append(results);
    let listGeneration=0;
    const viewCurrent=()=>!disposed&&view===refreshGeneration&&gate.parentElement===content&&content.parentElement===root;
    async function list() {
      const generation=++listGeneration,data = await api('list',{ search: search.value });if(!viewCurrent()||generation!==listGeneration)return; results.replaceChildren();
      if (!data.entries.length) results.append(node('p','No entries yet. Create one below.','muted'));
      for (const item of data.entries) {
        const row = node('section',undefined,'card'); row.append(node('strong',item.title),node('p',[item.group,item.username].filter(Boolean).join(' · ')));
        button(row,'Open entry',async () => { const generation=++selectionGeneration,result=await api('read',{ id: item.id });if(!viewCurrent()||generation!==selectionGeneration)return; selected=result.entry; editor(); }); results.append(row);
      }
    }
    const binPanel=node('section',undefined,'card');gate.append(binPanel);let binGeneration=0;
    async function binList(){const request=++binGeneration,value=await api('recycleList',{});if(!viewCurrent()||request!==binGeneration)return;binPanel.replaceChildren(node('h3','Recycle bin'),node('p',value.enabled?'Deleted entries remain encrypted here until permanently deleted.':'Recycling is disabled in this imported database. Existing bin entries can still be restored.','muted'));
      button(binPanel,'Close recycle bin',async()=>{binGeneration++;binPanel.replaceChildren();});
      if(!value.entries.length)binPanel.append(node('p','The recycle bin is empty.'));
      for(const item of value.entries){const row=node('section',undefined,'card');row.append(node('strong',item.title),node('p',item.canRestorePreviousGroup?'Previous group: '+item.previousGroup:'Previous group unavailable.'));binPanel.append(row);
        const binCurrent=()=>viewCurrent()&&request===binGeneration&&row.parentElement===binPanel;
        button(row,'Preview recycled entry',async()=>{if(!binCurrent())return;const result=await api('recycleRead',{id:item.id,revision:item.recycleRevision});if(!binCurrent())return;const preview=node('section',undefined,'card');row.append(preview);for(const[label,key]of[['Title','title'],['Username','username'],['URL','url'],['Notes','notes']]){const value=field(preview,label,key==='notes'?'textarea':'text',result.entry[key]);value.readOnly=true;}const secret=field(preview,'Recycled password','password',result.entry.password);secret.readOnly=true;button(preview,'Show / hide recycled password',async()=>{if(binCurrent())secret.type=secret.type==='password'?'text':'password';});});
        const confirmRestore=field(row,'Confirm restoring this entry to its previous group','checkbox');
        const restore=button(row,'Restore recycled entry',async()=>{if(!binCurrent())return;await api('recycleRestore',{id:item.id,revision:item.recycleRevision,confirm:confirmRestore.checked});if(!binCurrent())return;await list();if(binCurrent())await binList();});restore.disabled=!item.canRestorePreviousGroup;
        const confirmDelete=field(row,'Confirm permanent deletion of this recycled entry','checkbox');
        button(row,'Permanently delete recycled entry',async()=>{if(!binCurrent())return;await api('recycleDelete',{id:item.id,revision:item.recycleRevision,confirm:confirmDelete.checked,permanent:true});if(!binCurrent())return;await list();if(binCurrent())await binList();});
      }
    }
    button(gate,'Show recycle bin',binList);
    button(gate,'Search',list); await list();if(!viewCurrent())return;
    const edit = node('section',undefined,'card'); content.append(edit);
    let editorVersion=0;
    function editor(retainedDraft) {
      const version=++editorVersion,generation=selectionGeneration,entryId=selected?.id;
      const current=()=>viewCurrent()&&version===editorVersion&&generation===selectionGeneration&&selected?.id===entryId&&edit.parentElement===content;
      edit.replaceChildren(); edit.append(node('h3',selected ? 'Edit entry' : 'New entry'));
      const values=retainedDraft??selected;
      const title = field(edit,'Title','text',values?.title ?? ''), group = field(edit,'Group','text',values?.group ?? ''), username = field(edit,'Username','text',values?.username ?? ''), secret = field(edit,'Password','password',values?.password ?? ''), url = field(edit,'URL','text',values?.url ?? ''), notes = field(edit,'Notes','textarea',values?.notes ?? ''), otp = field(edit,'TOTP Base32 secret','password',values?.totpSecret ?? '');
      let draftRevision=0,mutationGeneration=0;
      const draftValues=()=>({title:title.value,group:group.value,username:username.value,password:secret.value,url:url.value,notes:notes.value,totpSecret:otp.value});
      const draftSignature=()=>JSON.stringify(draftValues());let initialSignature=JSON.stringify({title:selected?.title??'',group:selected?.group??'',username:selected?.username??'',password:selected?.password??'',url:selected?.url??'',notes:selected?.notes??'',totpSecret:selected?.totpSecret??''});
      const captureDraft=()=>({revision:draftRevision,signature:draftSignature()});
      const draftCurrent=captured=>current()&&captured.revision===draftRevision&&captured.signature===draftSignature();
      const pendingCurrent=request=>current()&&request===mutationGeneration;
      for(const control of [title,group,username,secret,url,notes,otp])control.addEventListener('input',()=>{draftRevision++;if(current())status.textContent='Unsaved draft.';});
      button(edit,'Show / hide entry password',async () => { secret.type = secret.type === 'password' ? 'text' : 'password'; });
      button(edit,'Use generated password',async () => { if(!current())return;const captured=captureDraft();if (!generated.value){const result=await api('generate',{ length: Number(length.value) });if(!draftCurrent(captured))return;generated.value=result.password;}secret.value=generated.value;draftRevision++;status.textContent='Unsaved draft.'; });
      button(edit,'Save encrypted entry',async () => {if(!current())return;const captured=captureDraft(),request=++mutationGeneration,submitted=draftValues();const result=await api('save',{id:entryId,...submitted});if(!pendingCurrent(request))return;if(!draftCurrent(captured)){initialSignature=JSON.stringify(submitted);if(!entryId){const retained=draftValues();selectionGeneration++;selected={...submitted,id:result.id};editor(retained);}await list();status.textContent='Submitted values saved. Your newer draft is retained.';return;}selectionGeneration++; selected = null;editor(); await list(); });
      button(edit,'New entry',async () => { selectionGeneration++;selected = null; editor(); });
      if (selected) {
        let historyGeneration=0;
        const historyPanel=node('section',undefined,'card'); edit.append(historyPanel);
        button(edit,'Show entry history',async()=>{
          if(!current())return;const request=++historyGeneration,value=await api('historyList',{id:entryId});if(!current()||request!==historyGeneration)return;
          const historyCurrent=()=>current()&&request===historyGeneration&&historyPanel.parentElement===edit;
          historyPanel.replaceChildren(node('h3','Previous versions'),node('p',`History count: ${Number(value.limits.maxItems)<0?'unlimited in the imported settings':value.limits.maxItems}. The database byte limit and local bounds also apply.`,'muted'));
          button(historyPanel,'Close history',async()=>{historyGeneration++;historyPanel.replaceChildren();});
          if(!value.revisions.length)historyPanel.append(node('p','No previous versions. Editing an existing entry creates one.'));
          for(const revision of value.revisions){
            const row=node('section',undefined,'card');row.append(node('p',`${revision.title} · ${revision.modifiedAt}`));historyPanel.append(row);
            button(row,'View this version',async()=>{
              if(!historyCurrent()||row.parentElement!==historyPanel)return;const result=await api('historyRead',{id:entryId,...revision});if(!historyCurrent()||row.parentElement!==historyPanel)return;
              const preview=node('section',undefined,'card');row.replaceChildren(node('p',revision.modifiedAt),preview);
              for(const [label,key] of [['Title','title'],['Username','username'],['URL','url'],['Notes','notes']]){const value=field(preview,label,key==='notes'?'textarea':'text',result.entry[key]);value.readOnly=true;}
              const password=field(preview,'Previous password','password',result.entry.password);password.readOnly=true;
              button(preview,'Show / hide previous password',async()=>{password.type=password.type==='password'?'text':'password'});
              const confirmation=field(preview,'Confirm restoring this version and saving the current version in history','checkbox');
              button(preview,'Restore this version',async()=>{
                if(!historyCurrent()||row.parentElement!==historyPanel)return;if(draftSignature()!==initialSignature)throw new Error('Save or discard your entry draft before restoring a previous version.');const captured=captureDraft(),request=++mutationGeneration;await api('historyRestore',{id:entryId,...revision,confirm:confirmation.checked});if(!historyCurrent()||row.parentElement!==historyPanel||!pendingCurrent(request))return;
                const result=await api('read',{id:entryId});if(!historyCurrent()||row.parentElement!==historyPanel||!pendingCurrent(request))return;if(!draftCurrent(captured)){selected=result.entry;initialSignature=JSON.stringify({title:result.entry.title??'',group:result.entry.group??'',username:result.entry.username??'',password:result.entry.password??'',url:result.entry.url??'',notes:result.entry.notes??'',totpSecret:result.entry.totpSecret??''});await list();status.textContent='Version restored in the vault. Your newer draft is retained.';return;}selectionGeneration++;selected=result.entry;editor();await list();
              });
            });
          }
        });
        const code = node('p','', 'status'); edit.append(code);
        button(edit,'Generate one-time code',async () => {if(!current())return; const value = await api('totp',{ id: entryId });if(!current())return; code.textContent = `${value.code} · ${value.remainingSeconds} seconds remaining`; });
        const remove = field(edit,'Confirm entry deletion','checkbox');
        button(edit,'Delete entry',async () => {if(!current())return;const captured=captureDraft(),request=++mutationGeneration;const result=await api('delete',{id:entryId,confirm:remove.checked,revision:selected.recycleRevision});if(!pendingCurrent(request))return;const retained=draftCurrent(captured)?undefined:draftValues();selectionGeneration++; selected = null;editor(retained); await list();if(retained)status.textContent='Entry removed. Your newer draft is retained as a new entry.';else status.textContent=result?.recycled?'Entry moved to the recycle bin.':'Entry permanently deleted.'; });
      }
    }
    editor();
    const maintenance = node('section',undefined,'card'); maintenance.append(node('h3','Encrypted backup and master password')); content.append(maintenance);
    const exported = field(maintenance,'Encrypted vault backup JSON','textarea'); exported.readOnly = true;
    button(maintenance,'Show encrypted backup JSON',async () => { exported.value = JSON.stringify((await api('exportEncrypted',{})).document,null,2); });
    const old = field(maintenance,'Current master password','password'), replacement = field(maintenance,'New master password','password');
    button(maintenance,'Change master password',async () => { try { await api('changePassword',{ currentPassword: old.value, newPassword: replacement.value }); } finally { old.value = ''; replacement.value = ''; } });
    const exchange = node('section',undefined,'card'); content.append(exchange); exchange.append(node('h3','Export a KeePass database'),node('p','Download an encrypted KDBX 4.1 file that KeePass can open. Keep any key file separately from the database.','muted'));
    const exportPassword = field(exchange,'Password for exported KDBX','password'), useExport = field(exchange,'Use password component (uncheck for a key file only)','checkbox'); useExport.checked = true;
    const exportKey = field(exchange,'Optional key file for export','file');
    const kdf = select(exchange,'Key derivation function',[['argon2id','Argon2id — 64 MiB, 3 passes, 2 lanes'],['argon2d','Argon2d — 64 MiB, 3 passes, 2 lanes'],['aes','AES-KDF — 100,000 rounds']]);
    const cipher = select(exchange,'Database cipher',[['aes','AES-256-CBC'],['chacha20','ChaCha20']]);
    button(exchange,'Download encrypted KDBX',async () => {
      try { const value = await api('exportKdbx',{ password: exportPassword.value,usePassword: useExport.checked,keyFileBase64: await fileBase64(exportKey),options: { cipher: cipher.value,kdf: kdf.value } });
        const data = Uint8Array.from(atob(value.fileBase64),c => c.charCodeAt(0)), url = URL.createObjectURL(new Blob([data],{ type: 'application/octet-stream' })), link = node('a'); link.href = url; link.download = value.filename; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); data.fill(0);
      } finally { exportPassword.value = ''; exportKey.value = ''; }
    });
    kdbxImport(content);
  }
  await run(refresh);
  return ()=>{if(disposed)return;disposed=true;sessionEpoch++;selectionGeneration++;refreshGeneration++;clearTimeout(idleTimer);generated.value='';selected=null;function clearValues(element){if(['input','textarea'].includes(element.tagName?.toLowerCase()))element.value='';for(const child of Array.from(element.children??[]))clearValues(child);}clearValues(content);content.replaceChildren();};
}
