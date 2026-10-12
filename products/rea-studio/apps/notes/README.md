# Local Notes — working development version

An original, dependency-free local Markdown notebook. It is **not a complete Joplin replacement** and does not import the previous source-assisted Joplin reconstruction.

## Implemented

- Persistent notes with titles, Markdown text, notebooks, tags, created/updated dates and numeric revisions.
- AND-token full-text search across titles/content/tags/notebooks, plus notebook and tag filtering.
- Create/edit/save; stale-write protection; in-process serialization; last 20 saved versions and restore-as-new-revision.
- Recoverable trash and restore; Markdown export of one saved note; versioned JSON export of notes; Markdown import and REA JSON bundle import as independent new copies.
- Live safe Markdown preview: headings, paragraphs, flat ordered/unordered lists, quotes, rules, fenced code, inline code, simple emphasis and absolute HTTP/HTTPS/mailto links. User text is inserted through DOM text APIs, raw HTML remains text and dangerous URL schemes remain literal text.

## Run and verify

From `products/rea-studio`, run `npm start`, open the local REA Studio URL and select **Notes**. From the repository root:

```sh
node --test products/rea-studio/apps/notes/app.test.mjs products/rea-studio/apps/notes/app.integration.test.mjs
```

Tests exercise persistence between handler calls, Unicode, compound search, revision conflicts, simultaneous saves, history bounds, trash, export/re-import and safe Markdown tokens. An HTTP test restarts the real host twice and verifies actual on-disk note content, historical versions and trash/restoration, along with Markdown-module delivery. Each note is limited to 200,000 UTF-16 characters, 300 title characters and 50 tags; JSON import accepts at most 1,000 notes and 5 million characters. Import validates all records before starting writes, but storage failures can still cause a partial import because the storage contract does not offer transactions.

Exports contain saved content. Markdown exports add the title as a heading and do not round-trip tags/notebook/history; JSON exports include these fields. JSON imports deliberately create fresh IDs and timestamps, active copies, revision 1 and no historical versions rather than overwrite existing notes. This is an import/export format, not exact backup restoration. Trash is retained; no permanent purge is offered.

## Documented original features still missing

The [official Joplin overview](https://joplinapp.org/help/), [synchronization documentation](https://joplinapp.org/help/apps/sync/) and [end-to-end encryption guide](https://joplinapp.org/help/apps/sync/e2ee/) describe a mature cross-platform notebook. Gaps include full CommonMark/Joplin Markdown compatibility, rich-text editor, attachment/resource handling, encryption and key management, sync to Joplin Cloud/Nextcloud/S3/WebDAV/Dropbox/OneDrive/filesystems, background sync and conflict resolution, mobile/native/terminal clients, web clipper, plugins/themes, to-do alarms, geolocation, notebook hierarchy, sharing/publishing, Evernote/JEX/RAW/PDF/HTML interoperability, OCR, advanced search grammar, migration, accessibility parity and large-note collections. These live pages were reviewed on 2026-10-12; they do not constitute an archived complete pinned-version feature specification.

Notes are plaintext in the local host store. Encryption at rest and cloud end-to-end encryption are absent. Unsaved drafts are browser memory and are lost on reload/navigation; this version has no autosave recovery. Markdown preview omits tables, images, nested lists, escapes, math, footnotes and extension features. No Joplin server compatibility or universal superiority is claimed. The current result is an independently implemented working local notebook and a development starting point; all documented original features are unfinished.
