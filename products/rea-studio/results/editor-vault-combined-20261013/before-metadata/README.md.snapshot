# REA Research Lab: ten studies of released software

A reproducible collection of ten bounded reverse-engineering projects, prepared for Ginderlax on 12 October 2026. Each combines identified release bytes, actual Reverse Engineer Anything (REA) observations, a reconstructed contract, comparisons with the original software, and a research report.

Start with [the series manuscript](SERIES-STUDY.md), [methods and evidence standards](METHODOLOGY.md), or an individual report below. The studies demonstrate specific mechanisms; they do not claim reconstruction of entire products or hosted services. They are documented engineering studies and have not undergone independent academic peer review.

## Product development

[REA Studio](products/rea-studio/README.md) adds ten runnable local development applications with a shared interface, persisted data and integration tests. The user's completion standard is every documented feature of the original products, plus improvements in speed, resource use, ease of use, compatibility and reliability. **Zero complete replacement products meet that standard yet.** The [acceptance requirements](products/rea-studio/ACCEPTANCE.md), [status record](products/rea-studio/STATUS.json) and individual application READMEs preserve the full scope and identify missing capabilities. Recorded component comparisons include tradeoffs as well as improvements.

The historical [native exchange and source control milestone](products/rea-studio/NATIVE-EXCHANGE-MILESTONE.md) added supported KeePass KDBX, Joplin JEX and Excalidraw scene exchange, editor Git controls and exact sequence differences, with 112 passing tests. The historical [dashboard, execution and archive milestone](products/rea-studio/EXECUTION-ARCHIVE-MILESTONE.md) added native Grafana dashboard editing, HTTP workflows with cancellation, ZIP64/TAR/GZIP support and editor optimization, with 176 passing tests. The historical [native workflow milestone](products/rea-studio/NATIVE-WORKFLOWS-MILESTONE.md) records 345 passing checks. The historical [compression and remote synchronization milestone](products/rea-studio/COMPRESSION-REMOTE-MILESTONE.md) preserves the 496-test checkpoint. The historical [Rabin, workflow routing and drawing geometry milestone](products/rea-studio/RABIN-ROUTING-GEOMETRY-MILESTONE.md) preserves the 607-test checkpoint. The historical [packed backups, notebook organization and Vault history milestone](products/rea-studio/PACKS-NOTEBOOKS-HISTORY-MILESTONE.md) adds native data-pack aggregation, notebook tree editing/note moves and native history restore with pending-draft corrections, with **686 passing implemented-contract checks and 0 skips**. It retains source-bound original comparisons, actual browser evidence, failure histories and three unaccepted Metrics experiments. Full-product requirements and measured regressions stay explicit; the development goal remains active.

| Project | Released component and valuable mechanism | Recorded comparison unit | Report |
| --- | --- | --- | --- |
| 01 · VS Code / Monaco | Monaco 0.57.0 sequence-diff kernel | 5,002 exact outputs; 5,002 separate replay checks | [Study](projects/01-vscode-monaco/REPORT.md) |
| 02 · Grafana | @grafana/data 13.2.3 telemetry reduction | 20,720 result objects, each with 19 fields | [Study](projects/02-grafana/REPORT.md) |
| 03 · n8n | n8n-workflow 2.16.0 extraction graph utilities | 40,611 method results; 4,609 specifically validate extraction selections | [Study](projects/03-n8n/REPORT.md) |
| 04 · Excalidraw | 0.18.1 camera transforms and scene-version values | 4,004 original comparisons; 1,500 separate model invariants | [Study](projects/04-excalidraw/REPORT.md) |
| 05 · Joplin | Renderer 3.7.1 links and heading anchors | 1,630 recognition, parsing, decoding and heading comparisons | [Study](projects/05-joplin/REPORT.md) |
| 06 · Node-RED | Nodes 5.0.8 Switch routing | 924 output-port/error comparisons | [Study](projects/06-node-red/REPORT.md) |
| 07 · KeePass | 2.61.1 HOTP/TOTP component | 485 original assembly results | [Study](projects/07-keepass/REPORT.md) |
| 08 · 7-Zip | Extra 26.04 x64 DLL property export | 400 rows, 255 unique inputs; 11 separate model-only signature checks | [Study](projects/08-7zip/REPORT.md) |
| 09 · restic | v0.19.1 small-file addressing and identity across snapshots | 122 content-ID lists; additional identity/integrity checks separately recorded | [Study](projects/09-restic/REPORT.md) |
| 10 · rclone | v1.75.2 synthetic obfuscation format | 230 assertions on 115 original CLI outputs; 115 separate length checks | [Study](projects/10-rclone/REPORT.md) |

