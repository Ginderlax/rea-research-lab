# REA Studio development applications

Ten local applications are being developed toward the user's requested full replacements. This directory contains working initial implementations and testable contracts. **None is a complete replacement for its original product.** Full feature parity, full-product comparison and universal superiority have not been established.

The [acceptance requirements](ACCEPTANCE.md) retain the user's full scope. The [documentation crosswalks](requirements/README.md) begin release-specific requirement discovery. [STATUS.json](STATUS.json) records unresolved completion conditions; individual application READMEs list implemented capabilities and concrete gaps. Historical reverse-engineering studies remain in [`projects/`](../../projects/).

## Run on this machine

Install Node.js 24.7 or later, then run:

```text
cd products/rea-studio
npm start
```

Open `http://127.0.0.1:4310`. There are no third-party runtime packages to install. The shared application host provides isolated file workspaces, persisted JSON records, same-origin session protection and serialized per-application operations. Data defaults to the lab's ignored `.local/rea-studio/` directory. `REA_STUDIO_DATA` can select another data directory; `node server.mjs --port 4311` selects another port.

The host binds only to this machine. It is a development application for synthetic fixtures and evaluation; production security assessment, unrestricted files, remote accounts and broad vendor compatibility remain separate requirements. The encrypted local vault record uses its own format; supported KeePass KDBX databases can now be imported and exported.

| Application | Implemented starting point | Details |
| --- | --- | --- |
| Lab Editor | File editing, exact line differences and real local Git operations | [Editor](apps/editor/README.md) |
| Lab Metrics | CSV data, calculations and native Grafana dashboard editing | [Metrics](apps/metrics/README.md) |
| Lab Automation | HTTP workflows, waits, saved calls, cancellation and histories | [Automation](apps/automation/README.md) |
| Lab Sketch | Drawing, grouping, freehand and native scene exchange | [Sketch](apps/sketch/README.md) |
| Lab Notes | Notes, attachments, tags and Joplin JEX exchange | [Notes](apps/notes/README.md) |
| Lab Flow | Stateful message routing and observation | [Flow](apps/flow/README.md) |
| Lab Vault | Encrypted entries, utilities and supported KDBX exchange | [Vault](apps/vault/README.md) |
| Lab Archive | ZIP/ZIP64, TAR and GZIP creation, validation and extraction | [Archive](apps/archive/README.md) |
| Lab Backup | Local snapshots, integrity and restore | [Backup](apps/backup/README.md) |
| Lab Sync | Local comparison and copy synchronization | [Sync](apps/sync/README.md) |

## Verify and compare

```text
npm test
npm run verify
npm run benchmark
npm run benchmark:sequence
```

Tests exercise implemented contracts and actual persisted operations. The benchmark needs the original Monaco artifact acquired by `projects/01-vscode-monaco`; follow that study's acquisition instructions. Its [recorded comparison](results/editor-comparison.json) concerns only an internal sequence algorithm and shows both quality differences and costs. It is an exploratory single-machine comparison, with different API payloads, not a product-level superiority certificate.

The additional [getter-sequence comparison](results/sequence-comparison.json) times matching input representations and changed-span payloads over eight recorded cases. Its current eight-case run records seven faster medians and one tie; the separate line-interface run still has regressions. The [three-run optimization follow-up](results/editor-performance-followup.json) retains the pre-optimization evidence and slight regressions. It does not compare whole editors, deadline handling or the original result-class helper API. Git source control requires an installed Git executable.

`npm run verify` reruns the development tests and records exact source hashes in the [validation receipt](results/development-validation.json). The current record contains 176 passing tests and 0 skips. The [execution and archive milestone](EXECUTION-ARCHIVE-MILESTONE.md) explains the current contracts, original-software evidence, measured improvements and remaining requirements. The [native exchange milestone](NATIVE-EXCHANGE-MILESTONE.md) preserves the prior revision and its comparative losses. Separate [initial browser checks](results/browser-verification.json), [historical native-exchange browser checks](results/browser-compatibility-verification.json) and [current execution/dashboard/archive browser checks](results/browser-execution-verification.json) exercise the local interfaces with synthetic data. These receipts demonstrate the implemented capabilities, while the acceptance requirements and feature gaps remain open.

![REA Studio imported dashboard with local telemetry and explicit unsupported panels](results/execution-preview.jpg)

The [native drawing preview](results/compatibility-preview.jpg) is preserved with the historical native-exchange record.

The [initial interface preview](results/studio-preview.jpg) is preserved with its original browser record.

New application code is implemented separately from the prior reference-assisted reconstructions. There are no imports from those reconstructions and no bundled vendor applications. The collection's existing [license scope](../../LICENSES.md) continues to apply to prior study material; no new repository-wide license overrides it.
