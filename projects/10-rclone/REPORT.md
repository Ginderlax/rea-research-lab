# Project 10: rclone's synthetic obfuscation wire format

## Abstract

This study reconstructs the output relation of `rclone obscure` in the released Windows x64 v1.75.2 executable. Public version-pinned implementation references informed an AES-CTR record model, while REA supplied byte-specific Go build inventory. Using only generated text, 115 CLI executions produced 230 passing differential assertions and 115 passing length assertions. The reconstruction decodes each original output and reproduces it exactly when given that output's recorded random IV. A preserved initial counterexample identifies a distinction between a literal hyphen and piped-input handling. The study demonstrates a source-assisted protocol reconstruction, not automated native algorithm recovery, authentication analysis or recovery of account credentials.

## Motivation, questions and hypotheses

Configuration interoperability depends on byte encoding, randomness and CLI preprocessing as well as the cryptographic primitive. A model that accepts the correct primitive but the wrong effective text is incompatible.

RQ1 asks which build and dependency claims REA can observe from the shipped artifact. RQ2 asks whether a separately implemented encoder and decoder agree with the original CLI on generated UTF-8 text. RQ3 asks how the CLI selects text for a hyphen argument and a non-character stdin stream.

H1 predicts an unpadded base64url record containing a 16-byte IV followed by the AES-256-CTR transformation of effective UTF-8 input. H2 predicts exact original-output reconstruction when the original IV is reused. H3 initially predicted that every argument is used literally; the first experiment falsified that prediction for a hyphen supplied with a pipe at EOF.

## Artifact identity and actual REA coverage

The [v1.75.2 release](https://github.com/rclone/rclone/releases/tag/v1.75.2) provides the pinned Windows archive. SHA-256 `8a9db2bad1dc79a65b3348fd857069598e2aab7cf4d118b77b1df23055aff818` matches its retained publisher digest. The executable is 85,500,928 bytes, SHA-256 `41eab3e118d264920b62c3327966c5ece0dc4dd715ee617d9e30450d8ead95a4`. [artifact-manifest.json](artifact-manifest.json) records original URLs and acquisition identity.

REA's source-built `inspect-go-binary` completed at commit `abc8c6dadf4f11b67de1cc2ee96bb55047416d71`. Evidence `ev_452ecd8d19932dba9a11b1f891362d6977a5ef0c862b9ecfe0c0f0ae6dade513` observes an embedded build header at offset 80,255,488, a `go1.26.9` claim, module path `github.com/rclone/rclone`, and 240 dependency records. This is shipped-artifact evidence with observed confidence. It does not recover functions, prove execution paths or authenticate the build.

Optional native work did not produce a successful rclone decompilation. The isolated source build lacked the published Windows native addon, causing a provider-unavailable result. A subsequent native search using the published REA 6.4.0 runtime was cancelled because the large Go import competed with the native studies for memory. Both outcomes remain local and are summarized in [rea-evidence-summary.json](rea-evidence-summary.json). They are limitations of this method run, not rclone defects.

## Source-assisted reconstruction

The [version-pinned format implementation](https://github.com/rclone/rclone/blob/v1.75.2/fs/config/obscure/obscure.go) and [CLI implementation](https://github.com/rclone/rclone/blob/v1.75.2/cmd/obscure/obscure.go) were consulted. The record structure and published format constant were not independently inferred by REA. The researcher wrote a separate JavaScript implementation in [reconstruction.mjs](reconstruction.mjs), using standard Node.js cryptographic primitives. There was no clean-room separation or blinded evaluation.

The encoder accepts an explicit 16-byte IV and synthetic UTF-8 text, transforms the text with the public format's AES-256-CTR parameters, prefixes the IV, and returns unpadded base64url. The decoder reverses that operation for this valid-record domain. Its malformed-input handling is not claimed equivalent to rclone's private Go API. CLI preprocessing is modeled separately: a hyphen with non-character stdin selects the first input line, strips the line ending, and produces empty text when the stream is already at EOF.

The upstream [command documentation](https://rclone.org/commands/rclone_obscure/) describes obfuscation as protection against casual observation and distinguishes it from configuration-file encryption. The study uses that intended contract and makes no assertion that the format provides authenticated secret storage.

## Experiment and results

The harness verifies the original executable digest before execution and supplies `--config NUL`, avoiding the user's configuration. Every input is generated for this study. The fixed seed is `0x5eeda175`. The corpus contains twelve explicit argument fixtures, seventeen length fixtures through 4,096 characters, eighty seeded generated strings, and six piped-input fixtures. Empty strings, spaces, quotes, tabs, embedded line breaks, Japanese text and an emoji are represented.

For each of 115 original outputs, the harness checks record length against 16 plus the effective UTF-8 byte count, decodes the original token with our model, and re-encodes the original IV and expected text to obtain the exact original token. [results.json](results.json) preserves all generated inputs and original outputs: 230 differential assertions and 115 length assertions pass with zero mismatches. The sample contains 115 distinct IVs. That count is a finite observation and does not establish randomness quality or uniqueness beyond this sample.

[initial-counterexample.json](initial-counterexample.json) records the first failed expectation: an argument `-` with empty piped input yielded an empty plaintext record, not a one-byte hyphen. The original implementation explains the boundary through stdin device type and scanner behavior. The documentation's no-input statement should therefore not be generalized to an empty pipe. Character-device terminal behavior was not executed and remains untested.

[harness-correction.json](harness-correction.json) records a separate input-harness error: generated leading-hyphen text was initially interpreted as an option. The corrected invocation uses the CLI's end-of-options separator. This is not a product defect. Only the corrected corpus is counted in the passing result.

## Validity and scope

Agreement concerns the declared valid UTF-8 record relation, the acquired executable and a non-character stdin stream below the scanner limit. There are repeated effective texts in the fixture set; assertion counts are not independent samples. Reusing the observed IV intentionally controls the nondeterministic prefix and avoids comparing separate random draws. Source consultation reduces inference independence. Error messages, allocation limits, character-device stdin, arbitrary non-UTF-8 bytes, RNG failure paths, malformed-token compatibility and remote backend operations are not reconstructed.

No real configuration file, access token, storage account or credential enters the corpus. The public protocol constant is part of the released format, not a recovered user secret. No complete-cloud-service or whole-rclone equivalence is claimed.

## Reproduction, preservation and license

From this project directory on Windows x64 with Node.js 24 or later:

```powershell
node acquire.mjs
node reproduce.mjs
node reconstruction.mjs
```

Acquisition verifies pinned archive and executable digests. Each reproduction stores a new result under ignored `artifacts/replays/` and preserves the published original result. `RCLONE_STUDY_EXE` must identify the same recorded binary. Optional `node analyze.mjs` recreates the portable Go evidence using the supporting source-built `REA_CLI`; see [TOOLING.md](../../TOOLING.md).

Original distributables and full evidence remain local. Reports, reconstruction, harness, result observations and selected evidence summaries are published. rclone's upstream MIT license and attribution are retained in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt).

## Sources

- [Pinned release](https://github.com/rclone/rclone/releases/tag/v1.75.2).
- [Format implementation at the acquired version](https://github.com/rclone/rclone/blob/v1.75.2/fs/config/obscure/obscure.go).
- [CLI preprocessing at the acquired version](https://github.com/rclone/rclone/blob/v1.75.2/cmd/obscure/obscure.go).
- [Published command documentation](https://rclone.org/commands/rclone_obscure/).
- Original observations in [results.json](results.json), [claim ledger](CLAIMS.md), and the retained local REA outputs.
