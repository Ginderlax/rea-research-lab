export const apps = [
  { id: 'editor', name: 'Lab Editor', baseline: 'VS Code / Monaco', description: 'Files, editing and minimal text differences', studiedRelease: 'Monaco 0.57.0' },
  { id: 'metrics', name: 'Lab Metrics', baseline: 'Grafana', description: 'CSV data, dashboards and calculations', studiedRelease: '@grafana/data 13.2.3' },
  { id: 'automation', name: 'Lab Automation', baseline: 'n8n', description: 'Executable workflows and run history', studiedRelease: 'n8n-workflow 2.16.0' },
  { id: 'sketch', name: 'Lab Sketch', baseline: 'Excalidraw', description: 'Drawing, scene editing and export', studiedRelease: '@excalidraw/excalidraw 0.18.1' },
  { id: 'notes', name: 'Lab Notes', baseline: 'Joplin', description: 'Notes, tags, search and export', studiedRelease: '@joplin/renderer 3.7.1' },
  { id: 'flow', name: 'Lab Flow', baseline: 'Node-RED', description: 'Native flows, deployed revisions and message inspection', studiedRelease: 'Node-RED / @node-red/nodes 5.0.8' },
  { id: 'vault', name: 'Lab Vault', baseline: 'KeePass', description: 'Encrypted entries and password utilities', studiedRelease: 'KeePass 2.61.1' },
  { id: 'archive', name: 'Lab Archive', baseline: '7-Zip', description: 'ZIP, TAR, GZIP and Zstandard archives', studiedRelease: '7-Zip / Extra 26.04' },
  { id: 'backup', name: 'Lab Backup', baseline: 'restic', description: 'Encrypted restic repositories, integrity and restore', studiedRelease: 'restic v0.19.1' },
  { id: 'sync', name: 'Lab Sync', baseline: 'rclone', description: 'Local folder comparison and synchronization', studiedRelease: 'rclone v1.75.2' }
].map(app => ({ ...app, status: 'development', fullFeatureParity: false, universalSuperiorityEstablished: false }));

export const byId = new Map(apps.map(app => [app.id, app]));
