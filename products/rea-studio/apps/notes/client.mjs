import { renderMarkdown } from './markdown.mjs';
import { todoState } from './core.mjs';
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function download(value) { const content = value.base64 === undefined ? value.content : Uint8Array.from(atob(value.base64), char => char.charCodeAt(0)); const url = URL.createObjectURL(new Blob([content], { type: value.mime })); const link = el('a', 'Download'); link.href = url; link.download = value.filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function fileBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error('Could not read the file.')); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file); }); }
export async function followInternalLink(id, { api, sourceNoteId, mayDiscard, openNote, downloadResource }) {
  const target = await api('link-target', { id, noteId: sourceNoteId });
  if (target.kind === 'note') {
    if (target.note.id === sourceNoteId) return { kind: 'note', opened: false, reason: 'already-open' };
    if (!mayDiscard()) return { kind: 'note', opened: false, reason: 'draft-retained' };
    await openNote(target.note); return { kind: 'note', opened: true, title: target.note.title };
  }
  if (target.kind === 'resource') {
    await downloadResource(await api('attachment-get', { noteId: target.noteId, id: target.id }));
    return { kind: 'resource', downloaded: true, filename: target.filename };
  }
  throw new Error('This local link target is unsupported.');
}
export async function render(root, api) {
  root.replaceChildren(el('h2', 'Local Notes'), el('p', 'Write Markdown notes, organize notebooks and tags, search, export and restore versions.', 'muted'));
  const status = el('p', 'Loading…', 'status'); status.setAttribute('role', 'status');
  const searchRow = el('div', undefined, 'row'), search = el('input'), tag = el('select'), notebookFilter = el('select'), trash = el('input'), trashLabel = el('label', 'Show trash '), searchButton = el('button', 'Search', 'button'), newButton = el('button', 'New note', 'button'), newTodoButton = el('button', 'New to-do', 'button'), allExport = el('button', 'Export notes JSON', 'button'), jexExport = el('button', 'Export Joplin JEX', 'button');
  search.placeholder = 'Search titles, content and tags'; search.setAttribute('aria-label', 'Search notes'); tag.setAttribute('aria-label', 'Filter tag'); notebookFilter.setAttribute('aria-label', 'Filter notebook'); trash.type = 'checkbox'; trashLabel.append(trash); searchRow.append(search, tag, notebookFilter, trashLabel, searchButton, newButton, newTodoButton, allExport, jexExport);
  const todoFilter = el('select'); todoFilter.setAttribute('aria-label', 'Filter note type');
  for (const [value, label] of [['all', 'All notes and to-dos'], ['notes', 'Notes only'], ['todos', 'All to-dos'], ['open', 'Open to-dos'], ['completed', 'Completed to-dos']]) todoFilter.append(Object.assign(el('option', label), { value }));
  todoFilter.value = 'all'; searchRow.append(todoFilter);
  const list = el('div', undefined, 'card'), draft = el('div', undefined, 'card'), title = el('input'), notebook = el('select'), tags = el('input'), body = el('textarea'); title.placeholder = 'Note title'; title.setAttribute('aria-label', 'Note title'); notebook.setAttribute('aria-label', 'Notebook'); tags.placeholder = 'Tags, separated by commas'; tags.setAttribute('aria-label', 'Note tags'); body.rows = 18; body.setAttribute('aria-label', 'Markdown note');
  const actions = el('div', undefined, 'row'), save = el('button', 'Save note', 'button'), remove = el('button', 'Move to trash', 'button'), restore = el('button', 'Restore note', 'button'), exportOne = el('button', 'Export Markdown', 'button'); actions.append(save, remove, restore, exportOne);
  const todoPanel = el('section', undefined, 'card'), todoStatus = el('p'), todoType = el('button', 'Convert to to-do', 'button'), todoCompleted = el('button', 'Mark complete', 'button'), todoDue = el('input'), setTodoDue = el('button', 'Set due date', 'button'), clearTodoDue = el('button', 'Clear due date', 'button');
  todoPanel.setAttribute('aria-label', 'Saved note to-do controls'); todoDue.type = 'datetime-local'; todoDue.step = '0.001'; todoDue.setAttribute('aria-label', 'To-do due date in local time');
  todoPanel.append(el('h3', 'To-do'), el('p', 'Save your draft first. Converting changes note type and clears due/completion dates. Due dates help you track tasks; reminders are not available yet.', 'muted'), todoStatus, todoType, todoCompleted, todoDue, setTodoDue, clearTodoDue);
  const todoControls = [todoType, todoCompleted, todoDue, setTodoDue, clearTodoDue];
  const attachments = el('div', undefined, 'card'), attachmentUpload = el('input'); attachmentUpload.type = 'file'; attachmentUpload.setAttribute('aria-label', 'Attach a file to the saved note'); attachments.append(el('h3', 'Attachments'), el('p', 'Save your draft first. Attachments are stored locally and included in JEX exports. Maximum file size: 4 MiB.', 'muted'), attachmentUpload); const attachmentList = el('div'); attachments.append(attachmentList);
  const preview = el('article'), versions = el('div'); preview.className = 'card'; preview.setAttribute('aria-label', 'Markdown preview'); draft.append(el('h3', 'Note draft'), title, notebook, tags, body, actions, todoPanel, attachments, el('h3', 'Safe Markdown preview'), preview, versions);
  const imports = el('div', undefined, 'card'), upload = el('input'); upload.type = 'file'; upload.accept = '.md,.markdown,.json,.jex,text/markdown,application/json,application/x-tar'; upload.setAttribute('aria-label', 'Import Markdown, REA notes JSON or Joplin JEX'); imports.append(el('h3', 'Import notes or Joplin JEX'), el('p', 'JEX preserves supported note IDs, notebook hierarchy, tags, metadata and attachments. Existing ID collisions reject the entire import. Maximum JEX size: 8 MiB. JSON creates note copies and excludes binaries.', 'muted'), upload);
  const organization=el('section',undefined,'card'),organizationRows=el('div'),organizationChoice=el('select'),organizationName=el('input'),organizationParent=el('select'),createNotebook=el('button','Create notebook','button'),renameNotebook=el('button','Rename notebook','button'),moveNotebook=el('button','Move notebook','button'),trashNotebook=el('button','Move notebook to trash','button'),restoreNotebook=el('button','Restore notebook','button'),noteDestination=el('select'),moveNote=el('button','Move saved note','button');organization.setAttribute('aria-label','Notebook organization');organizationChoice.setAttribute('aria-label','Manage notebook');organizationName.setAttribute('aria-label','Notebook name');organizationName.placeholder='Notebook name';organizationParent.setAttribute('aria-label','Parent notebook');noteDestination.setAttribute('aria-label','Move note to notebook');const organizationControls=[organizationChoice,organizationName,organizationParent,createNotebook,renameNotebook,moveNotebook,trashNotebook,restoreNotebook,noteDestination,moveNote];organization.append(el('h3','Notebooks'),el('p','Organize notebooks or move a notebook with its descendants to trash. Restoring also restores independently trashed descendant notes. Save your draft first.','muted'),organizationRows,...organizationControls);
  const confirmationHost=el('div');root.append(searchRow, organization, confirmationHost, list, draft, imports, status);
  let current = null, dirty = false, organizationState={revision:0,notebooks:[]},organizationBusy=false,editorGeneration=0,draftRevision=0,refreshGeneration=0,mounted=true,confirmation=null,todoBusy=false,saveBusy=false,draftIsTodo=false;
  async function run(operation, {readOnly=false}={}) { if(!mounted||organizationBusy||(todoBusy&&!readOnly))return;try { await operation(); } catch (error) { if(mounted)status.textContent = error.message; } }
  function clearConfirmation(){if(!confirmation)return;const active=confirmation;confirmation=null;confirmationHost.replaceChildren();for(const [node,inert]of active.background)node.inert=inert;if(mounted)active.trigger.focus();}
  function confirmNotebook({heading,scope,submitLabel,pendingLabel,trigger}){
    if(!mounted||confirmation)return Promise.resolve(false);
    const dialog=el('section',undefined,'card'),headingNode=el('h3',heading),description=el('p',scope),buttons=el('div',undefined,'row'),cancel=el('button','Cancel','button'),confirm=el('button',submitLabel,'button');
    const suffix='notes-notebook-confirm-'+editorGeneration+'-'+refreshGeneration;headingNode.id=suffix+'-heading';description.id=suffix+'-scope';dialog.setAttribute('role','alertdialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby',headingNode.id);dialog.setAttribute('aria-describedby',description.id);dialog.tabIndex=-1;buttons.append(cancel,confirm);dialog.append(headingNode,description,buttons);
    const background=Array.from(root.children).filter(node=>node!==confirmationHost).map(node=>[node,node.inert]);for(const [node]of background)node.inert=true;
    let resolve;const promise=new Promise(done=>resolve=done),active={dialog,cancel,confirm,trigger,background,settled:false,resolve};confirmation=active;
    const choose=value=>{if(!mounted||confirmation!==active||active.settled)return;active.settled=true;cancel.disabled=confirm.disabled=true;if(value){dialog.setAttribute('aria-busy','true');description.textContent=pendingLabel;dialog.focus();}resolve(value);};
    cancel.onclick=()=>choose(false);confirm.onclick=()=>choose(true);
    dialog.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();choose(false);}else if(event.key==='Tab'){event.preventDefault();if(active.settled){dialog.focus();return;}const focused=document.activeElement;(focused===cancel?confirm:focused===confirm?cancel:event.shiftKey?confirm:cancel).focus();}};
    confirmationHost.replaceChildren(dialog);cancel.focus();return promise;
  }
  function updatePreview() { renderMarkdown(preview, body.value, { onInternalLink: id => run(async () => { const result = await followInternalLink(id, { api, sourceNoteId: current?.id, mayDiscard, openNote: accept, downloadResource: download }); status.textContent = result.kind === 'resource' ? `Downloaded ${result.filename}. Your draft is unchanged.` : result.opened ? `Opened linked note: ${result.title}.` : result.reason === 'already-open' ? 'This linked note is already open. Your draft is unchanged.' : 'Unsaved draft retained.'; }) }); }
  function edited() { draftRevision++; dirty = true; updatePreview(); status.textContent = 'Unsaved draft. Save to keep this note.'; }
  for (const control of [title, notebook, tags, body]) control.oninput = edited;
  function refreshTodo(resetDue = false) {
    const value = current ? todoState(current) : { isTodo: draftIsTodo, due: 0, completed: 0 }, blocked = !current || Boolean(current.deletedAt) || organizationBusy || todoBusy || saveBusy;
    todoType.textContent = value.isTodo ? 'Convert to note' : 'Convert to to-do'; todoCompleted.textContent = value.completed ? 'Mark incomplete' : 'Mark complete';
    todoType.disabled = blocked; for (const control of [todoCompleted, todoDue, setTodoDue, clearTodoDue]) control.disabled = blocked || !value.isTodo;
    todoPanel.setAttribute('aria-busy', String(todoBusy));
    todoStatus.textContent = !current ? (draftIsTodo ? 'New to-do draft. Save to create an open to-do with no due date. No note has been stored yet.' : 'Save a note to use to-do controls.') : !value.isTodo ? 'This saved item is a note.' : `${value.completed ? 'Completed ' + new Date(value.completed).toISOString() : 'Open to-do'}${value.due ? ' · Due ' + new Date(value.due).toISOString() : ' · No due date'}`;
    if (resetDue) {
      if (!value.due) todoDue.value = '';
      else { const date = new Date(value.due), pad = n => String(n).padStart(2, '0'); todoDue.value = `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, '0')}`; }
    }
  }
  async function mutateTodo(action, changes) {
    if (!mounted || todoBusy || organizationBusy || saveBusy) return;
    if (!current) throw new Error('Save a note before changing its to-do state.');
    if (dirty) throw new Error('Save your draft before changing its to-do state.');
    const generation = editorGeneration, revision = draftRevision, values = [title.value, notebook.value, tags.value, body.value], request = { id: current.id, revision: current.revision, ...changes };
    let ownedGeneration = generation;
    todoBusy = true; refreshTodo();
    try {
      const result = await api(action, request);
      if (!mounted || generation !== editorGeneration) return;
      const newerDraft = revision !== draftRevision || values.some((value, index) => value !== [title.value, notebook.value, tags.value, body.value][index]);
      if (newerDraft) { current = result.note; dirty = true; refreshTodo(true); status.textContent = 'Saved to-do state. Your newer note draft is retained.'; }
      else { accept(result.note); const accepted = editorGeneration; ownedGeneration = accepted; await refresh(); if (mounted && accepted === editorGeneration && revision === draftRevision && !dirty) status.textContent = result.changed ? 'Saved to-do state.' : 'To-do state was already current.'; }
    } catch (error) { if (mounted && ownedGeneration === editorGeneration) status.textContent = error.message; }
    finally { todoBusy = false; if (mounted) refreshTodo(); }
  }
  todoType.onclick = () => run(() => mutateTodo('todo-type', { type: todoState(current ?? {}).isTodo ? 'note' : 'todo' }));
  todoCompleted.onclick = () => run(() => mutateTodo('todo-completed', { completed: !todoState(current ?? {}).completed }));
  setTodoDue.onclick = () => run(() => { if (!todoDue.value) throw new Error('Choose a local due date, or use Clear due date.'); const due = new Date(todoDue.value).getTime(); if (!Number.isFinite(due) || due <= 0) throw new Error('Choose a valid due date after the Unix epoch.'); return mutateTodo('todo-due', { due }); });
  clearTodoDue.onclick = () => run(() => mutateTodo('todo-due', { due: 0 }));
  function accept(note, newTodo = false) {
    if(!mounted)return;
    editorGeneration++;
    current = note; draftIsTodo = !note && newTodo; dirty = false; title.value = note?.title ?? '';if(note?.notebookId&&!Array.from(notebook.options).some(option=>option.value===note.notebookId))notebook.append(Object.assign(el('option',note.notebook),{value:note.notebookId}));notebook.value = note?.notebookId ?? '__default__'; tags.value = note?.tags.join(', ') ?? ''; body.value = note?.body ?? ''; updatePreview();moveNote.disabled=!note||Boolean(note.deletedAt)||organizationBusy;
    refreshTodo(true); save.disabled = saveBusy || Boolean(note?.deletedAt); remove.disabled = !note || Boolean(note.deletedAt); restore.disabled = !note?.deletedAt; exportOne.disabled = !note;
    attachmentUpload.disabled = !note || Boolean(note.deletedAt); attachmentList.replaceChildren();
    if (note) run(async () => { const response = await api('attachment-list', { id: note.id }); if (current?.id !== note.id) return; for (const resource of response.attachments) { const button = el('button', `Download ${resource.filename} (${resource.bytes} bytes)`, 'button'); button.onclick = () => run(async () => download(await api('attachment-get', { noteId: note.id, id: resource.id }))); attachmentList.append(button); } if (!response.attachments.length) attachmentList.append(el('p', 'No attached files.', 'muted')); }, {readOnly:true});
    versions.replaceChildren(el('h4', 'Previous saved versions'));
    for (const version of [...(note?.history ?? [])].reverse()) { const button = el('button', `Restore revision ${version.revision} (${version.updatedAt})`, 'button'); button.disabled = Boolean(note.deletedAt); button.onclick = () => run(async () => { if (dirty && !window.confirm('Discard the draft and restore this version?')) return; accept(await api('history-restore', { id: current.id, revision: current.revision, historyRevision: version.revision })); await refresh(); status.textContent = 'Historical version restored as a new revision.'; }); versions.append(button); }
  }
  function mayDiscard() { return !dirty || window.confirm('Discard this unsaved draft?'); }
  async function refresh() {
    const generation=++refreshGeneration,response = await api('list', { search: search.value, tag: tag.value, notebookId: notebookFilter.value, trash: trash.checked, todoFilter: todoFilter.value });
    if(!mounted||generation!==refreshGeneration)return;
    const nextOrganization=await api('notebook-list');if(!mounted||generation!==refreshGeneration)return;organizationState=nextOrganization;
    const chosenDraft=notebook.options.length?notebook.value:(current?.notebookId??'__default__'),chosenManaged=organizationChoice.value,chosenParent=organizationParent.value,chosenDestination=noteDestination.value;
    function choices(control,first,value,manage=false){control.replaceChildren(Object.assign(el('option',first),{value}));for(const row of organizationState.notebooks){const option=Object.assign(el('option',`${'  '.repeat(Math.max(0,row.depth-1))}${row.path} · ${row.id.slice(0,6)}`),{value:row.id});option.textContent+=(row.trashed?' · trash':'');option.disabled=manage?!(row.editable||row.restoreEligible):!row.editable;control.append(option);}}
    choices(notebook,'Notes (created when saved)','__default__');notebook.insertBefore(Object.assign(el('option','Unfiled'),{value:''}),notebook.children[1]??null);notebook.value=chosenDraft;choices(organizationChoice,'Choose a notebook','',true);organizationChoice.value=chosenManaged;choices(organizationParent,'Top level','');organizationParent.value=chosenParent;choices(noteDestination,'Unfiled','');noteDestination.value=chosenDestination;organizationRows.replaceChildren();for(const row of organizationState.notebooks)organizationRows.append(el('p',`${'— '.repeat(Math.max(0,row.depth-1))}${row.title} (${row.notes} notes)${row.trashed?' · trash':row.editable?'':' · retained shared metadata'}`));
    const oldTag = tag.value, oldNotebook = notebookFilter.value; tag.replaceChildren(Object.assign(el('option', 'All tags'), { value: '' })); notebookFilter.replaceChildren(Object.assign(el('option', 'All notebooks'), { value: '' }));
    for (const value of response.tags) tag.append(Object.assign(el('option', value), { value })); for (const row of organizationState.notebooks) notebookFilter.append(Object.assign(el('option',row.path+' · '+row.id.slice(0,6)),{value:row.id})); tag.value = oldTag; notebookFilter.value = oldNotebook;
    list.replaceChildren(el('h3', `${response.total} notes`));
    if (!response.notes.length) list.append(el('p', 'No matching notes.', 'muted'));
    for (const note of response.notes) { const button = el('button', `${note.title} · ${note.notebook} · ${note.tags.join(', ')}`, 'button'), snippet = el('p', (note.todo?.isTodo ? (note.todo.completed ? '[Completed to-do] ' : '[Open to-do] ') : '') + note.preview, 'muted'); button.onclick = () => run(async () => { if (!mayDiscard()) return; accept(await api('get', { id: note.id })); status.textContent = `Opened revision ${current.revision}.`; }); list.append(button, snippet); }
  }
  searchButton.onclick = () => run(refresh); search.onkeydown = event => { if (event.key === 'Enter') run(refresh); }; tag.onchange = notebookFilter.onchange = trash.onchange = todoFilter.onchange = () => run(refresh);
  function newDraft(isTodo) {
    if (!mounted || organizationBusy || !mayDiscard()) return;
    accept(null, isTodo); title.focus(); status.textContent = isTodo ? 'New to-do draft. Save to create it.' : 'New note draft.';
  }
  newButton.onclick = () => newDraft(false);
  newTodoButton.onclick = () => newDraft(true);
  async function saveNote() {
    if (!mounted || saveBusy) return;
    const fields=()=>[title.value,notebook.value,tags.value,body.value];
    const ownsDraft=(generation,revision,values)=>mounted&&generation===editorGeneration&&revision===draftRevision&&values.every((value,index)=>value===fields()[index]);
    const generation=editorGeneration,revision=draftRevision,values=fields(),cleanTags = current && tags.value === current.tags.join(', ') ? current.tags : tags.value.split(',').map(value => value.trim()).filter(Boolean);
    const request={ id: current?.id, revision: current?.revision ?? 0, title: values[0], body: values[3], ...(values[1]==='__default__'?{notebook:'Notes'}:{notebookId:values[1]}), tags: cleanTags, ...(!current && draftIsTodo ? {newTodo:true} : {}) };
    saveBusy=true;save.disabled=true;refreshTodo();
    try {
      let note;
      try { note=await api('save',request); }
      catch(error) { if(ownsDraft(generation,revision,values))status.textContent=error.message;return; }
      if(!mounted||generation!==editorGeneration)return;
      if(!ownsDraft(generation,revision,values)){
        current=note;draftIsTodo=false;dirty=true;refreshTodo(true);status.textContent=`Saved revision ${note.revision}. Your newer draft is retained.`;return;
      }
      accept(note);
      const acceptedGeneration=editorGeneration,acceptedRevision=draftRevision,acceptedValues=fields();
      try { await refresh(); }
      catch(error) {
        if(ownsDraft(acceptedGeneration,acceptedRevision,acceptedValues)&&!dirty)status.textContent=`Saved revision ${note.revision}. Could not refresh the note list: ${error.message}`;
        return;
      }
      if(ownsDraft(acceptedGeneration,acceptedRevision,acceptedValues)&&!dirty)status.textContent=`Saved revision ${note.revision}.`;
    } finally {
      saveBusy=false;if(mounted){save.disabled=organizationBusy||Boolean(current?.deletedAt);refreshTodo();}
    }
  }
  save.onclick = () => run(saveNote);
  organizationChoice.onchange=()=>{const row=organizationState.notebooks.find(row=>row.id===organizationChoice.value);organizationName.value=row?.title??'';organizationParent.value=row?.parentId??'';};
  async function organize(operation){if(!mounted||organizationBusy)return;if(dirty)throw new Error('Save your draft before changing notebook organization.');const controls=[...organizationControls,...todoControls,todoFilter,title,notebook,tags,body,save,search,tag,notebookFilter,trash,searchButton,newButton,newTodoButton,remove,restore,attachmentUpload,upload],previous=controls.map(control=>control.disabled);organizationBusy=true;organization.setAttribute('aria-busy','true');for(const control of controls)control.disabled=true;let cancelled=false;try{const result=await operation();cancelled=result===false;if(!mounted||cancelled)return;if(current)accept(await api('get',{id:current.id}));if(mounted)await refresh();}finally{organizationBusy=false;if(mounted){organization.setAttribute('aria-busy','false');controls.forEach((control,index)=>control.disabled=previous[index]);save.disabled=saveBusy||Boolean(current?.deletedAt);moveNote.disabled=!current||Boolean(current.deletedAt);if(current&&!cancelled)accept(current);refreshTodo();}clearConfirmation();}}
  createNotebook.onclick=()=>run(()=>organize(async()=>{const result=await api('notebook-create',{revision:organizationState.revision,title:organizationName.value,parentId:organizationParent.value});organizationChoice.append(Object.assign(el('option',result.notebook.path),{value:result.notebook.id}));organizationChoice.value=result.notebook.id;status.textContent='Notebook created.';}));
  renameNotebook.onclick=()=>run(()=>organize(async()=>{await api('notebook-rename',{revision:organizationState.revision,id:organizationChoice.value,title:organizationName.value});status.textContent='Notebook renamed; note identities are preserved.';}));
  moveNotebook.onclick=()=>run(()=>organize(async()=>{await api('notebook-move',{revision:organizationState.revision,id:organizationChoice.value,parentId:organizationParent.value});status.textContent='Notebook moved with its descendants.';}));
  trashNotebook.onclick=()=>run(()=>organize(async()=>{const row=organizationState.notebooks.find(row=>row.id===organizationChoice.value);if(!row?.trashEligible)throw new Error('Choose an active local notebook.');const id=row.id,revision=organizationState.revision;if(!await confirmNotebook({heading:'Move notebook to trash?',scope:`Move “${row.path}” and all its subnotebooks and regular notes to trash? Attachments remain stored. You can restore this notebook.`,submitLabel:'Confirm move to trash',pendingLabel:'Moving the notebook and its descendants to trash…',trigger:trashNotebook}))return false;if(!mounted)return false;await api('notebook-trash',{id,revision,confirmed:true});if(mounted)status.textContent='Notebook and descendants moved to trash.';}));
  restoreNotebook.onclick=()=>run(()=>organize(async()=>{const row=organizationState.notebooks.find(row=>row.id===organizationChoice.value);if(!row?.restoreEligible)throw new Error('Choose a trashed local notebook.');const id=row.id,revision=organizationState.revision;if(!await confirmNotebook({heading:'Restore notebook?',scope:`Restore “${row.path}”, its trashed subnotebooks and notes, including notes trashed separately? If its parent remains in trash, this notebook becomes top level.`,submitLabel:'Confirm restore notebook',pendingLabel:'Restoring the notebook and its contents…',trigger:restoreNotebook}))return false;if(!mounted)return false;await api('notebook-restore',{id,revision,confirmed:true});if(mounted)status.textContent='Notebook restored with its contents.';}));
  moveNote.onclick=()=>run(()=>organize(async()=>{if(!current)throw new Error('Open a saved note before moving it.');const result=await api('note-move',{id:current.id,revision:current.revision,organizationRevision:organizationState.revision,notebookId:noteDestination.value});accept(result.note);status.textContent='Saved note moved.';}));
  body.onkeydown = event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (!save.disabled) run(saveNote); } };
  remove.onclick = () => run(async () => { if (!current || !mayDiscard() || !window.confirm('Move this note to trash? You can restore it.')) return; accept(await api('delete', { id: current.id, revision: current.revision })); await refresh(); status.textContent = 'Note moved to trash.'; });
  restore.onclick = () => run(async () => { accept(await api('restore', { id: current.id, revision: current.revision })); await refresh(); status.textContent = 'Note restored.'; });
  exportOne.onclick = () => run(async () => { download(await api('export', { id: current.id })); status.textContent = 'Saved note exported. Unsaved drafts are not included.'; });
  allExport.onclick = () => run(async () => { const value = await api('export', { includeTrash: trash.checked }); download(value); status.textContent = value.warning; });
  jexExport.onclick = () => run(async () => { const value = await api('jex-export', { includeTrash: trash.checked }); download(value); status.textContent = `Exported ${value.notes} notes and ${value.attachments} attachments as JEX. Saved-version history is not included.`; });
  attachmentUpload.onchange = () => run(async () => { const file = attachmentUpload.files[0]; if (!file) return; try { if (!current) throw new Error('Save a note before attaching a file.'); if (dirty) throw new Error('Save the draft before attaching a file.'); if (file.size > 4 * 1024 * 1024) throw new Error('Attachment exceeds 4 MiB.'); const value = await api('attachment-add', { id: current.id, revision: current.revision, filename: file.name, mime: file.type || 'application/octet-stream', base64: await fileBase64(file) }); accept(value.note); await refresh(); status.textContent = `Attached ${file.name}; a resource link was added to the saved note.`; } finally { attachmentUpload.value = ''; } });
  upload.onchange = () => run(async () => {
    const file = upload.files[0]; if (!file) return;
    if (/\.jex$/i.test(file.name)) { if (file.size > 8 * 1024 * 1024) throw new Error('JEX exceeds 8 MiB.'); const result = await api('jex-import', { base64: await fileBase64(file) }); await refresh(); status.textContent = `Imported ${result.imported} notes, ${result.notebooks} notebooks and ${result.attachments} attachments with original IDs.`; upload.value = ''; return; }
    if (file.size > 5_000_000) throw new Error('Import exceeds 5 MB.');
    const content = await file.text();
    if (/\.json$/i.test(file.name)) { const result = await api('import-bundle', { content }); await refresh(); status.textContent = `Imported ${result.imported} notes.`; }
    else { if (!mayDiscard()) return; const note = await api('import-markdown', { title: file.name.replace(/\.(?:md|markdown)$/i, ''), content }); accept(note); await refresh(); status.textContent = 'Markdown imported.'; }
    upload.value = '';
  });
  accept(null); await run(refresh); status.textContent = 'Notes are saved locally when you choose Save.';
  return()=>{if(!mounted)return;mounted=false;editorGeneration++;refreshGeneration++;const pending=confirmation;if(pending&&!pending.settled){pending.settled=true;pending.resolve(false);}clearConfirmation();};
}
