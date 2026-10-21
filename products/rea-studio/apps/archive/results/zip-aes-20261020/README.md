# Archive: classic ZIP AES-256 compatibility study

This publication contains a privacy-filtered representation of qualified product evidence. Complete originals are preserved in local backups; this study commits six derived exports rather than the six raw ZIPs. Its omissions and validity limits are explicit.

This study evaluates requirement `ARCHIVE.ZIP.WINZIP_AES256.001`: password-protected ZIP creation, inspection and extraction in REA Archive. It assesses a bounded classic WinZip AES subset against the released 7-Zip 26.04 command-line program. It does not establish complete replacement of 7-Zip, WinZip or the other nine products in this lab.

The tested product revision is [`482575f6232981cfeca05b89ba6b7e0b4cb81e30`](https://github.com/Ginderlax/rea-research-lab/commit/482575f6232981cfeca05b89ba6b7e0b4cb81e30), with sole parent `25c8ddea51bab236ee7e21218bc532afcc797fd6`. The export revision [`9ff4caac1cfb75e5df50245e7d455be2bc8b8b4d`](https://github.com/Ginderlax/rea-research-lab/commit/9ff4caac1cfb75e5df50245e7d455be2bc8b8b4d) is a separate packaging revision. This relative Git evidence publication has that export revision as its sole parent; its own commit hash is not embedded in its content. Neither export nor publication reruns the product tests or becomes the tested product revision.

## Results and experimental identity

| Hosted product role | Observed result | Run / attempt | Job |
| --- | --- | --- | --- |
| Archive regression | 219 passed; 19 physical modules | 39517385265 / 1 | 118952715702 |
| Released original comparison | Eight groups passed; 29 actual original commands | 39517385265 / 1 | 118952715972 |
| Browser workflows | 11 passed; zero retries | 39517385265 / 1 | 118952715765 |

The [product run](https://github.com/Ginderlax/rea-research-lab/actions/runs/39517385265) used GitHub-hosted Windows Server 2022, X64 and Node.js 24.16.0. Each role admitted 174 source files, 1,821,246 raw source bytes, the exact manifest and workflow, and the expected sole parent before and after execution. No runtime source overlay was used. File-mode assertions remain source-associated where a separate raw Git-mode proof was not retained.

The regression total contains 21 new groups: 11 core ZIP AES, five HTTP and five DOM groups. The other 198 are retained regression groups. The earlier 13-module selection contributes 161 of those retained passes; the retained formats, ZIP and Zstandard modules contribute 17, 10 and 10 respectively. These counts describe the admitted test selection, not complete original-product feature coverage.

Separate project agents reviewed the actual ordinary evidence and source/result bindings. Their scoped data checks recorded 3,598 checks with zero failures for the finite role, 2,442 with zero failures for the original role, and 3,234 with zero failures for the browser role. This is independent review within the same research project, not external certification, a new product execution or a security audit. The public qualification summary will bind their result digests and explicit limitations.

A browser scenario, an original-comparison group and a finite test measure different things. They are not added into a quality or feature-coverage score.

## Research question and admitted behavior

Can the implementation exchange classic AES-256 ZIP files with the released original, preserve selected file bytes, logical paths and recorded file timestamps, and refuse the selected authentication and layout failures before extraction writes?

The subset consists of AE-2 writing and AE-1/AE-2 reading, with stored and DEFLATE payloads. Writer passwords contain 1–99 characters from the admitted ASCII range U+0020–U+007F; boundary cases include DEL. Reader tests distinguish an explicitly supplied empty password from a missing password. The interface offers an explicit AES-256 ZIP choice and separate password controls, blocks duplicate operations while busy, and clears private fields after completion and disposal.

Names and comments remain visible and are not authenticated. AE-2 has no recorded content CRC, and its entries report that fact. AE-1 validates its recorded CRC as well as encrypted-payload authentication. Non-ASCII passwords, other AES strengths or GCM, ZipCrypto, encrypted ZIP64/descriptors/Zstandard, split archives and self-extracting or leading-prefix AES ZIPs are outside this subset. Existing unencrypted and 7Z behavior is supported here only by the retained regression assertions.

## Original, specification and corpus

The baseline is the whole released 7-Zip 26.04 CLI and its paired library, authenticated against recorded release and extracted-file hashes before and after original invocations. The upstream tag resolves to [`9128b80e3a471108678e2b3ec3c985861c8d7b0f`](https://github.com/ip7z/7zip/tree/9128b80e3a471108678e2b3ec3c985861c8d7b0f). This identity evidence does not establish a reproducible build from that source or signature inspection.

The format contract follows the [WinZip AES specification](https://www.winzip.com/en/support/aes-encryption/) and pinned upstream ZIP/AES source. The repository compatibility document records the implementation's subset. The complete WinZip HTML reference and vendor executable images are not republished.

The synthetic corpus includes a 4,097-byte binary file, a 5,080-byte compressible payload, a zero-byte file, empty and nested directories, and a filename with astral, composed and decomposed Unicode characters. Full-corpus file timestamps are compared where the admitted protocol requires them; directory timestamps are not asserted equal. No real user archive or credential was used.

## Protocol

1. Authenticate checkout, sole parent, source closure, manifest, workflow and runtime before project execution. Recheck the same closure after each role, including failures.
2. Acquire the pinned original in a fresh owned cloud directory and record its executable/library identities. Capture bounded command streams, exit, close, deadline and size observations.
3. Generate stored and DEFLATE AES archives with the original and decode them with the replacement. Compare selected plaintext bytes, paths and recorded file timestamps. Preserve observed per-entry methods: a requested DEFLATE archive can legitimately store a zero-byte file.
4. Create fresh-salt AE-2 archives with the replacement. Require whole-original archive testing and extraction, then compare selected complete extraction trees. Randomized encrypted archive bytes are not expected to equal each other.
5. Construct AE-1 fixtures independently of the replacement. Require the original to accept each fixture before comparing native CRC and plaintext behavior. These are independently authored fixtures, not output claimed from an original AE-1 writer.
6. Exercise password boundaries, explicit empty reads, wrong passwords, verifier/ciphertext/tag mutations, CRC failures and malformed layouts. Preserve original and native refusals separately. Five original commands intentionally exit 2; those are successful observations of expected refusal, not successful extraction.
7. Exercise real browser create/list/extract controls, reload, Unicode bytes, held responses, wrong-password/tag refusal, field clearing and navigation disposal. Browser reload is not host restart; the finite HTTP groups contain their own actual host-restart assertions.

The successful original role reached all 29 original commands: 24 exited 0 and five had the expected exit 2. Its 58 stdout/stderr records retain 17,939 observed bytes, with zero recorded redactions. Acquisition bootstrap payloads have a different policy: vendor executable stdout bytes are omitted with recorded identities and a reason. The command index must keep those evidence categories distinct.

## Failed iteration and narrow repair

The first source, [`25c8ddea51bab236ee7e21218bc532afcc797fd6`](https://github.com/Ginderlax/rea-research-lab/commit/25c8ddea51bab236ee7e21218bc532afcc797fd6), ran as [39516207677, attempt 1](https://github.com/Ginderlax/rea-research-lab/actions/runs/39516207677). Its regression and browser roles passed, but only four of eight original-comparison groups passed. Four groups and the strict completion hook failed. Only 17 of the planned 29 original commands were reached.

The comparison recorder spread CAS metadata over logical filenames in normal and failure tree snapshots. Compared byte counts and hashes matched, while the logical-path comparison correctly failed. Eighty-eight recorded file rows lost their logical names. They are not reconstructed or promoted into successful tree evidence.

The repair retains logical `path` separately from CAS `objectPath` in two recorder producers. Product code and test assertions remain byte-identical. Other changed metadata binds the new parent, source manifest and workflow. Source `482575f6232981cfeca05b89ba6b7e0b4cb81e30` received a new complete three-role run. No historical receipt was rebound, and the failed iteration remains a separate result.

## Public evidence is a privacy-filtered representation

The six original artifact downloads remain unchanged in recoverable local backups. Their original artifact IDs, outer/inner byte counts and SHA-256 digests remain in public provenance, while the six raw complete ZIP files are not committed in this study. Preliminary review found absolute user-profile paths inside inherited source metadata. Publication therefore uses six separately named **privacy-filtered derived exports**, covering all three roles of both iterations.

This repository is public. Retained GitHub Actions artifacts have a separate access policy: [GitHub documents artifact downloads](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts) for signed-in users with repository read access while artifacts remain available. This study does not claim that original cloud artifacts were private, that earlier artifacts or public Git history were removed, or that earlier exposure was reversed. Some omitted source-path metadata was already inherited from public Git history. Filtering avoids new permanent duplicates in this study; it does not erase that history. Before any further new product cloud run, a reviewed fail-closed pre-upload filter must emit only safe evidence views, with no raw-upload fallback. Complete source-admission checks remain required; omitted source contents need separately labeled, SHA-checked local pinned-Git backups. This evidence-only wording correction does not establish that future control, and already passing runs are not rerun for sanitization.

The authenticated export input inventory contained 2,452 members and 26,064,306 uncompressed bytes. The completed export omitted 72 whole members totaling 1,395,804 bytes and retained 2,380 unchanged members totaling 24,668,502 bytes. These are observed export/identity counts, not additional product tests.

The omitted members are six source files in each before/after snapshot of each artifact. Five contain inherited historical provenance or validation metadata; the sixth is a source-test literal that matches the generic profile rule. Source snapshots receive no runner exception. An omission manifest records original relative member names, lengths, SHA-256 digests and generic reason codes, without matched profile values or snippets. Kept members are copied byte-exact; omitted members are not redacted in place.

The separate export workflow authenticates all six original API, source/run/job, outer/inner and member identities and the exact omission set before any retained member is copied. It retains permitted ordinary trees in its cloud backup, creates explicitly labeled filtered ZIPs, and reopens the new ZIPs to verify their permitted member sets, lengths and SHA-256 digests. It invokes no captured product source, original command or product test. Framework ZIP creation emits its own CRC fields; that export check is not a replay of product cryptography or an independent recomputation of original CRCs.

Actual export source: `9ff4caac1cfb75e5df50245e7d455be2bc8b8b4d`.<br>
Actual export run / attempt / job: `39535323687` / `1` / `119010527879`.<br>
Actual export artifact and scoped qualification: `12316234760`; `86a21a83ee5715b62804089495bc5eee58140d8909a81a9a2bac4e5af9871dce`.

The identities above come from completed, independently reviewed export evidence. The generic filter is scoped to these six authenticated inputs; it is not a universal detector of secrets or private information.

An earlier export-only attempt, source `ee1129a4d0aec5794b88fddf9b5be33d76ed2035` in [run 39533977185](https://github.com/Ginderlax/rea-research-lab/actions/runs/39533977185), failed during checkout because inherited Windows paths exceeded the default Git path limit. Source admission and the exporter did not execute, no product tests ran, and no artifact was produced. Its failure is preserved separately. Sibling source 9ff4caac1cfb75e5df50245e7d455be2bc8b8b4d enabled long paths before checkout and completed export run 39535323687, attempt 1 successfully. It performed packaging and identity checks only. This packaging failure does not replace or alter the product results above.

The public source snapshots are incomplete. A reader can audit retained bytes, the original identity indexes and explicit omissions, but cannot reconstruct the omitted source contents from these exports alone. Passing source admission in the complete original evidence retained in backups must not be relabeled as complete source availability within these filtered study exports.

## Evidence files and reproduction

The file inventory is recorded in `checksums.json`. The layout is:

- `privacy-filtered/`: six named derived ZIP exports, their complete omission and retained-member manifests, and normalized actual export provenance. They are not raw complete artifact archives.
- `logs/`: the six original job logs, only after final privacy approval of their exact bytes.
- `screenshots/`: the 11 original repaired-source browser images, after exact identity and privacy approval.
- `source-and-runtime.json`: original product source/run/job/artifact bindings, distinct future export identities, and source availability limits.
- `finite-results.json`, `browser-results.json`, `original-comparisons.json`: normalized scoped observations.
- `original-commands.json`: the 29 actual command/stream indexes, retaining expected refusals as refusals.
- `failure-history.json`: the first failed source and narrow recorder repair.
- `requirements-matrix.json` and `original-identity.json`: admitted requirements, evidence categories, baseline hashes and unsupported scope.
- `independent-qualification.json`: project review scopes, result digests, unresolved limitations and final privacy/export bindings.
- `checksums.json`: final published file lengths and SHA-256 digests, explicitly excluding itself.

Reproduction requires fresh actual execution identities and evidence. Do not relabel old receipts, substitute a later commit, waive source/parent gates, or reuse a once-reader output to manufacture a new pass. Recoverable local backup/readback, product execution, semantic qualification and filtered publication are separate operations.

## Interpretation and limits

These results support the admitted corpus, operations, runtime and refusal cases. They do not measure a performance advantage, broad usability preference, general security assurance, complete feature parity or superiority. This bounded synthetic corpus does not represent every real archive. Original release provenance, independently authored AE-1 fixtures, native-generated AE-2 archives and source-associated assertions remain distinct evidence categories.

Browser evidence covers one Chromium version. It does not establish other browsers or operating systems, accessibility, long-term operation, host restart or independently measured browser-context closure. Request bodies, password bytes, token headers and traces are deliberately absent. File absence, disabled controls and all-three-field clearing combine executed source-associated assertions with recorded observations; no final workspace inventory or DOM snapshot is retained for independent replay.

The 11 screenshots were inspected as pixels within this project. They show lower interface cards; only the visible inspection password field is blank in those frames. Creation fields and global status are above the viewport, and two disposal images show Lab Editor. The tag-refusal image retains the green result of an earlier successful extraction. Its current refusal is supported by the recorded HTTP 400, no-new-destination assertion and case record; that earlier green panel is not evidence that the rejected operation succeeded. This remains a documented presentation limitation and a proposed future UX regression, not a corrected behavior measured by this study.

Cleanup claims follow the observations actually retained. They do not prove host-wide deletion, cache removal or memory erasure. The original-comparison creator working directory is source-associated rather than a separate recorded per-command field. Older regression original fixtures retain their earlier, narrower evidence policy, including vector metadata without all payloads in these artifacts.

All ten replacement products remain under development. The separately recorded Notes audit failure remains unwaived. This study supports neither full-product completion nor “better in every way.”
