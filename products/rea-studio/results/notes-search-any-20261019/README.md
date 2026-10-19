# Notes ANY: bounded original-code observations

The isolated [CB88 source](https://github.com/Ginderlax/rea-research-lab/tree/cb88fb39dc874a5f445d3bea6d86f9ddf651b936/products/rea-studio/experiments/notes-search-any-20261019) produced 48 agreeing strict original/replacement comparisons and eight notebook diagnostics. Four diagnostics differ in the ordinary-mirror lane. All 301 TAP results passed in [run 39219566349, attempt 1](https://github.com/Ginderlax/rea-research-lab/actions/runs/39219566349/attempts/1), [job 117951438092](https://github.com/Ginderlax/rea-research-lab/actions/runs/39219566349/job/117951438092). This report remains bound to that source and attempt.

## What was compared

The 48 strict comparisons comprise 16 standalone parser value/error comparisons, including four agreeing invalid-query errors, and 32 non-notebook metadata SQL result-ID comparisons. The SQL database contains six synthetic notes. The observer authenticates Joplin Desktop 3.6.14 sources from commit `7e2765a3857754d12dbadea442b60ceaf9d4b23d`, transforms TypeScript with the pinned Node runtime, and replaces one date-service import with a deny-on-access adapter. That service is used elsewhere in the original builder but is unused by these fixtures. Original function bodies and SQL are retained.

The [fixed cases and fixture](https://github.com/Ginderlax/rea-research-lab/blob/cb88fb39dc874a5f445d3bea6d86f9ddf651b936/products/rea-studio/experiments/notes-search-any-20261019/ANY-CASES.json) and [observer source](https://github.com/Ginderlax/rea-research-lab/blob/cb88fb39dc874a5f445d3bea6d86f9ddf651b936/products/rea-studio/experiments/notes-search-any-20261019/tests/original-any-values.test.mjs) define the bounded study. Actual values, errors, SQL, parameters and IDs are preserved in the unchanged [58-line observation stream](raw/observations/01/original-any-values.jsonl): one header, 56 ordered cases and one footer. The fixture IDs below refer only to those synthetic notes.

## Notebook differences remain open

Lane A uses the metadata schema without `notes_fts`; all eight notebook queries report `no such table: notes_fts`. Lane B adds an ordinary, nonvirtual `notes_fts` table with verified ROWID, ID and full stored-field equality to the six metadata rows. This structural adapter does not execute an FTS engine. Original SQL is unchanged.

Four Lane B results agree with the replacement; four differ:

| Diagnostic suffix | Query | Original Lane B IDs | Replacement IDs |
| --- | --- | --- | --- |
| 002 | `any:0 notebook:Lab tag:work` | empty | n1, n2 |
| 003 | `any:1 notebook:Lab -notebook:Child tag:work tag:spam` | n1, n2, n3 | n1, n3 |
| 007 | `any:1 notebook:Lab` | empty | n1, n2, n3, n5 |
| 008 | `any:0 notebook:Lab` | empty | n1, n2, n3, n5 |

Each suffix completes `REA-JOPLIN-3_6_14-ANY-SCOPE-DIAG-`. These eight cases preserve outcomes without requiring agreement. Their passing TAP checks establish diagnostic capture and fixture checks; they are not eight additional parity passes. The differences remain compatibility-policy questions, not evidence about the full Joplin application.

## Regression and source evidence

The 301 TAP results comprise 59 results for the new observer (56 cases plus three parents) and 242 results across 29 retained regression modules. The latter include the earlier 80 parser/SQL cases, represented by 82 TAP results; these overlap earlier studies and are not 80 newly demonstrated capabilities. All raw test stdout, stderr and result JSON files are included under [raw/tests](raw/tests). The real HTTP module and synthetic DOM cases passed. No real-browser ANY run occurred.

Five source manifests cover 144 inputs each: before, ready, post-run observed, pre-restoration and restored. The baseline and restored captures each contain 1,543,962 bytes; the ready and two observed captures each contain 1,561,981 bytes. Physical hashes match the six declared overlay replacements and the restored original inputs. The two observed-only manifests retain `sourceAuthenticated:false` and `sourceOverlay:null`; the later independent byte comparisons do not rewrite those receipts. All 46 eligible Notes files remain in scope.

This experiment committed inert payloads and applied six exact replacements only inside its owned hosted checkout. It restored that checkout afterward. It does not install ANY into the canonical application or establish current publication-profile acceptance. The actual runtime was GitHub-hosted Windows 2022 / x64, Node 24.16.0.

## Reading this bundle

[RAW-INDEX.json](RAW-INDEX.json) pins 114 unchanged files selected from the 840-member original artifact. Together with this README, [OUTCOME.json](OUTCOME.json) and the index, this is a 117-file public selection. It includes raw observations, all 30 test streams/results, source manifests and phase/runtime reports. Source-content snapshots, original ZIPs, private reviewer controls and other unselected artifact members are excluded. The pinned source remains available at CB88; the recoverable full artifact backup is separate. No earlier receipt is rebound.

The separate [AB26 publication/audit run](https://github.com/Ginderlax/rea-research-lab/actions/runs/39213485324) failed; the delivery audit's 986 reported failures remain unresolved. This CB88 success does not clear those failures. The known unused `browserRoster` field mismatch in the [AB26 installed-browser source plan](https://github.com/Ginderlax/rea-research-lab/blob/ab26bf14bc1a55a723566bbafb3ca391c3ef671c/products/rea-studio/experiments/notes46-installed-search-browser-20261019/SOURCE-PLAN.json) is outside this campaign and remains unrepaired. AB26 raw evidence is not mixed into this CB88 bundle.

The study does not exercise Joplin's GUI, persisted search database, FTS, ranking, full SearchEngine normalization, performance or real-browser ANY behavior. Notebook differences, browser acceptance and further documented filters remain open. The ten replacement products remain incomplete; no complete parity or superiority is claimed.
