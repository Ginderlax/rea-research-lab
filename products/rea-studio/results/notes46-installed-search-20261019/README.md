# Installed Notes structured search: bounded study

This report concerns the actual committed source [`40c7df9`](https://github.com/Ginderlax/rea-research-lab/tree/40c7df91936aaf9574801aa38c5a635f299e6e39), with 46 eligible Notes source files. The application adds a selectable Filters search mode for title, body, tags, notebook, note/task type and task completion. The new study executed those committed files directly, with no application overlay.

## Observed results

The [browser and observed-values campaign](https://github.com/Ginderlax/rea-research-lab/actions/runs/39207561583), attempt 1, completed on GitHub-hosted Windows 2022 with Node 24.16.0. Independent inspection of its preserved plain-file evidence confirmed:

| Comparison | Actual result | Scope |
| --- | --- | --- |
| Original parser | 48 matching cases, including four matching errors | Exact pinned standalone Joplin filter parser |
| Original query builder | 32 matching result sets, including four empty sets | Original SQL executed against synthetic metadata-only SQLite fixtures |
| Observed-value test output | 82 passes, zero failures, cancellations, skips or todo results | 80 case results plus their two containing tests |
| Real Chromium | 28 passes, zero retries, skips or flaky cases | Eight new search cases, eight storage cases, eight task cases and four recovery cases |
| Installed source | 149 selected identities unchanged before, at readiness and after execution | 447 physical source snapshots checked; the Notes census stayed 46 |

The 80 comparison records preserve original and replacement values or errors, generated SQL and parameters, result IDs, source pins and actual run identity. They were written before the strict assertions. Browser evidence preserves the actual 28-case result, observations, synthetic exports, screenshots and cleanup records. Timing fields are execution provenance; this study does not establish a performance advantage.

The original comparison source is Joplin 3.6.14, commit `7e2765a3857754d12dbadea442b60ceaf9d4b23d`. Its exact parser and query-builder bodies, attribution and license are retained in the [study source](https://github.com/Ginderlax/rea-research-lab/tree/40c7df91936aaf9574801aa38c5a635f299e6e39/products/rea-studio/experiments/notes-search-grammar). A deny-on-access date adapter was unused by these 32 metadata fixtures. The original full application and persisted search database were not executed.

## Initial failures and separate correction

The same source also produced four failed verification jobs. They remain failed:

| Campaign | Actual failure |
| --- | --- |
| [Full and finite verification](https://github.com/Ginderlax/rea-research-lab/actions/runs/39207561569) | Both stopped before tests: the expected source census included 60 historical result inputs and asserted 106 rather than 46 eligible files. |
| [Publication and delivery audit](https://github.com/Ginderlax/rea-research-lab/actions/runs/39207561584) | Both stopped before their documented process started: two discovered Node executable paths were joined into one invalid filename. |

Their raw failure receipts are included. The publication controls and broad delivery audit were not reached in those two jobs. These failures must not be described as the older audit's known 986 signals across 977 names.

A separate [correction commit `cee2da0`](https://github.com/Ginderlax/rea-research-lab/commit/cee2da08f7ebe81a003a6cc9828655794be48cb0) fixes the eligible-file predicate and executable selection, with exact ancestry and source-pin updates. It preserves product behavior, all retained tests, control counts, source budgets and historical inputs. Its new verification attempts are separate evidence. This report does not transfer the results above to that later commit.

The follow-up campaigns have further work open: [finite verification](https://github.com/Ginderlax/rea-research-lab/actions/runs/39209812845) and the [observed-values job](https://github.com/Ginderlax/rea-research-lab/actions/runs/39209812821) completed successfully according to workflow metadata; the later browser, publication and audit jobs failed and require their own raw-evidence diagnosis. Full-suite acceptance is not established here. The earlier 28-case success remains evidence for `40c7df9` only.

## Reproduction and limits

The source contains the pinned workflows, original comparison fixtures and complete dependency declarations. `RAW-INDEX.json` maps every included raw file to its original artifact member, size and SHA-256. Raw copies retain their original bytes and attempt identities. Complete portable archives and readable source/tool snapshots are also preserved in local backups; this public package selects the research outputs and failure records.

The demonstrated compatibility is bounded. Full-text indexing, tokenization, ranking, date/location/resource/URL filters, broader notebook behavior and other documented original features remain separate requirements. The 32 SQL cases do not establish full-text-search parity. No full product replacement, default-branch installation, superiority, speed/resource improvement or completion of all ten products is claimed.
