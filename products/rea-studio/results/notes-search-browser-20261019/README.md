# Notes structured search: Chromium and observed-value evidence

This is a bounded experiment on the REA Notes replacement. It records **28 real Chromium cases** and **80 original/replacement comparisons** from one independently qualified hosted workflow attempt. It is progress toward the full replacement goal, with the remaining search work listed below.

The tested source is [`0e2b6d70c31e1534e61c203e8fa78c2fc6c19da5`](https://github.com/Ginderlax/rea-research-lab/tree/0e2b6d70c31e1534e61c203e8fa78c2fc6c19da5), with baseline parent `2a8482b42784eb262d6d5b82e62d8d1220dc4821`. [Run 39197426068, attempt 1](https://github.com/Ginderlax/rea-research-lab/actions/runs/39197426068) used GitHub-hosted Windows 2022 and Node 24.16.0. The browser job used locked Playwright 1.64.1 and Chromium 156.0.8078.4, revision 1248. All source identities and same-attempt fields are retained in the raw receipts.

## What was observed

The browser job passed 20 retained cases—four recovery UI cases, eight native IndexedDB cases and eight New To-do cases—and eight new structured-search cases. The new cases exercise actual routes and rendered results, mode switching, field filters, explicit unsupported-query errors, unsaved editor/recovery preservation, delayed unchanged responses, independent selectors and reload/recovery consent. The actual report contains all 28 registered titles, results and fresh runtime identifiers. There were no retries, skips or unexpected results.

The value job retained the same 48 parser and 32 synthetic metadata SQL fixtures used by the earlier finite study. This attempt additionally preserved the actual original/replacement values, errors, SQL, parameters and result IDs before their strict assertions. The 48 parser cases comprise 44 value cases and four error cases. All 80 comparison records matched. TAP reports **82 passes because it includes two parent results**; that does not represent 82 distinct compatibility fixtures or new coverage beyond these same 80 fixtures.

Both jobs authenticated 165 selected baseline source files, then 180 composed source files and 180 postrun source files. Each job used the same exact 18 reviewed overlay targets, taking physical Notes sources from 41 to 46. The overlay existed only on the owned hosted scratch checkout. The active installed Notes product and historical acceptance receipts were not changed.

The unchanged acquisition helper's raw receipt retains an inherited generic Flow/Vault twelve-scenario description and does not serialize `GITHUB_JOB`. It is used only to acquire tools. Its actual commit/run/attempt fields join the fresh browser artifact, collector/workflow role and owned evidence directory, API job, source and case records; no missing internal job field or old product acceptance is invented. The fresh 28-case Playwright report and observations establish the Notes browser result.

## Read the data

- [Machine-readable outcome and limits](OUTCOME.json)
- [Actual browser qualification receipt](browser/raw/browser.json) and [all 28 Playwright results](browser/cases/playwright-results.json)
- [Actual values qualification receipt](values/raw/values.json), [TAP stdout](values/test/original-comparisons/stdout.txt) and [test result](values/test/original-comparisons/result.json)
- [All 80 actual value/SQL records](values/observations/original-search-values.jsonl.txt)
- [Final run](api/runs.json), [job](api/jobs.json) and [artifact](api/artifacts.json) API metadata

The observed-value file is the **unchanged 90,499-byte JSONL upload member**, SHA256 `b52666a268abfeee43f38e8c89ca6a3f802cc24586934532ca8c2d1719e3f733`. Only its public filename ends in `.jsonl.txt`; no record, whitespace or newline was rewritten. Its 82 physical lines are one header, 80 comparison records and one footer.

The data export includes 82 byte-exact raw JSON/text files plus this README and OUTCOME. It includes source and tool-source **identity indexes**, case observations and acquisition/version streams. It excludes source-code snapshots, tool-source contents, PNGs, downloaded binary fixtures, archives, private backup/readability receipts and local control/chat material. Full uploaded contents were separately preserved in readable local backups before qualification. The raw public receipts retain ephemeral GitHub-hosted execution paths as provenance; they contain no personal local workspace paths.

Some embedded Playwright metadata URLs begin with `undefined/` because that child did not receive `GITHUB_SERVER_URL`. They remain unchanged as observed. Use the verified run and source links above; this export does not claim every embedded metadata link works.

## Original-product comparison and limits

The comparison authenticates the standalone Joplin Desktop 3.6.14 `filterParser.ts` and `queryBuilder.ts` sources at commit `7e2765a3857754d12dbadea442b60ceaf9d4b23d`. The exact source files, original licenses, provenance and reviewed adapter are preserved by the tested experiment package. Original function bodies remain intact. A date-service import is replaced by a deny-on-access adapter; none of the 32 selected metadata fixtures accesses it. The SQL fixtures use an in-memory synthetic SQLite schema and records.

This does not execute Joplin's full application, desktop UI, persisted search database or FTS/ranking pipeline. The real Chromium tests exercise the replacement and its actual HTTP/IndexedDB behavior. They do not compare the original application's GUI. Run elapsed times are functional-test observations, not performance benchmarks.

The legacy Text mode retains its AND-substring behavior; Filters mode is an explicit bounded structured-search feature. Full documented search is unfinished: `any` combinations, created/updated/due dates, resource MIME, source URL, IDs and location filters; original FTS, phrase/prefix and normalization semantics; ranking; persistent indexing/migrations; broader browser/accessibility coverage; and measured speed, resource use and reliability comparisons remain open. Explicit unsupported-query errors describe current limits and do not establish feature parity.

This evidence does not establish a production installation, full original-product parity, security certification, measured performance advantage or superiority in every way. Developers can inspect the raw observations and the exact tested source to reproduce or challenge the bounded conclusions.
