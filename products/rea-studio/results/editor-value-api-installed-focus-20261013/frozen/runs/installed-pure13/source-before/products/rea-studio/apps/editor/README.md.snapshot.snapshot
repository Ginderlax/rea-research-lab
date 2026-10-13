# Workspace Editor — working development version

An original local UTF-8 editor. Core editing and differences need only Node.js; source control additionally uses an installed Git executable. This is a working development application, **not a complete VS Code or Monaco replacement**. The new implementation does not import the earlier source-assisted research reconstruction.

## Implemented

- Create, list, open and save real files inside REA Studio's confined product workspace; nested directories are created when saving.
- Multiple browser tabs keep separate drafts, with dirty markers, explicit save and Ctrl/Cmd+S. Literal find and replace, tab indentation, comparison with the saved version.
- Saved-file workspace search with literal case modes, exact byte revisions, UTF-16 result positions, bounded traversal/results and explicit incomplete-result notices. Opening results retains existing unsaved drafts and rejects stale positions. See `SEARCH.md` for finite original-engine comparisons and remaining search gaps.
- SHA-256 optimistic revisions reject stale saves and accidental overwrites; saves use same-directory temporary files and rename. In-process concurrent writes to the same path are serialized. UTF-8 validation and binary rejection precede editing.
- Exact shortest line insertion/deletion scripts using common boundaries, disjoint-region detection and shortest-path diagonals, falling back to linear-space Hirschberg reconstruction. Large changed regions no longer require a quadratic-size table.
- Real local Git initialization, author identity, saved-file status, staging/unstaging, working/staged patches, commits, recent history, branch creation/switching and rename records. Clean editor tabs refresh after switching; unsaved drafts remain in memory.
- No executable terminal or evaluation of edited code.

The recorded `ABACDEACACFC` → `EFC` line witness has edit cost **9** in this implementation, versus **11** in the studied Monaco 0.57.0 algorithm. This is a narrowly measured result, not evidence of overall editor superiority. Different diff tie breaks and character-level behavior remain separate comparisons. Tests check all 961 binary sequence pairs through four lines, 1,000 seeded random sequences against an independent minimum-cost recurrence, a 2,000-line sparse-overlap fallback and 10,000 disjoint lines. The getter-span benchmark publishes regressions as well as wins.

## Run and verify

From `products/rea-studio`, run `npm start`, open the local REA Studio URL and select **Editor**. The host supplies the storage/workspace and local browser interface.

From the repository root:

```sh
node --test products/rea-studio/apps/editor/app.test.mjs products/rea-studio/apps/editor/app.integration.test.mjs
node --test products/rea-studio/apps/editor/git.test.mjs products/rea-studio/apps/editor/sequence-diff.test.mjs
node --test products/rea-studio/apps/editor/workspace-search.test.mjs products/rea-studio/apps/editor/workspace-search.integration.test.mjs products/rea-studio/apps/editor/workspace-search.ui.test.mjs
```

Tests exercise actual temporary files, Unicode, revision conflicts, simultaneous saves, binary rejection, traversal, exact script reconstruction and an independent edit-distance oracle. HTTP tests reopen files and Git history after actual host restarts. The editor supports 2 MiB files and 10,000 lines per side. Trace storage is bounded at one million diagonal cells before linear-row reconstruction; worst-case time remains quadratic. The file browser stops at 1,000 files or 12 directory levels and skips links, `.git` and `node_modules`.

Source control accepts a standalone repository rooted in the application workspace. It rejects links/junctions throughout working files and metadata, nested repositories, shared metadata/worktrees, external object stores, configuration includes and index Git links. Traversal is bounded to 50,000 entries and 64 directory levels. Hooks, configured clean/smudge/process filters, fsmonitor, signature-verifier display, external diffs and text conversion are disabled. Tests verify native Git output, real commits/renames/branches, cold restart and audited pointer/filter/verifier regressions. External hostile processes changing the filesystem between checks remain outside this local application boundary.

The parser follows [Git's porcelain status format](https://git-scm.com/docs/git-status); patches use [Git diff](https://git-scm.com/docs/git-diff) and existing-commit unstaging uses [Git restore](https://git-scm.com/docs/git-restore). These references define the protocol used here, not proof of every VS Code source-control workflow.

## Documented original features still missing

The [official VS Code feature overview](https://code.visualstudio.com/docs/editing/getting-started/overview), [editor tips](https://code.visualstudio.com/docs/editing/getting-started/tips-and-tricks) and [debugger documentation](https://code.visualstudio.com/docs/editor/debugging) describe substantially more functionality. Gaps include language servers, IntelliSense, syntax highlighting, snippets, multiple cursors, folding, diagnostics, code actions, refactoring, debugger adapters, breakpoints, integrated terminal, tasks, testing adapters, advanced Git/remote/submodule/signing workflows, merge conflict resolution, extension APIs/marketplace, settings/profiles/keymaps, remote development, accessibility parity, mobile/native packaging and broad encoding/large-file support. These are live references, not a frozen complete specification.

Session drafts are in browser memory and disappear on page reload; saved files persist. No automatic save, autosave recovery, file watcher, renaming, deletion or cross-process write lock exists. An external program could modify a file after the revision check but before rename. Workspace link confinement is enforced by the host; the app alone is not a filesystem sandbox. The current host is for a local single-user workspace, not shared Internet hosting. Feature parity, all documented original features and superiority in every dimension are **not achieved**.

A pending save captures one file revision and one text snapshot. Typing remains available; a completed write updates the saved baseline and revision while retaining any newer draft. Duplicate saves for that open document are refused while its request is pending; save again after it settles. Late responses cannot update a disposed view, a closed/reopened tab, or the status of another active document. Server-side direct calls capture the declared revision before entering the save queue; changing the caller object while queued does not change that precondition.