Every final recorded differential comparison passes in its declared corpus. Counts use different units, include repeated and calibrated cases, and should not be summed into a statistical performance score. Some initial hypotheses failed and were corrected; the reports retain those histories. Monaco also exposes a reduced witness where the original kernel produces a nonminimal edit script, despite our exact compatibility with its output.

## Inspect or reproduce

The reports, study metadata, claim ledgers, code and synthetic observations are readable without installing REA. Run `node scripts/verify-records.mjs` to check the publication hashes, required records and JavaScript syntax. To repeat an experiment, use the documented wrapper commands in its report. Those wrappers preserve historical results in new ignored replay directories. Some retained low-level native verification scripts write existing evidence paths; the native reports identify these scripts.

Projects 01–06 need Node.js. Original-artifact execution in projects 07–10 uses the recorded Windows x64 environment; the native projects also use Python and Windows PowerShell. Artifact acquisition and analysis engines are separate from experiment execution. [TOOLING.md](TOOLING.md) explains the two REA runtimes and optional provider requirements.

## Preservation and publication

The local collection retains original distributables, full evidence, dependency files, engine installations and replay repositories under ignored `artifacts/`, `node_modules/` and `tooling/` directories. The public [Ginderlax/rea-research-lab repository](https://github.com/Ginderlax/rea-research-lab) stores research reports, reconstructed code, harnesses, acquisition digests, selected evidence and recorded observations. GitHub is not an archival mirror of every vendor distributable; those exact originals remain on the local machine.

The separate `rea-backup-2026-10-12` backup was preserved unchanged. [PUBLICATION-MANIFEST.json](PUBLICATION-MANIFEST.json) hashes the research payload. The local publication receipt records the verified remote commit. [License scope and attribution](LICENSES.md) explain why no blanket license is applied to the collection.

## Developer feedback

We welcome independent reproduction, small counterexamples, corrections to the reports, and suggestions for stronger REA experiments. [Open a research feedback issue](https://github.com/Ginderlax/rea-research-lab/issues/new?template=research-feedback.md) or submit a pull request. [CONTRIBUTING.md](CONTRIBUTING.md) explains how to make a result easy to reproduce and review.

For REA Studio, [report an application defect or missing feature](https://github.com/Ginderlax/rea-research-lab/issues/new?template=product-feedback.md). Include an exact revision, synthetic steps and the original release/documentation when making a compatibility claim.

Useful starting points include Monaco's nonminimal edit-script witness, Grafana's counter-reset behavior, n8n's edge-selection rules, KeePass's boundary cases, and the limits of REA's partial semantic traces. Findings should identify the exact component and release; the collection's scope is ten bounded mechanisms rather than ten complete product replicas.

The historical [search, Save, notebook trash and entry recycling checkpoint](products/rea-studio/SEARCH-TRASH-RECYCLE-SAVE-MILESTONE.md) passes **811 implemented-contract checks, zero skips, and709 source fingerprints stable**. It preserves confirmed failures and independent corrections,138 focused Notes/Vault checks and78 Editor checks, an incomplete native-confirmation browser attempt, the acquired VS Code1.140.0 release and its finite API declaration inventory, and four unaccepted Metrics campaigns. Full replacement and all comparative acceptance gates remain open.

[Prior source-bound Editor browser acceptance](products/rea-studio/results/editor-current-search-save-browser-20261013/frozen/validation.json.snapshot) passes eight finite groups, including three delayed responses after real disk commits, with31 exact named source identities from before the later Sketch host-route insertion and normal owned cleanup. These checks add browser evidence for search and Save; full feature parity and comparative acceptance remain open.

The current [notebook confirmation, drawing layout and editor value API checkpoint](products/rea-studio/NOTES-LAYOUT-VALUE-API-MILESTONE.md) passes **847 implemented-contract checks,0skips and720stable source fingerprints**. Notes passes69focused checks and8browser groups; Sketch39app/2HTTP checks and14browser groups; Editor API13pure checks. Source snapshots, confirmed failures, strictness/precision corrections, independent review and exact historical host transitions remain inspectable. Zero products satisfy the accepted complete replacement and comparative standard.
