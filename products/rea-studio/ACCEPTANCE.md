# Completion requirements

The user's accepted scope is every documented feature of the ten original products, with improvements in speed, resource use, ease of use, compatibility and reliability. The applications in this directory are an initial implementation milestone. None meets that completion standard yet.

## Establish the feature baseline

The research examined released components. A component version is not necessarily the version of its containing product: Monaco is not all of VS Code, `@grafana/data` is not a Grafana deployment, `n8n-workflow` is not the entire n8n platform, and a renderer or node package is not a complete Joplin or Node-RED release. A full-product release crosswalk and a frozen documentation inventory are required before claiming complete parity.

The [initial crosswalk records](requirements/README.md) now identify source revisions, candidate whole-product bindings, source fingerprints and documentation-file catalogs. They also preserve version mismatches and incomplete topic extraction. These are requirements-discovery evidence; exhaustive atomic feature extraction and executable original-product acceptance remain pending.

The sources below establish major documented capability areas. This is an initial coverage inventory, not an exhaustive catalog. Several official sites are rolling documentation; their claims must be checked against an identified release. Product services and ecosystems also need implementation and operational testing, not just a local substitute for their algorithm.

| Application | Official feature baseline | Major remaining areas |
| --- | --- | --- |
| Editor | [VS Code documentation](https://code.visualstudio.com/docs), [Monaco API](https://microsoft.github.io/monaco-editor/typedoc/) | Language services, debug adapters, extensions, terminals/tasks, source control, accessibility, remote workspaces, settings sync and AI integration |
| Metrics | [Grafana documentation](https://grafana.com/docs/grafana/latest/) | Data-source and panel plugins, live queries, dashboard formats, alert delivery, users/roles, distributed operation and Enterprise/Cloud capabilities |
| Automation | [n8n documentation](https://docs.n8n.io/) | Integration catalog, credential management, schedules/webhooks, queue execution, error workflows, expressions, collaboration, deployment and Enterprise/Cloud capabilities |
| Sketch | [Excalidraw documentation](https://docs.excalidraw.com/), [upstream project](https://github.com/excalidraw/excalidraw) | Freehand drawing, advanced bindings, images/libraries, import compatibility, live collaboration, encryption and accessibility |
| Notes | [Joplin help](https://joplinapp.org/help/) | JEX imports, attachments, rich text, plugins, mobile/desktop integration, synchronization, E2EE, sharing and collaboration |
| Flow | [Node-RED user guide](https://nodered.org/docs/user-guide/) | Node ecosystem, protocols/devices, credential/context stores, subflows, JSONata, deploy semantics, admin APIs and project compatibility |
| Vault | [KeePass features](https://keepass.info/features.html), [help](https://keepass.info/help/base/index.html) | KDBX compatibility, key files, platform integration, auto-type, plugins, import/export formats, synchronization and security review |
| Archive | [7-Zip capabilities](https://www.7-zip.org/), [FAQ](https://www.7-zip.org/faq.html) | 7z/LZMA2, all listed archive formats, encryption, solid/multivolume archives, filesystem integration and compression tradeoffs |
| Backup | [restic 0.19.1 documentation](https://restic.readthedocs.io/en/v0.19.1/) | Repository compatibility, encryption, content-defined chunking, remote backends, retention/prune, locking, interrupted-run recovery and platform metadata |
| Sync | [rclone documentation](https://rclone.org/docs/), [storage providers](https://rclone.org/overview/) | Remote provider catalog, OAuth, mounts, crypt, bisync semantics, bandwidth/retry controls, checksums, metadata and deployment compatibility |

## Verify replacement behavior

Each requirement needs a stable identifier, release-specific documentation citation, acceptance fixture, observed original behavior, implementation result and reproduction command. All requirements must pass on the intended supported platforms. Unsupported features remain missing even when basic local workflows work.

Compatibility includes files, APIs, extensions, saved workflows, configuration, metadata, protocols, failure behavior and migration paths. Round-tripping the lab's own file format does not establish compatibility with a vendor format. Security-sensitive applications need threat-model review, key/format review and external assessment before a production-readiness claim.

## Measure improvement

For speed and resource use, freeze the hardware, operating system, runtime, inputs and configuration; measure cold and warm behavior in separate processes, with sufficient repeated trials and uncertainty estimates. Record latency, throughput, CPU time, peak memory, disk/network use and startup costs. Publish losses as well as wins. A component microbenchmark does not establish product-level performance.

For ease of use, use task success, errors, completion time, accessibility checks and comparative user testing. Developer preference or a screenshot is not objective usability evidence. For reliability, exercise long runs, concurrency, crash/restart recovery, malformed inputs, corruption, storage exhaustion and migration. For compatibility, compare every registered contract and external format against the frozen originals.

“Better in every way” is not a result that finite tests can establish for every possible input and environment. This program can establish feature parity and measured improvements under explicitly published conditions. The requested universal claim remains unproven; no application is marked complete while the accepted feature and comparison requirements remain unmet.

## Current gate

`npm test` verifies the development applications' implemented contracts. `npm run benchmark` compares one editor operation with the recorded Monaco release. The [status record](STATUS.json) tracks missing completion conditions. Passing either command alone does not mark any whole product complete.
