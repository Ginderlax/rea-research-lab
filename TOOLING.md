# Reproducing the analysis environment

Recorded host: Windows x64, Node.js 24.16.0. Study execution uses synthetic data and pinned released components. Read each report for its precise domain and host requirements.

## Two distinct REA runtimes

1. **Published npm runtime 6.4.0.** The verified original backup contains `runtime/node_modules/rea-agents/scripts/rea.mjs`. This runtime includes the Windows native controls used with Ghidra. It is a separate sibling backup, outside this Git repository, and remains unchanged.
2. **Source-built runtime.** A Git archive of REA commit `abc8c6dadf4f11b67de1cc2ee96bb55047416d71` was extracted locally to `tooling/rea-main`. Dependencies were installed in that isolated directory, and `npm run build:cached` succeeded. Its script is `tooling/rea-main/scripts/rea.mjs`. This source supports the Go metadata and selected managed-member operations used in this collection. Its installation with ignored package scripts does not build the published Windows native addon.

The version labels match, but the catalogs and native capability availability differ. Do not use a version string as evidence that an operation or native provider is available.

To build the recorded source on another machine, obtain the exact commit from the original backup or [REA upstream](https://github.com/morluto/rea), create an isolated checkout, and use its lockfile:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run build:cached
```

These commands are for the isolated REA checkout. The collection does not require a global npm installation. Set `REA_CLI` to the supporting `scripts/rea.mjs` before invoking a project's optional analysis command. The 7-Zip instructions use `REA_NATIVE_CLI` to select the distinct published native runtime. Each project preserves fresh analysis output under its ignored artifacts directory.

## Native and managed studies

The original native provider was Ghidra 12.1.4 with a portable full JDK 21.0.12.1. Both were acquired into local `tooling/` directories. Native commands supplied `GHIDRA_INSTALL_DIR` and `JAVA_HOME` only in their child-process environments; no global Java or Ghidra settings were changed. Avoid concurrent large Ghidra imports: a rclone import caused resource contention during the recorded series and was cancelled.

KeePass original methods are invoked through Windows PowerShell/.NET reflection. The 7-Zip original export oracle uses C# interop through Windows PowerShell and requires matching x64 architecture. Their independent models use Python standard-library functionality; Python 3.14 was used in the original runs. A Python reconstruction alone does not replace the original managed or native oracle.

Projects 01–06 acquire pinned npm archives locally. Their reports identify original runtime dependencies or bounded host mocks. Projects 09–10 acquire pinned Windows release ZIPs and verify both archive and executable digests. Windows' bundled `tar` can extract those ZIPs; the original program comparisons require Windows x64 bytes and execution.

## What is preserved

The local original REA backup includes source history, the published runtime and its cache. The research lab separately retains artifacts, full evidence, engine installations and replay outputs. Git excludes these installations and distributables; report manifests retain their identities. A fresh GitHub clone can inspect all reports and recorded observations without providers, and can reacquire published artifacts to repeat experiments while upstream remains available. Offline repetition on this machine can use the originals already retained locally.
