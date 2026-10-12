const session = await fetch('/api/session').then(response => response.json());
const navigation = document.querySelector('#navigation');
const content = document.querySelector('#app-root');
const heading = document.querySelector('#app-heading');
let generation = 0;
let dispose;

async function show(id) {
  const app = session.apps.find(candidate => candidate.id === id) ?? session.apps[0];
  const thisGeneration = ++generation;
  if (dispose) { dispose(); dispose = undefined; }
  for (const button of navigation.querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.app === app.id);
    if (button.dataset.app === app.id) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  heading.replaceChildren();
  const title = document.createElement('h1'); title.textContent = app.name;
  const description = document.createElement('p'); description.textContent = app.description; description.className = 'muted';
  const status = document.createElement('p'); status.className = 'development-note'; status.textContent = 'Development version. Full product feature parity and comparative improvements are still being evaluated.';
  heading.append(title, description, status);
  const appRoot = document.createElement('div');
  content.replaceChildren(appRoot);
  appRoot.textContent = 'Opening your workspace…';
  const api = async (action, input = {}) => {
    const response = await fetch(`/api/${app.id}/${encodeURIComponent(action)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-REA-Token': session.token }, body: JSON.stringify(input) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status})`);
    return payload.result;
  };
  try {
    const client = await import(`/apps/${app.id}/client.mjs`);
    if (thisGeneration !== generation) return;
    appRoot.replaceChildren();
    const cleanup = await client.render(appRoot, api);
    if (typeof cleanup === 'function') {
      if (thisGeneration === generation) dispose = cleanup;
      else cleanup();
    }
  } catch (error) {
    if (thisGeneration !== generation) return;
    appRoot.replaceChildren();
    const message = document.createElement('p'); message.className = 'status error'; message.textContent = error.message;
    appRoot.append(message);
  }
}

for (const app of session.apps) {
  const button = document.createElement('button'); button.textContent = app.name; button.dataset.app = app.id;
  button.onclick = () => { location.hash = app.id; };
  navigation.append(button);
}
addEventListener('hashchange', () => show(location.hash.slice(1)));
await show(location.hash.slice(1));
