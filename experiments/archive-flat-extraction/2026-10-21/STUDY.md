# Archive Files only extraction: a bounded compatibility study

Date: 2026-10-21. Status: the exact feature scenarios below passed hosted validation and independent evidence review. Full Archive replacement, all ten replacement products, universal parity and superiority remain unaccepted.

The Archive application now offers **Files only** extraction alongside the default **Full paths** mode. Files only removes containing directories from file destinations. It rejects colliding output basenames before creating destination parents. Full paths retains the archive's hierarchy and empty directories. This study evaluates that change in one pinned source revision.

## Research question and provenance

Do the recorded ZIP, 7Z and AES ZIP scenarios preserve file bytes and dates across native and original archive writers, while exposing directory and collision policy differences explicitly? Do actual browser requests demonstrate successful mode selection and refusal before destination creation?

The candidate is [source commit 27374c7](https://github.com/Ginderlax/rea-research-lab/commit/27374c78642d0086d5640fe25a887f5d8202dccc), parent [393a205](https://github.com/Ginderlax/rea-research-lab/commit/393a2051d4825a222056fb639441bce022e552c2). [GitHub Actions run 39671944556](https://github.com/Ginderlax/rea-research-lab/actions/runs/39671944556), attempt 1, completed three successful jobs on hosted `windows-2022`, Windows X64 and Node.js v24.16.0. Product computation occurred on those hosted runners; local work collected and reviewed recoverable evidence.

The original comparator was the whole 7-Zip 26.04 CLI and its paired library, acquired from pinned [official release assets](https://github.com/ip7z/7zip/releases/tag/26.04). The release was associated with source commit `9128b80e3a471108678e2b3ec3c985861c8d7b0f`; this association is not a reproducible-build proof. The installer SHA256 was `d54bf805f9f3704d1e8db2fa3498ae7ef2df0312b40b558e7c71c734430a665d`. Before and after each dedicated original command, the saved observations authenticated `7z.exe` (577536 bytes; SHA256 `95fff19b73eff77c87c0d7bd32822e43fb90dd2932459f962eb532d8dfb6ba53`) and `7z.dll` (1907712 bytes; SHA256 `899cd73d7fc60e1c1c35c7de0f5bed3dc69bfe2cecbd48014d868a347970a0b1`).

## Methods

The [pinned workflow](https://github.com/Ginderlax/rea-research-lab/blob/27374c78642d0086d5640fe25a887f5d8202dccc/.github/workflows/archive-zip-aes-cloud.yml) ran finite product tests, a dedicated original-comparison job, and real Chromium scenarios. [Finite](https://github.com/Ginderlax/rea-research-lab/blob/27374c78642d0086d5640fe25a887f5d8202dccc/products/rea-studio/experiments/archive-zip-aes/finite-roster.json) and [browser](https://github.com/Ginderlax/rea-research-lab/blob/27374c78642d0086d5640fe25a887f5d8202dccc/products/rea-studio/browser-tests/archive-zip-aes-roster.json) rosters identify the exact scope. The source admission manifest contains 183 eligible rows totaling 1956151 bytes; the source commit receipt accounts for 185 objects including its two metadata objects.

Finite evidence retained all 19 pre-flat modules and added two modules containing seven native/HTTP groups and four DOM groups. Dedicated comparisons retained eight ZIP AES groups and added four flat-extraction groups. Their command observers recorded completion, expected exits, bounded stdout/stderr identities, snapshots and paired CLI metadata. Five deliberately expected original nonzero exits were successful refusal checks. Older direct original invocations within retained finite modules retain their historical observer scope; they are not relabelled as the dedicated full-transcript protocol.

The new browser success case performed two actual HTTP 200 extractions, Files only then Full paths, and compared six portable file copies covering binary, Unicode and empty content. Changing the mode issued no request and cleared the previous result. The new collision case received actual HTTP 400 before destination parents existed, preserved the archive, wrote no partial files, cleared three password fields and displayed the error without stale success. Two screenshots were separately viewed by the root reviewer.

An independent semantic reviewer checked ordinary JSON and text evidence against the once-materialized inventory. A different reviewer qualified source admission, capture/filter records and backup provenance. No archive, executable, image or opaque binary was reopened or executed during those qualification reviews. Counts describe asserted scenarios, not independent statistical samples or a performance experiment.

## Results

| Evidence | Observed result |
| --- | --- |
| Finite product tests | 231 passes across 21 modules; 0 failed, cancelled, skipped or todo |
| Dedicated original groups | 12 passes: 8 retained ZIP AES and 4 new flat groups |
| Dedicated original commands | 56 completed: 29 retained and 27 new; 112 text streams and 51 snapshots joined |
| Real browser cases | 13 passes: 11 retained and 2 new; 0 unexpected, skipped, flaky or retried |
| New flat comparisons | ZIP, 7Z and AES ZIP in both writer directions; 18 original extraction observations |
| Browser resource diagnostics | 19 explicitly classified favicon 404 or expected refusal 400 messages; no unclassified case errors |

The recorded native/original flat/full scenarios matched file bytes and dates. Mode behavior is deliberately narrower than equivalence to every original command:

| Scenario | Native Files only | Pinned original observation |
| --- | --- | --- |
| Ordinary nested files | Basenames only; file bytes/dates preserved | `e` and `e -xtd` preserve the compared file bytes/dates; plain `e` also processes directory metadata |
| Directory-only archive | Creates an empty new destination; extracts zero files | `e` processes directory metadata; `e -xtd` creates no destination |
| Colliding basenames | Refuses before destination parents exist | `e` with explicit yes overwrite retains the later entry; `x` and native Full paths preserve both paths |

These are documented policy differences. Directory-mode equivalence and overwrite parity are not claimed. The retained AE1 comparison uses independently constructed specification fixtures accepted first by the original and then by the native reader; it does not claim that 7-Zip wrote AE1 fixtures.

## Recoverability and evidence identities

All three downloaded job artifacts were preserved locally in a portable layout: 1409 regular members totaling 13577131 bytes, with original logical names mapped to distinct numeric filenames. The once-only backup reader checked standard ZIP CRCs and exclusive SHA256 readback. This layout preserves Unicode name distinctions without relying on original paths being materializable on every filesystem.

Seven whole-source members per captured source phase were omitted by policy, for 42 omitted captured members across six before/after phases. Seven separately reconstructed pinned-Git source bodies totaling 135670 bytes close the local source recoverability condition; they remain labelled as reconstructed Git bodies, never captured or downloaded original snapshots. Artifact filtering and these recorded checks do not establish universal privacy or security.

`results.json` records artifact, report and qualification hashes. The direct hosted artifacts are linked there and may be subject to GitHub retention; verified local copies remain separate. Raw console streams, fixture contents, private machine paths and capability URLs are not republished in this study.

## Limits and next work

This validates the exact feature scenarios on one hosted platform and pinned comparator release. It does not measure speed, resource use or ease of use, prove universal filesystem/Unicode compatibility, or establish security, full product parity or superiority. Browser artifact copies were made by the owned fixture filesystem observer; the product has no download UI and actual browser downloads were zero. Empty green status bands remained visible in the two viewed screenshots and remain a known cosmetic limitation.

The next useful studies are additional documented feature gaps and supported-platform comparisons with similarly pinned evidence. Completion of this feature does not complete all ten replacement products.
