# Documentation and replacement requirements

These records retain the accepted scope: every documented feature of the pinned originals and comparisons across speed, resource use, usability, compatibility and reliability. They establish initial release/documentation crosswalks and traceable capability areas. They are **not exhaustive feature inventories, executable original-product acceptance suites or proof of completed replacements**.

The [index](INDEX.json) records **232 initial capability-area rows** and **159 source/API fingerprints** across ten baselines. All whole-product parity gates remain open. Counts measure the discovery records, not completed features or statistical strength.

| Product and application | Original study baseline | Crosswalk and binding issue |
| --- | --- | --- |
| VS Code / Monaco → Editor | Monaco 0.57.0 sequence algorithm | [Workspace products](workspace-products.json): a Monaco version and recorded VS Code core commit do not establish a shipped VS Code product release. |
| Grafana → Metrics | `@grafana/data` 13.2.3 reduction module | [Workspace products](workspace-products.json): library package, source-tree root version and full-product release require separate verification. |
| Joplin → Notes | `@joplin/renderer` 3.7.1 link/heading utilities | [Workspace products](workspace-products.json): a renderer package does not identify the same-number desktop release. |
| n8n → Automation | `n8n-workflow` 2.16.0 graph utilities | [Visual products](visual-products.json): several full-product releases bundle this component; candidate selection and documentation binding are recorded explicitly. |
| Excalidraw → Sketch | Library 0.18.1 camera/version operations | [Visual products](visual-products.json): the library and showcase source do not identify the deployed hosted service. |
| Node-RED → Flow | `@node-red/nodes` 5.0.8 switch node | [Visual products](visual-products.json): matching complete-product dependency and source tag are verified; ecosystem and deployment requirements still need expansion. |
| KeePass → Vault | 2.61.1 OTP component | [System products](system-products.json): preserved complete portable package and compiled manual are identified, while manual-topic extraction remains unverified. |
| 7-Zip → Archive | Extra 26.04 x64 DLL property export | [System products](system-products.json): Extra component evidence does not substitute for the complete distribution and all formats. |
| restic → Backup | v0.19.1 Windows executable | [System products](system-products.json): the complete CLI release is identified; versioned documentation files and observed root commands are catalogs requiring semantic expansion. |
| rclone → Sync | v1.75.2 Windows executable | [System products](system-products.json): command/provider catalogs are observed, but every option and provider behavior remains to be enumerated and exercised. |

Current local milestones are recorded separately from the historical component studies. Local implementation/source/test/fixture hashes have been refreshed; the **159 original source/API fingerprints and all 232 capability IDs remain preserved**. The expanded development suite passed **112 tests with zero failures or skips**, as reported by the integrating run. That result establishes the listed bounded workflows, while every whole-product gate stays open.

| Application | Current bounded implementation and evidence | Remaining boundary |
| --- | --- | --- |
| Editor | [Local Git and exact sequence-diff workflows](../apps/editor/README.md): status, stage/unstage, patches, commits, recent history and branches in a standalone confined workspace. | Advanced/remote Git, full source-control integration and complete VS Code/Monaco editing/API behavior remain open. |
| Notes | [JEX raw-record exchange, metadata, attachments and exact-ID local links](../apps/notes/README.md); the [pinned serialization receipt](../apps/notes/fixtures/oracle-verification.json) records 22 passing checks. | Only four original serialization methods run in a narrow harness; complete Joplin importer/client, all formats, URL/anchor/image behavior and release binding remain open. |
| Sketch | [Native `.excalidraw` preservation, editable projections, freehand and groups](../apps/sketch/README.md), with [released-helper evidence](../apps/sketch/results/excalidraw-compatibility.json). | Preserving unknown/unsupported JSON does not render its content. Full original restoration, renderer, API, bindings and broad scene compatibility remain open. |
| Vault | [Bounded KDBX coverage](../apps/vault/KDBX-COVERAGE.md) with [18 passing checks and zero skips](../apps/vault/compatibility-evidence.json), including independent synthetic fixtures from digest-verified KeePass 2.61.1. | Format/KDF/resource bounds, missing original workflows and independent security/production/comparative acceptance remain open. |

The crosswalks preserve fixed source revisions where available, documentation-path catalogs and hashes, fetched source fingerprints, current application subsets, missing capabilities, evidence references and acceptance work. A documentation-file census does not mean its features have been extracted. A successful local self-roundtrip does not establish vendor compatibility. No whole-product parity gate has passed.

Some primary pages are rolling references and some independent documentation snapshots are temporal candidates. These are marked with their actual binding limitations. The records avoid inferring a whole-product release from matching version numbers. [System-product details](system-products.md) include the unsuccessful compiled-help extraction and the boundaries of the original CLI observations.

Completion work must resolve release/platform/edition bindings, preserve the complete applicable documentation corpus, extract atomic requirements with stable IDs, acquire original-behavior fixtures, implement missing contracts, pass every compatibility gate and run comparative studies under published conditions. Inventory gaps remain open requirements rather than excluded scope. The current [status](../STATUS.json) and [acceptance conditions](../ACCEPTANCE.md) govern completion.
