# Grafana dashboard exchange contract

This milestone implements an original local editor and bounded preview of Grafana JSON. It does not execute Grafana, wrap vendor software at runtime, connect to external data sources or establish whole-product parity. The source candidate is Grafana `v13.2.3`, commit `6193dc03311b631b9727b560d24369e683dc396e`, separately identified from the earlier studied `@grafana/data` artifact. Sources and their complete bytes/hashes are in [the acquisition receipt](fixtures/sources.json).

## Authoritative document and supported edits

Import accepts Classic dashboard objects, legacy API envelopes with `dashboard`, and `Dashboard` resources containing Classic `spec`. V2 resources are recognized and retained as complete documents without local editing/rendering. Import creates a new local library record; the imported `uid`, `id`, API envelope metadata, resource metadata and version are preserved.

The original source text is retained alongside a JSON projection. Export before any document edit is byte-identical, including formatting, escapes, unknown members and envelope fields. Local CSV bindings are a separate persisted sidecar; binding a target does not change exported JSON. No-op document saves keep the original text and revision. After a supported document edit, export serializes the full object with two-space indentation. Object values outside the requested edit stay unchanged; original formatting and duplicate-key syntax are not promised after editing.

Dashboard edits allow `title`, `description`, `tags`, `timezone` and selected `time.from`/`time.to` members. Panel edits allow `title`, `description`, selected `gridPos.x/y/w/h` and text `options.content` or legacy `content`. Unknown members of `gridPos`, `time`, text options and all other objects remain. Panel removal removes the explicitly chosen panel and its nested children; other panels retain their contents and local bindings are remapped to their new paths. New supported panels receive a unique numeric ID and a position after the current saved layout. Existing IDs/versions are not regenerated or incremented.

The 24-column editor requires integer `x/y/w/h`, nonnegative `x/y`, width 1–24 with `x+w <= 24`, and height 1–1,000 units. Grid height units render at 30 pixels. The preview uses CSS grid with an 8-pixel gap, absolute saved positions and scrollable panel bodies. Grafana's negative gravity, drag/resize interactions, row collapse/repetition and V2 layouts are not implemented. Overlapping imported panels and missing/invalid positions are retained; invalid positions receive a fallback preview position without changing their saved JSON.

Every mutation checks the opened record's revision. A stale save is rejected and must reload. Imported `editable=false` dashboards remain read-only. JSON number tokens whose decimal value cannot round-trip through the local numeric representation also force retained-only exchange; this prevents supported edits from rounding unknown numeric metadata. These dashboards still export the exact original text. Import limits are 5 MiB, 1,000 panels, 1,000 variables, depth 80 and 200,000 structure values.

## Variables and local data

Saved custom, constant and textbox variables can be added and their current values changed. Selecting a saved custom option updates `current.value`, `current.text` and option `selected` flags, preserving additional metadata. Saved custom multi-selection and `includeAll` are recognized. All expands to `allValue` when present, otherwise saved options. The preview interpolates `$name`, `${name}`, `${name:raw}` and `${name:csv}` in panel titles, text and local CSV filter strings. Multi-values join with commas. New custom values are entered as a comma-separated list; quoted CSV/key-value custom-variable parsing is not implemented.

Query, datasource, interval, ad hoc, group-by and other variables are retained with their saved JSON and shown as unavailable for local editing. Query refresh, dependency evaluation, regex extraction, URL state, Grafana built-in variables, escaping and other formatters are not implemented. Unresolved variable names/formats remain literal and are reported.

Supported previews:

| Saved panel | Local preview | Boundaries |
| --- | --- | --- |
| `text` | Variable-interpolated literal text for modern `options.content` or legacy `content` | Markdown, HTML, code and embedded content are displayed as literal text; HTML is not executed. |
| `table` | Saved data-frame fields and exact values, first 500 rows per frame | Plain cells; Grafana units, mappings, field overrides, cell options and links are retained without rendering. |
| `stat` | Last finite numeric value per numeric field plus exact values table | Grafana `reduceOptions`, mappings, thresholds, sparkline and styling are retained; this is a local last-numeric-value preview. |
| `timeseries` | Separate numeric fields/frames, time-proportional spacing when a numeric `time` field exists, null/non-numeric gaps and exact values tables | Other axis/legend/stacking/interpolation settings are retained; without a numeric time field, spacing uses sample index. |
| `row` | Saved row/title/position in the absolute grid | Nested panels are projected into the same absolute grid; collapse/repetition is retained without execution. |

Data comes from persisted inline `targets[].data` frame arrays, saved `snapshotData`, or an explicit local binding from a saved target `refId` to the CSV query controls. Saved frame fields need `name`, a `values` array, equal lengths, at most 128 fields and 25,000 values per field. Snapshot frames take precedence over target queries. Hidden targets are skipped. Remote queries and data-source references remain in JSON; the application performs no network retrieval, plugin execution or credential handling. A missing remote target can coexist with available local frames; its warning identifies the partial preview.

Dashboard time settings and panel time overrides are retained. Inline frames use their saved range; CSV bindings use their saved explicit query range. The local alert controls evaluate independent local CSV alerts on demand and do not execute imported Grafana alert definitions.

Transformations execute in saved order only for `filterFieldsByName` with explicit `include.names`/`exclude.names`, and `organize` on one frame with field exclusion/inclusion, index ordering and renaming. Disabled transformations are skipped. Scoped transformation filtering, regex field matchers, other options, joins, expressions, reducers and all other transformations remain retained without execution. An unsupported transformation stops the affected preview and reports the reason. Unknown plugins/panels, annotations, library panels, links, repetition and visualization settings are retained and identified without claiming they render.

## Independent verification

[The schema receipt](results/grafana-schema-verification.json) records a generated complete Classic document, containing all five new panel kinds and three variable kinds, accepted by the pinned official `@grafana/schema` generated TypeScript `Dashboard` type. A malformed numeric title and string grid coordinate are rejected by that same compiler. This is compile-time structural typing; the TypeScript schema cannot establish numerical bounds, plugin semantics or arbitrary runtime JSON Schema validity. The preserved CUE schema is an additional source reference; it was not executed.

Three untouched official fixtures are imported and exported byte for byte: a Classic textbox/inline-frame dashboard, a V1 resource with a collapsed nested row/library panel, and a V2 text-options dashboard. The Classic fixture's saved string values render exactly; its random-walk remote query remains unavailable. V1's official OpenAPI explicitly refers to `Unstructured` for `spec`, so it cannot validate panel internals. V2 only passes complete-document retention. No original Grafana server/client, dashboard migrations or external plugins were executed.

The 21 Metrics tests include independent expected CSV calculations and saved-frame values, equality of complete edited documents against fixtures with only the requested changes, invalid/unsupported inputs, preserved number tokens, stale saves, and HTTP persistence across actual host restarts. A local self-roundtrip alone is not treated as vendor compatibility. Browser verification is performed by the integrating agent; it is not part of this schema receipt.

Reproduce from the repository root:

```sh
node --test products/rea-studio/apps/metrics/*.test.mjs
node products/rea-studio/apps/metrics/scripts/verify-grafana-schema.mjs
```

To reacquire the same public sources, run `scripts/acquire-grafana-fixtures.mjs` within this application. It checks that previously preserved bytes match before writing. Compiler verification is a developer-only action; application runtime uses only Node/browser standard libraries. [Third-party attribution](THIRD_PARTY_NOTICES.md) separates preserved source references from the original implementation.
