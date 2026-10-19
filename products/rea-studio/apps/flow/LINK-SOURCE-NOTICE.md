# Static-link source study and license

The new JavaScript compiler and runtime changes were written with reference to official released Node-RED 5.0.8 sources. Node-RED copyright is held by the JS Foundation and other contributors. Its selected sources are licensed under the Apache License, Version 2.0. Source-assisted logic is identified in `native-link.mjs`; original code is not evaluated by the application's client or server. Original packages are used only as independent verification oracles.

The source study retains complete selected files and licenses from official npm archives:

| Package | Publisher archive | SHA-256 |
| --- | --- | --- |
| `@node-red/nodes` 5.0.8 | `https://registry.npmjs.org/@node-red/nodes/-/nodes-5.0.8.tgz` | `8d38fd3d71083362e755c6922f1e8ef69f64d3e75ee691d50ef889f8664c2609` |
| `@node-red/runtime` 5.0.8 | `https://registry.npmjs.org/@node-red/runtime/-/runtime-5.0.8.tgz` | `9b0e37bd4e3931ddc1e78d55175fdcbd882c998d0ee1e30f0237b377b9b2090d` |

Both archives are also authenticated against their existing npm-lock SHA-512 integrity values. Selected archive bytes equal the installed ignored oracle cache. The 190,079-byte lock SHA-256 is `75f9e5c0448cb753d2fd4b735698dbb2dc8bb310534ac8e4548618baca612de1`.

Relevant source spans are `@node-red/nodes/core/common/60-link.js` lines 30–84 (direct input/default/falsy mode, `_event`, external event behavior and return handling) and `@node-red/runtime/lib/flows/util.js` lines 300–360 (static graph union and rewrite). Selected editor/help HTML documents Link In/Out and separate Link Call/return capabilities. The source study retains the complete files, package metadata and Apache licenses, rather than publishing the compressed npm carriers or executable dependencies. The 5,499-byte Link source SHA-256 is `932313fc797b77dc80fb27869ad23b1c0f6491e34d7ea5b2525a2ce046a06b03`; the 29,778-byte graph utility SHA-256 is `7881b34a1056bd2e75c132038e2d8e4acb5213165541be85fa40a8a4fcd0b87e`.

The preserved acquisition and source-provenance records below give exact paths, lengths, digests, fixture adapters and additional authenticated verification dependencies. The Node-RED test helper is used only for tests and carries its own Apache-2.0 notice. Complete publisher and test-helper license texts are retained with the exact selected source snapshots. The original-test current-layout adapter resolves the default locked cache and forwards that chosen cache to its plain test child; two normalization tests adapt only their seed paths. These proposals preserve assertions and require root installed-path validation. Application code has no original runtime dependency.


## Preserved source and finite evidence

The [static-link source provenance](results/native-link-textarea-followup/static-link-stage/frozen/source-provenance.json.snapshot), [publisher Apache-2.0 license](results/native-link-textarea-followup/static-link-stage/frozen/official-source/node-red-nodes/LICENSE.snapshot.snapshot), [runtime license](results/native-link-textarea-followup/static-link-stage/frozen/official-source/node-red-runtime/LICENSE.snapshot.snapshot) and [test-helper license](results/native-link-textarea-followup/static-link-stage/frozen/verification-source/node-red-node-test-helper/LICENSE.snapshot.snapshot) retain complete source notices. Compressed carriers and installed original dependencies remain local-only.

Historical native34/51-runtime/828-scalar, [author static57](results/native-link-textarea-followup/static-link-stage/frozen/validation.json.snapshot), [author corrected75](results/native-link-textarea-followup/textarea-correction/frozen/validation.json.snapshot), [independent model24](results/native-link-textarea-followup/independent-model-review/frozen/review-validation.json.snapshot), [negative browser8](results/native-link-textarea-followup/root-negative-browser/frozen/browser-observations.json.snapshot) and [corrected browser12](results/native-link-textarea-followup/root-corrected-browser/frozen/browser-observations.json.snapshot) stay separate source epochs. The author original groups contain9 compiler fixtures,7 handler cases and8 full test-helper flows per accepted campaign; the root static review separately records128 compiler calls. This publication planner runs none of those comparisons.

The corrected normal shared-host browser preserves exact raw CRLF across loaded Save and three actual downloads, one file import, static link connection/deployment isolation and reload persistence. The browser does not cover held transport responses, bare-CR input or pending disposal. Programmatic edits of disabled controls are defensive model probes, not real user typing evidence. No full Node-RED editor/runtime parity, security equivalence or superiority is established.
