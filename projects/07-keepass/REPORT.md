# KeePass one time password compatibility study

## Abstract

This study reconstructs a narrow, useful part of KeePass 2.61.1: the behavior of `KeePassLib.Cryptography.HmacOtp` when supplied synthetic keys, explicit counters, and explicit nonnegative UTC times. REA identified the released .NET assembly and decoded the selected type's five CIL method bodies. A separate Python implementation agreed with 485 captured calls to the released assembly, including the ten RFC 4226 known answers. Agreement covers this finite corpus and the stated input domain; it does not establish whole-program equivalence or the security of a password vault. The principal compatibility findings are case-sensitive algorithm selection, the strict upper boundary for an explicit truncation offset, optional checksum formatting, and the default time step.

## Research questions and hypotheses

The question is whether artifact-bound managed analysis can expose enough observable behavior to reproduce an OTP component independently of its original assembly. The practical motivation is interoperability: an implementation that produces the right standard examples can still disagree with a deployed program at default values, unsupported labels, or offset boundaries.

H1 predicts exact string agreement for the predefined synthetic corpus. H2 predicts that explicit offset `digest_length - 4` is rejected in favor of dynamic truncation, even though four digest bytes remain. H3 predicts that a zero time step selects 30 seconds. These are implementation compatibility hypotheses, rather than claims about desirable behavior or vulnerabilities.

## Artifact provenance

