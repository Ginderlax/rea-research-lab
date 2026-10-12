# Local Metrics — working development version

An original, dependency-free CSV analytics application with local persistence. It is **not a complete Grafana replacement** and does not reuse the earlier source-assisted `@grafana/data` reconstruction.

## Implemented

- Upload/paste CSV; quoted fields, doubled quotes, CRLF and multiline fields; strict headers and row widths; finite numeric inference, explicit null cells and Unicode.
- Persistent datasets and exported JSON; filtered numeric queries with `eq`, `ne`, `gt`, `gte`, `lt`, `lte` and case-insensitive text `contains`.
- Statistics: numeric count, missing/non-numeric counts, compensated sum, mean, min/max, median, nearest-rank p95, first/last numeric sample and sample standard deviation. Numerical overflow is rejected explicitly.
- UTC epoch-aligned time buckets, ISO timestamp ranges, category grouping, accessible values table and a simple line chart.
- Saved dashboard panels; on-demand threshold alerts with `firing`, `normal`, `no-data` and `error` outcomes. Dataset deletion preserves the original stored record as a tombstone.

## Run and verify

From `products/rea-studio`, run `npm start`, open the local REA Studio URL and select **Metrics**. From the repository root:

```sh
node --test products/rea-studio/apps/metrics/app.test.mjs products/rea-studio/apps/metrics/app.integration.test.mjs
```

Tests cover parser failures and quoted/multiline inputs, typing, independent numerical expectations, filters, time grouping, persisted datasets/panels, alert state transitions, export and missing sources. An HTTP integration test restarts the real host and verifies datasets, dashboards and alerts persisted on disk. CSV limits are 5 MiB, 25,000 data rows and 128 columns. Query details include only the first 100 matched rows; the graph/table displays grouped values and the table stops at 500 groups. These bounds are not Grafana's scale targets.

Example CSV:

```csv
timestamp,service,value
2026-01-01T00:00:00Z,web,10
2026-01-01T00:00:30Z,web,30
2026-01-01T00:01:00Z,web,50
```

Select numeric `value`, timestamp `timestamp`, `mean`, and a one-minute interval to produce means 20 and 50. Invalid timestamp rows are counted and excluded when time filtering/grouping is active. Dates require an explicit timezone in ISO form; buckets are fixed UTC seconds, not daylight-saving/calendar intervals.

## Documented original features still missing

The [official panels documentation](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/), [panel overview](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/panel-overview/) and [Grafana Alerting](https://grafana.com/docs/grafana/latest/alerting/) describe an extensive dashboard and monitoring platform. Gaps include data-source connectors and plugins, SQL/PromQL/LogQL, live telemetry, logs/traces/profiles, extensive panel types/transformations, calendar intervals, dashboard layout editor, templated variables, annotations, drill-down/explore/correlations, multi-source expressions, recording rules, background evaluation, notification routing/contact points, alert history/silences, authentication, organizations/teams/RBAC, sharing, provisioning, HA, cloud services, public dashboards, large-scale monitoring and enterprise features. These live pages were reviewed on 2026-10-12; they are not a frozen complete specification of the pinned product.

Alerts evaluate the entire filtered static dataset when requested; they do not monitor incoming events or send notifications. The chart draws grouped points sequentially, including category groups, and does not claim time-proportional spacing or separate series. Mixed numeric/text fields are permitted and reported; calculations intentionally skip non-numeric cells. Exact compatibility with every Grafana reducer is not claimed. No speed, feature-parity or universal-superiority benchmark has passed. All documented original features remain an unfinished requirement.
