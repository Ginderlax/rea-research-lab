# From released artifacts to bounded compatibility: ten REA studies

## Abstract

This collection investigates whether shipped software artifacts can support useful, independently executed compatibility models when examined with Reverse Engineer Anything (REA), reference material and controlled original-program experiments. Ten purposively selected products represent developer tools, observability, automation, drawing, notes, credential utilities, archives, backups and storage integration. Six studies examine released JavaScript, one examines managed CIL, one examines native exports and two combine Go build metadata with CLI observations. All final recorded differential comparisons pass after documented method or model corrections. The results include an independently checked nonminimal editor-diff counterexample, telemetry reset semantics, workflow boundary conditions, resource-link rules, OTP truncation boundaries and stdin-dependent obfuscation behavior. These are source- or artifact-informed reconstructions of finite contracts. They do not establish automated recovery of entire applications, clean-room authorship, universal equivalence or academic peer review.

## 1. Research contribution and selection

The contribution is an evidence-linked series of executable studies rather than ten product summaries. Each includes release identity, raw local evidence, a claim ledger, an implementation, an original-artifact oracle, a recorded corpus and a substantive report. Selection sought commercially and operationally useful mechanisms while permitting exact local experiments without a full application or hosted service.

The sample is purposive, not random. Product value is motivated through practical uses rather than independently measured market valuations. Monaco addresses editor changes; Grafana addresses telemetry summaries; n8n and Node-RED address automation; Excalidraw addresses drawing coordinates; Joplin addresses note interoperability; KeePass addresses OTP compatibility; 7-Zip addresses native format discovery; restic addresses backup identity; rclone addresses configuration-format interoperability. Accessible release artifacts permit version pinning and retention.

The artifact—not the product name—is the unit of identity. A package associated with VS Code does not establish the behavior of a particular complete VS Code build. A shipped n8n graph helper does not establish hosted workflow execution. The individual reports state these boundaries.

## 2. Questions and evidence design

The series asks four common questions: what can be observed from released bytes; which observations support a bounded behavioral specification; whether a separately executed model agrees with the original; and which facts remain unresolved by the provider, corpus or execution environment.

The [methodology](METHODOLOGY.md) separates observed file contents, static inference, original execution, reference material and reconstruction comparisons. Evidence IDs link claims to actual REA operations. Artifact digests identify the exact bytes. A publisher checksum match demonstrates consistency with retained publisher metadata, not independent supply-chain authentication. Partial coverage and unknown relations remain visible.

Researchers inspected shipped code or public reference implementations while developing most models. Thus execution-path independence is demonstrated, but author independence, blinding and clean-room separation are not. Excalidraw records exact slices from a minified production chunk without consulting upstream source maps; this still involves artifact inspection by the reconstruction author. Native 7-Zip observations include decompiler output and oracle-calibrated descriptor constants. Go build metadata identifies embedded build claims without recovering algorithms.

## 3. Case results

| Study | Original comparisons | Additional checks and useful finding |
| --- | ---: | --- |
| [Monaco](projects/01-vscode-monaco/REPORT.md) | 5,002 | All edit replays pass; LCS oracle finds 50 nonminimal original outputs in 4,992 non-timeout cases |
| [Grafana](projects/02-grafana/REPORT.md) | 20,720 objects | 19 fields per object; a preserved initial model had 98 mismatches |
| [n8n](projects/03-n8n/REPORT.md) | 40,611 method results | Exhaustive three-node directed graphs; mixed connection types and boundary fallbacks |
| [Excalidraw](projects/04-excalidraw/REPORT.md) | 4,004 calls | 1,500 model round trips; version sums can collide and fingerprints depend on ordering |
| [Joplin](projects/05-joplin/REPORT.md) | 1,630 comparisons | Resource identifiers accept ASCII alphanumeric characters beyond hexadecimal |
| [Node-RED](projects/06-node-red/REPORT.md) | 924 routing/error cases | Otherwise segments and first/all-match routing have distinct contracts |
| [KeePass](projects/07-keepass/REPORT.md) | 485 assembly results | Explicit truncation at digest length minus four falls back to dynamic truncation |
| [7-Zip](projects/08-7zip/REPORT.md) | 400 export rows | 255 unique inputs, 207 novel inputs beyond calibration; 11 model-only signature checks |
| [restic](projects/09-restic/REPORT.md) | 122 content-ID lists | Three snapshots; duplicate, revision, rename and original full-data verification pass |
| [rclone](projects/10-rclone/REPORT.md) | 230 assertions on 115 outputs | Original IV controls random-output comparison; an empty pipe changes hyphen behavior |

All final recorded differential comparisons show zero mismatches. This is a descriptive statement about the retained corpora. Row counts are heterogeneous and sometimes repeat inputs or states; they are not independent trials and do not support a pooled accuracy, confidence interval or product ranking. The Grafana correction was evaluated on the same corpus that revealed the errors. The native export model also uses calibrated observations. The reports explicitly retain these limits.

## 4. Findings across mechanisms

### 4.1 Exact compatibility can reproduce an original's undesirable behavior

