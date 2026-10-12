# Local Metrics — working development version

An original, dependency-free CSV analytics and dashboard exchange application with local persistence. It is **not a complete Grafana replacement** and does not reuse the earlier source-assisted `@grafana/data` reconstruction.

## Implemented

- Upload/paste CSV; quoted fields, doubled quotes, CRLF and multiline fields; strict headers and row widths; finite numeric inference, explicit null cells and Unicode.
- Persistent datasets and exported JSON; filtered numeric queries with `eq`, `ne`, `gt`, `gte`, `lt`, `lte` and case-insensitive text `contains`.
- Statistics: numeric count, missing/non-numeric counts, compensated sum, mean, min/max, median, nearest-rank p95, first/last numeric sample and sample standard deviation. Numerical overflow is rejected explicitly.
- A separate source-assisted `@grafana/data@13.2.3` native reducer contract with all 124 fixed built-in IDs, including all 99 percentiles, aliases, released null/empty/cache behavior, exact special-value transport, JSON sample controls and calculations on filtered raw CSV columns. It has no original runtime dependency. See [the exact calculation contract](GRAFANA-CALCULATIONS.md).
- UTC epoch-aligned time buckets, ISO timestamp ranges, category grouping, accessible values table and a simple line chart.
- Saved dashboard panels; on-demand threshold alerts with `firing`, `normal`, `no-data` and `error` outcomes. Dataset deletion preserves the original stored record as a tombstone.
- Complete Grafana Classic, dashboard API envelope and V1 resource JSON preservation and export; V2 resource retention. Unchanged exports preserve the original text byte for byte. Supported edits change their selected document members and preserve unknown metadata, panels, queries, sources, transformations and variables.
- A separate imported-dashboard library with dashboard settings, panel titles/descriptions/text, a 24-column layout editor, panel creation/removal, custom/constant/textbox variables and revision checks that reject stale edits. Local CSV query bindings are saved separately from the original Grafana query document.
- Local text/table/stat/time-series previews from saved inline frames, snapshot frames or explicit CSV bindings; limited field-name filtering and organize-fields transformations. Unavailable source queries, transforms, panel types and styling are identified beside the preview. See the [exact exchange boundary](GRAFANA-EXCHANGE.md).
- Imported stat panels evaluate native selected calculations and saved null mode; selecting calculations edits only `options.reduceOptions.calcs` while preserving unknown query/config/options metadata.

## Run and verify

The [recorded performance follow-up](../../results/metrics-performance-followup/README.md) measures the shared-percentile optimization against the released original. Two synthetic workloads improved substantially; three retained slower medians remain open. No whole-product or isolated-memory superiority is established.

From `products/rea-studio`, run `npm start`, open the local REA Studio URL and select **Metrics**. From the repository root:

```sh
node --test products/rea-studio/apps/metrics/*.test.mjs
node products/rea-studio/apps/metrics/scripts/verify-native-calculations.mjs
node products/rea-studio/apps/metrics/scripts/verify-grafana-schema.mjs
```

The Metrics suite passes 28 tests with zero skips, covering parser failures and quoted/multiline inputs, typing, independent numerical expectations, filters, time grouping, persisted datasets/panels, alert states, complete-document exchange, exact field edits, saved frames, variables, unsupported capabilities, numeric preservation and stale revisions. Three HTTP integration tests restart the real host and verify datasets, dashboards, local query bindings, alerts, native calculations/tagged values/cache and precise stat calculation edits on disk. The schema verifier uses the locally preserved TypeScript compiler at `tooling/rea-main/node_modules/typescript/lib/tsc.js`; pass `--typescript /path/to/tsc.js` to use another compiler. Runtime has no vendor or third-party dependency.

[Native calculation evidence](results/native-calculations-verification.json) records 2,910,751 original released `reduceField` comparisons plus 14,240 direct standard-helper comparisons over a new corpus, all 124 built-ins, ten field types and six null-mode settings. The actual digest-verified original module and its real pinned dependency are used only by the developer oracle. Result values/keys, exception classes and cache state match; finite differential coverage does not establish arbitrary object/plugin behavior or whole-product parity.

The [schema evidence](results/grafana-schema-verification.json) records successful structural typing of a generated Classic dashboard against the pinned official Grafana schema, rejection of malformed title/grid types, and byte-identical exchange of three untouched official Grafana fixtures. This is not full original-client/server acceptance or validation of arbitrary plugin JSON. The official V1 OpenAPI spec is explicitly `Unstructured`.

CSV limits are 5 MiB, 25,000 data rows and 128 columns. Dashboard imports are limited to 5 MiB, 1,000 panels, 1,000 variables, 80 nesting levels and 200,000 JSON structure values. Query details include only the first 100 matched rows; visible data tables stop at 500 rows. These bounds are not Grafana's scale targets.

Example CSV:

```csv
timestamp,service,value
2026-01-01T00:00:00Z,web,10
2026-01-01T00:00:30Z,web,30
2026-01-01T00:01:00Z,web,50
```

Select numeric `value`, timestamp `timestamp`, `mean`, and a one-minute interval to produce means 20 and 50. Invalid timestamp rows are counted and excluded when time filtering/grouping is active. Dates require an explicit timezone in ISO form; buckets are fixed UTC seconds, not daylight-saving/calendar intervals. Import [the synthetic dashboard](fixtures/local-dashboard.json) in **Grafana dashboard exchange** to preview saved frames and retained remote queries. The imported dashboard's variable picker changes both a saved title and text content; the exported original query references stay intact.

## Documented original features still missing

The [official panels documentation](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/), [panel overview](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/panel-overview/) and [Grafana Alerting](https://grafana.com/docs/grafana/latest/alerting/) describe an extensive dashboard and monitoring platform. Gaps include data-source connectors and plugins, SQL/PromQL/LogQL, live telemetry, logs/traces/profiles, extensive panel types/transformations, calendar intervals, full dashboard layouts/repetition/conditional rendering, full variable queries/interpolation/formats, annotations, drill-down/explore/correlations, multi-source expressions, recording rules, background evaluation, notification routing/contact points, alert history/silences, authentication, organizations/teams/RBAC, sharing, provisioning, HA, cloud services, public dashboards, large-scale monitoring and enterprise features. These live pages were reviewed on 2026-10-12; they are not a frozen complete specification of the pinned product. Narrow exchange documentation and schema sources are now [preserved with pinned hashes](fixtures/sources.json).

Alerts evaluate the entire filtered static dataset when requested; they do not monitor incoming events or send notifications. The simple CSV query chart draws grouped points sequentially, including category groups. Imported time-series previews use separate fields/frames and numeric time spacing. Mixed numeric/text fields are permitted and reported; simple statistics intentionally skip non-numeric cells, while the separate native calculation API preserves the released field-type/coercion rules. The fixed reducer contract has narrow original execution evidence; arbitrary field classes, custom reducers and full visualization/plugin behavior remain outside that evidence. No speed, feature-parity or universal-superiority benchmark has passed. All documented original features remain an unfinished requirement.
