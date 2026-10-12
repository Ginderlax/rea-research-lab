# Workspace Editor — working development version

An original, dependency-free local UTF-8 editor. This is a working first application, **not a complete VS Code or Monaco replacement**. The new implementation does not import the earlier source-assisted research reconstruction.

## Implemented

- Create, list, open and save real files inside REA Studio's confined product workspace; nested directories are created when saving.
- Multiple browser tabs keep separate drafts, with dirty markers, explicit save and Ctrl/Cmd+S. Literal find and replace, tab indentation, comparison with the saved version.
- SHA-256 optimistic revisions reject stale saves and accidental overwrites; saves use same-directory temporary files and rename. In-process concurrent writes to the same path are serialized. UTF-8 validation and binary rejection precede editing.
- Exact shortest line insertion/deletion scripts using a longest-common-subsequence table, with equal prefix/suffix trimming. Every accepted comparison is globally minimal for this precise cost model; requests exceeding the declared bounds fail instead of returning an approximate result.
- No executable terminal or evaluation of edited code.

The recorded `ABACDEACACFC` → `EFC` line witness has edit cost **9** in this implementation, versus **11** in the studied Monaco 0.57.0 algorithm. This is a narrowly measured result, not evidence of overall editor superiority. Different diff tie breaks and character-level behavior remain separate comparisons. The independent test exhaustively checks all 961 pairs of binary line sequences of length zero through four.

## Run and verify

From `products/rea-studio`, run `npm start`, open the local REA Studio URL and select **Editor**. The host supplies the storage/workspace and local browser interface.

From the repository root:

```sh
node --test products/rea-studio/apps/editor/app.test.mjs products/rea-studio/apps/editor/app.integration.test.mjs
```

Tests exercise actual temporary files, Unicode, revision conflicts, simultaneous saves, binary rejection, traversal through the host contract, exact script reconstruction and an independent edit-distance oracle. An additional HTTP test creates a file, restarts the real host and reopens it from disk, while verifying traversal rejection and client delivery. The editor supports 2 MiB files, at most 10,000 lines per side and 4 million changed-region table cells. The file browser stops at 1,000 files or 12 directory levels and skips links, `.git` and `node_modules`.

## Documented original features still missing

The [official VS Code feature overview](https://code.visualstudio.com/docs/editing/getting-started/overview), [editor tips](https://code.visualstudio.com/docs/editing/getting-started/tips-and-tricks) and [debugger documentation](https://code.visualstudio.com/docs/editor/debugging) describe substantially more functionality. Gaps include language servers, IntelliSense, syntax highlighting, snippets, multiple cursors, folding, diagnostics, code actions, refactoring, debugger adapters, breakpoints, integrated terminal, tasks, testing adapters, Git UI, merge conflict resolution, extension APIs/marketplace, settings/profiles/keymaps, remote development, accessibility parity, mobile/native packaging and broad encoding/large-file support. These links were reviewed on 2026-10-12; they are live documentation, not an archived complete version-specific specification.

Session drafts are in browser memory and disappear on page reload; saved files persist. No automatic save, autosave recovery, file watcher, renaming, deletion or cross-process write lock exists. An external program could modify a file after the revision check but before rename. Workspace link confinement is enforced by the host; the app alone is not a filesystem sandbox. The current host is for a local single-user workspace, not shared Internet hosting. Feature parity, all documented original features and superiority in every dimension are **not achieved**.