The target is the portable KeePass 2.61.1 distribution, announced by the [official download page](https://keepass.info/download.html). Initial SourceForge and mirror requests returned HTML instead of an archive; those responses remain under `artifacts/` and were not analyzed as software. The successful download came from the [JiriSko mirror release](https://github.com/JiriSko/KeePass/releases/tag/v2.61.1). The downloaded archive's exact bytes and size match the values published by the [KeePass integrity page](https://keepass.info/integrity.html). This verifies equality to the publisher's advertised digest; an OpenPGP signature was not verified.

| Object | Bytes | SHA256 |
| --- | ---: | --- |
| KeePass 2.61.1 portable ZIP | 2,898,806 | `3952354db9b117e906f7cd4f9f5591065b95186472370da47f46f3e246fea864` |
| Extracted KeePass.exe | 3,265,880 | `04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a` |

REA reports assembly version `2.61.1.0`, MVID `14d03ed7-ceda-4666-8636-f796da165fa4`, and an IL-only managed PE. The physical PE machine is x86, while the managed classification is AnyCPU; these labels describe different layers. The assembly's strong-name metadata is observed identity information, not an independent trust decision.

## Methods and evidence

The study uses REA's built-in managed static provider, supplemental reflection to read and resolve CIL and static tables, original-function calls as an oracle, and a Python reconstruction. The process is classified conservatively as source-assisted and investigator-assisted. It was not conducted by independent source-blind teams, and no experiment isolates REA's incremental contribution from standards, prior knowledge, and supplemental inspection.

| Evidence | Operation and scope | Stable coordinate |
| --- | --- | --- |
| [managed identity](evidence/managed-identity.json) | `inspect_managed_artifact`, complete admitted metadata | `ev_6fc1c6e422a7043ac0b762edb358ebfa3f7e54939a5f15ed90601c8940300f53`; CLI header file offset 520 |
| [selected members](evidence/managed-hmacotp.json) | `inspect_managed_members`, selected HmacOtp type, complete selection coverage | `ev_80db52861a29dee461a0931afbaafbf4ad1e43ee4a49e33d1345b71f8244b78b`; type token `0x02000269` |
| [readable CIL](evidence/hmacotp-cil.txt) | Supplemental reflection disassembly and static table values | Method tokens `0x06002229` through `0x0600222d` |
| [original responses](evidence/oracle-results.json) | Execution of released OTP functions using synthetic keys | Executable SHA256 above; row IDs aligned with the saved corpus |
| [verification](evidence/verification.json) | Model versus original response comparison | 485 rows; seed `76112026` |

The main six-argument `Generate` method is token `0x0600222a`, method-header file offset 941,864, with 328 IL bytes and 161 decoded instructions. The method's IL SHA256 is `515bb64aca5e728a1da86c40ebf563f7569144acf1aed92a2efbd0426c6693c0`. The selected report includes the five-argument forwarding overload, checksum helper, time helper, and static initializer. “Complete” here describes those selected methods; callers and unselected types are outside that coverage.

The original unrestricted member inspection failed admission at a 67,108,864-byte representation budget. Its retained response, `artifacts/managed-members-full.json`, has Evidence ID `ev_232bf2e0677cfc2283adf8352e4e751dc1d055fd8c882a6ed88ec310dee108c4` and unavailable coverage. A rebuild of the saved REA source commit `abc8c6dadf4f11b67de1cc2ee96bb55047416d71` supplied exact type selection. It recovered the bounded member evidence without changing the original backup. The published package and saved source both advertise version 6.4.0 but expose different capabilities; the selected-type result belongs to the rebuilt source runtime.

## Reconstruction

The implementation in [otp_model.py](reconstruction/otp_model.py) uses Python's HMAC and digest primitives and has no dependency on KeePass. It converts the unsigned counter to eight big-endian bytes; computes the selected digest; obtains the dynamic offset from the low four bits of the last digest byte; reads four bytes, clears the high bit, and reduces modulo the requested decimal power. Optional checksum calculation alternates the observed doubling table and appends a decimal check digit. Formatting retains leading zeros.

Three details constrain compatibility. A null or empty algorithm label selects `HMAC-SHA-1`, while labels are otherwise case-sensitive and unsupported labels return the empty string. Digit count zero or greater than eight returns the empty string. The explicit offset is accepted only when `0 <= offset < digest_length - 4`; equality at the upper boundary selects dynamic truncation. CIL `IL_00CB` through `IL_00DB` supports this strict comparison. None of these observations establishes a security defect.

The time helper divides nonnegative integer Unix seconds by the requested step, with zero replaced by 30 seconds, then invokes the counter algorithm. The reconstructed time helper intentionally requires an explicit time. The original overload's current-clock behavior, negative epochs, date conversion outside the tested range, and unspecified local time zones are excluded.

## Experimental design and results

The corpus comprises ten RFC 4226 examples, 245 combinations of algorithm labels, digit boundaries, and truncation offsets, 200 seeded cases varying key length and counter extremes, and 30 explicit-time cases. Keys include null and empty values; counters include unsigned 64-bit maximum; digests include SHA1, SHA256, and SHA512. The test scope is exact returned strings and recorded exceptions, rather than timing, side channels, performance, or secret management.

All **485 of 485 original-versus-model comparisons passed**, with zero recorded oracle errors or mismatches. All ten [RFC 4226 Appendix D examples](https://www.rfc-editor.org/rfc/rfc4226) also matched. The known answers are part of the 485 comparisons, rather than ten additional differential observations.

There are **485 distinct literal input tuples**, after excluding case identifiers. There are **430 distinct normalized tuples** if null keys become empty keys, null or empty algorithm labels become `HMAC-SHA-1`, and zero time steps become 30. Normalization documents tested aliases; it does not turn correlated cases into independent statistical samples. An earlier audit estimate of 466 was not reproducible from the saved corpus. A preservation-safe replay initially asserted that estimate and failed despite all behavior comparisons passing; the constraint was corrected and the failed replay retained. This was a reporting error, not a product defect.

The corpus was not preregistered, and the investigator had access to the observations used to construct the model. The result therefore supports compatibility on a disclosed finite corpus, rather than a blind prediction score or formal proof. The [claim ledger](claims.json) distinguishes static observations, original execution, reconstruction decisions, and excluded claims.

## Reproduction and preservation

From this project directory, run `python reproduce.py` with Python 3.10 or later. This checks the reconstruction against captured original observations, verifies row identity and count, computes uniqueness, and saves results into a new `artifacts/replay-...` directory. It does not load the original application. The default replay was verified with Python 3.14.5.

On Windows, `python reproduce.py --live` additionally verifies the local assembly SHA256 and calls only the released OTP methods using the saved synthetic corpus. Windows PowerShell and .NET Framework must be available, and `artifacts/portable/KeePass.exe` must match the manifest. A different path can be supplied using `--assembly`. Each run writes fresh outputs and preserves historical evidence. The legacy `reconstruction/verify.py` remains as a record of the original experiment and overwrites evidence files if executed; use the new wrapper for repetition.

[REPRODUCE.md](REPRODUCE.md) supplies artifact acquisition, selected REA inspection, and replay details. Original archives, HTML failures, and portable runtimes are retained locally and excluded from Git. The publication retains scripts, captured synthetic observations, evidence, manifest, report, and license notices.

## Threats to validity and conclusion

Finite testing cannot exhaust the unsigned counter, key, and string domains. The Python model assumes the disclosed argument domain and normal cryptographic primitive operation; it does not model all CLR exception, allocation, disposal, or platform behaviors. Supplemental reflection loads the assembly and reads its static fields, so it is different from REA's nonexecuting static inspection. The method coordinates and findings bind to this exact executable, not future KeePass releases. OTP compatibility cannot establish vault encryption correctness, database format equivalence, attack resistance, or the safety of a production authenticator.

Within these limits, the study demonstrates a useful REA workflow: bind a released managed artifact to precise identity, reduce a resource-limited analysis to the relevant type, retain build-local method coordinates, and validate a small reconstruction against original behavior. The reproduced component supports interoperability research, while the rest of KeePass remains outside the reconstructed scope.
