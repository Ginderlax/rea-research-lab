# Project 09: restic small-file addressing and deduplication

## Abstract

This study reconstructs a bounded content-addressing contract of restic v0.19.1 from documentation, released-binary observations and executions against an isolated synthetic repository. REA identifies the exact Go release artifact and its embedded build inventory. Our independent execution path predicts plaintext content identifiers for regular files strictly smaller than 512 KiB and verifies storage-object identifiers. The original executable agrees on 122 file observations across three snapshots. Five duplicate-reference checks, a content-change check, a rename check, three plaintext-tree hash checks and 12 stored-object checks pass. The vendor's `check --read-data` command also succeeds. The result establishes finite-corpus interoperability for these contracts; it does not reconstruct chunking, encryption, compression, indexes or an entire backup product.

## Motivation and research questions

Content identity is central to backup deduplication, migration and forensic explanation. A useful reconstruction must distinguish plaintext blob identity from the identity of a stored repository object. It must also preserve identity across filenames without confusing a rename with a content change.

RQ1 asks what release and dependency claims REA can observe from the executable. RQ2 asks whether one small-file plaintext blob has a reproducible SHA-256 identifier. RQ3 asks whether duplicate bytes, changed bytes and renamed files exhibit the predicted identity relations. RQ4 asks whether the names of persistent hash-addressed storage objects match hashes of their actual stored bytes.

H1 predicts zero content blobs for an empty file and one SHA-256 plaintext identifier for each nonempty fixture in the declared domain. H2 predicts equal identifiers for equal bytes, a changed identifier for the tested revision, and an unchanged identifier for its rename. H3 predicts that the tested persistent objects named by 64 lowercase hexadecimal characters hash to their filenames. These are corpus-specific hypotheses, not probability estimates or universal security claims.

## Artifact and REA observations

The original Windows x64 archive comes from the [v0.19.1 release](https://github.com/restic/restic/releases/tag/v0.19.1). Its SHA-256 is `da948ad707ed690426473aaba2046cd61f8f90f6f0e7dab6be0d5796531de67d`, matching the retained publisher asset digest. The executable is 31,660,032 bytes with SHA-256 `b0dd1fd21eea5d8fe1325f55f7118213c21f36de8a261e04c0624a5ab9fd7830`. Acquisition and asset locations are recorded in [artifact-manifest.json](artifact-manifest.json).

The isolated REA source build at commit `abc8c6dadf4f11b67de1cc2ee96bb55047416d71` ran `inspect-go-binary` successfully. Evidence `ev_99d189902e8214855fb03563672ed97d01e7efada64885131ee6875bba92788f` observes a Go build-information header at file offset 30,188,544, a `go1.26.4` version claim, command path `github.com/restic/restic/cmd/restic`, and 80 embedded dependency records. The authority is shipped-artifact and confidence is observed. The provider explicitly does not recover functions or decompiled code and does not authenticate compiler or dependency identity. [rea-evidence-summary.json](rea-evidence-summary.json) preserves that distinction.

## Method and recovered contract

This is source-assisted research: repository-design documentation informed the model before testing. REA supplied artifact inventory rather than automatically deriving the addressing algorithm. The original executable and the reconstruction remain separate execution paths.

The reconstruction in [reconstruction.mjs](reconstruction.mjs) accepts byte buffers shorter than 512 KiB. An empty buffer yields an empty content-ID list. A nonempty buffer yields one SHA-256 hexadecimal identifier. A separate function checks whether a 64-character lowercase hexadecimal storage filename equals the SHA-256 of its stored bytes. Inputs at or above the declared bound are explicitly rejected by this model rather than treated as reconstructed chunking.

The harness seeds deterministic binary fixtures with `0x5eeda019`. Forty initial files include empty and single-byte files, two equal text files, Unicode content and a Unicode filename, seeded binary data, block-adjacent lengths, and a 511 KiB fixture. It creates a new local repository, disables the user cache and compression, and uses a public synthetic study password. Backup paths contain only generated corpus files.

Three phases retain 40, 41 and 41 files. The second phase changes one file and adds a duplicate. The third renames the changed file. The original `cat snapshot` and `cat blob` operations expose exact plaintext tree records; the harness compares their file content lists with our predictions. Persistent stored objects are read and hashed directly. Finally, the original product verifies all repository data. No user repository, document or remote backend participates.

## Results and method correction

[results.json](results.json) records 122 matching content-ID comparisons and 122 size assertions, five duplicate-reference pairs, one revision comparison, one rename comparison, three tree-ID checks, 12 stored-object-ID checks, and a passing original full data check. The observations include snapshot identifiers and per-file expected and actual IDs. These counts contain repeated observations of stable files across snapshots and must not be described as 122 independent files.

An initial harness assumption was falsified: the empty file's original tree node omits its zero-valued `size` field. [harness-correction.json](harness-correction.json) records this interpretation correction. The revised assertion normalizes omitted size to zero while preserving field presence in each observation. The failed initial replay and its repository remain local, and the passing run used a fresh directory. No product defect is inferred.

The storage observations cover hash-addressed stored objects, including repository key metadata; they do not establish that every observed stored object is encrypted. File plaintext identifiers and stored-object identifiers describe different byte domains. The results do not measure deduplication ratios or backup performance.

## Validity and limitations

The single-chunk hypothesis is tested only within this corpus and release. The 511 KiB boundary fixture is useful coverage, not a proof for every byte sequence below the bound. Tree inspection relies on the vendor's decryption and decoding. SHA-256 equality is used as the implementation contract; this experiment does not study collision resistance. Source-assisted design, one operating system, repeated observations and a small corpus limit generalization. Build metadata is not a software bill of materials attestation. No native decompilation result is claimed for this study.

## Reproduction and preservation

From this project directory on Windows x64 with Node.js 24 or later:

```powershell
node acquire.mjs
node reproduce.mjs
```

Acquisition verifies the pinned archive and executable digests. Reproduction creates a fresh `artifacts/replays/` directory and preserves the published historical results. It does not delete any existing run. Set `RESTIC_STUDY_EXE` only to an executable with the recorded digest. Optional `node analyze.mjs` reruns the portable Go observation; set `REA_CLI` to the supporting source-built REA script as described in [TOOLING.md](../../TOOLING.md).

The full original distributable, raw REA evidence and repository replays are retained locally under `artifacts/`; reports, code, result observations and evidence summaries are published. Upstream restic is BSD-2-Clause; the retained license is in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt).

## Sources

- [Pinned release and distributable](https://github.com/restic/restic/releases/tag/v0.19.1).
- [Pinned repository design](https://github.com/restic/restic/blob/v0.19.1/doc/design.rst), which informed the plaintext/stored-object distinction.
- [Backup documentation](https://restic.readthedocs.io/en/stable/040_backup.html).
- Original artifact observations, [results.json](results.json), [claim ledger](CLAIMS.md), and local replay trees.