Monaco's internal diff kernel produces the same spans as our model on 5,002 cases. Nevertheless, an independent LCS calculation identifies nonminimal insertion/deletion cost in 50 non-timeout cases. A reduced witness transforms `ABACDEACACFC` into `EFC`: the kernel reports cost 11, while a length-three common subsequence establishes minimum cost 9. This concerns the studied internal kernel and corpus, not the entire editor's final user-visible diff pipeline. The reduction is not proven globally minimal.

Compatibility and optimality are separate properties. This study is valuable precisely because an original-output oracle alone would not reveal the latter difference. The report preserves both measurements.

### 4.2 Boundary assumptions determine interoperability

Grafana's tested counter-reset behavior, Joplin's identifier grammar and KeePass's explicit-offset bound illustrate why reconstructing a familiar algorithm by name is insufficient. The original implementation's edge choices determine observed compatibility. A separate n8n graph model must distinguish main connections from AI links and handle cyclic boundary fallbacks; a Node-RED scalar model must preserve coercion and otherwise segmentation.

The same issue occurs at CLI and serialization boundaries. The restic tree for an empty file omits an explicit zero size, requiring correct interpretation of an absent field. With rclone, the effective plaintext depends on whether stdin is a non-character stream. An empty pipe at EOF yields empty text for a hyphen argument in the recorded execution. Terminal behavior remains untested. A generated leading-hyphen argument initially exposed an option-parsing error in the harness; use of the end-of-options separator corrected the experiment.

These corrections are recorded as model or method events. They are not automatically product defects.

### 4.3 Static evidence and semantic recovery have different coverage

REA establishes useful production-file locations, function candidates, managed method bodies, native pseudocode and embedded Go records. Yet a parsed input or complete selected-file application graph does not establish a complete semantic feature trace. The Monaco, Grafana and n8n semantic traces retain one node and zero relations. Node-RED's trace is ambiguous and partial. Joplin's first worker-limited run parsed fewer selected files despite zero parse failures; a focused rerun resolved selected-file application coverage, while semantic unknowns remained.

The native 7-Zip study successfully decompiles property dispatch and retries registry cross references after a JVM allocation failure. Its separate PE-layout command was unsupported. KeePass's unrestricted member inspection exceeded a representation budget; selected HmacOtp inspection succeeds. Such distinctions determine which recovery claims are justified.

The Go studies use a weaker but concrete REA contribution: byte-specific build inventory. Original CLI experiments and consulted design/source establish the reconstructed behavior. Optional rclone native import was unavailable or cancelled, so no rclone decompilation result is claimed.

### 4.4 A version label is not a complete runtime identity

Both the retained published REA runtime and the isolated source build label themselves 6.4.0, but their capabilities differ. The source build supports portable Go inspection and managed selection used here. Its ignored-script installation lacks the published Windows native control addon. Native Ghidra work therefore uses the verified published runtime. Recording commit identity, provider, platform and operation is necessary to interpret reproducibility.

## 5. Threats to validity

Internal validity is limited by source-assisted reasoning, selected-file extraction, oracle wrappers, mocked host interfaces and calibration overlap. Excalidraw evaluates digest-verified original expressions; Joplin supplies a minimal token host; Node-RED supplies a bounded RED host rather than the full runtime. Native VARIANT observations concern valid ABI calls and successful allocation. These wrappers are part of the declared method, not transparent replacements for a full product.

Construct validity depends on whether the chosen contracts represent meaningful use. The mechanisms are useful for migration, interpretation and compatibility, but none independently establishes the value or reproducibility of the full application. External validity is limited to acquired releases, one primary Windows environment and declared finite domains. Seeded arrays, exhaustive small graphs and boundary cases improve coverage without proving universal behavior.

Reference design and code can reduce discovery independence. The collection therefore separates what REA actually observed from what researchers inferred, consulted or validated by execution. No unjustified statistical confidence is assigned. Performance, timing, real-world workload representativeness and cross-platform behavior remain unmeasured.

## 6. Reproducibility, preservation and next investigations

Per-project reports provide acquisition, experiment, demonstration and optional REA commands. Replays use fresh ignored output directories, preserving historical records and method failures. [The publication manifest](PUBLICATION-MANIFEST.json) identifies the research payload; [the machine-readable index](PROJECT-INDEX.json) links all studies. Original binaries, package archives, raw evidence, engines and synthetic restic repositories remain local.

Future research can add a blinded reconstruction team, a separately selected validation corpus, second-platform tests, larger chunker reconstruction, archive decompression semantics or full application-host integration. Those investigations require new hypotheses and records; they are not implied by the completed bounded studies.

The present collection supports specific recovered contracts and reproducible finite comparisons. Its strongest demonstration of REA is the breadth of evidence it makes inspectable while preserving the distinction between observation and inference.

## References

Each linked case report includes its pinned upstream sources, artifact hashes, exact Evidence IDs, methods, corpus records, limitations and licenses. Common procedural references are [METHODOLOGY.md](METHODOLOGY.md), [TOOLING.md](TOOLING.md), and [LICENSES.md](LICENSES.md).
