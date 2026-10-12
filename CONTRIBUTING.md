# Contributing to REA Research Lab

This collection welcomes independent replication and critical review. Start with the relevant project's report, `study.json` and claim ledger, then consult [the methodology](METHODOLOGY.md) for the distinction between observation, inference and reconstruction.

The most useful feedback is a reproducible result:

- A documented command that fails on the stated environment, or a successful run on another environment.
- A small input on which the original component and reconstruction behave differently.
- A claim that needs stronger evidence, a narrower scope or a corrected interpretation.
- A practical improvement to REA analysis, experiment coverage or evidence preservation.

[Open a research feedback issue](https://github.com/Ginderlax/rea-research-lab/issues/new?template=research-feedback.md). Include the project, lab commit, product version or artifact digest, operating system and runtime versions, exact command, expected result and observed result. A small synthetic input and concise output usually make review much faster. Reports retain failed hypotheses and harness corrections; check those sections when investigating a discrepancy.

For code or report improvements, fork the repository and submit a pull request explaining the evidence and verification. Preserve historical observations: use the documented reproduction wrappers, which write fresh ignored replay directories, and add new results separately. State whether any original source, source maps or reference implementation informed the change.

Use synthetic fixtures and share only the evidence needed for the finding. Original vendor distributables and full local engine installations stay outside the published payload. Follow [the per-project license and attribution terms](LICENSES.md); the collection has no blanket license that overrides them.

After changing a published record, update `PUBLICATION-MANIFEST.json` with the new file sizes and SHA-256 digests, then run `node scripts/verify-records.mjs --write`. That check verifies integrity, syntax and recorded-result consistency. Behavioral changes also need the affected project's documented experiment; integrity validation alone does not rerun it.
