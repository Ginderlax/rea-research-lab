# Reproducing the KeePass OTP experiment

The recommended entry point is `python reproduce.py`. It uses the published synthetic corpus and captured released-assembly responses, creates a new directory under `artifacts/`, and leaves every historical observation unchanged. Python 3.10 or later is sufficient for this portable replay. Expected results are 485 passes, zero failures, 485 literal input tuples, 430 normalized tuples, and ten passing RFC 4226 known answers within the same 485 rows.

## Obtaining the original artifact

The study archive is [KeePass 2.61.1 portable](https://github.com/JiriSko/KeePass/releases/download/v2.61.1/KeePass-2.61.1.zip), obtained from a third-party mirror and verified against the [official integrity page](https://keepass.info/integrity.html). Its SHA256 must be `3952354db9b117e906f7cd4f9f5591065b95186472370da47f46f3e246fea864`. Extract into `artifacts/portable/` in this project. The extracted `KeePass.exe` must have SHA256 `04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a`. Do not substitute a newer release or ignore a mismatched digest.

Archives and runtimes are available in the original local study but are excluded from the Git repository. A fresh clone can perform captured replay immediately; live replay requires reacquisition or a separate copy of the matching artifact.

## Calling the original functions

On Windows, run:

```powershell
python reproduce.py --live
```

Or provide an explicit artifact path:

```powershell
python reproduce.py --live --assembly 'D:\study-artifacts\KeePass.exe'
```

The wrapper verifies the executable hash before invoking Windows PowerShell. It supplies only generated keys and explicit times to the OTP functions and saves the new oracle and verification under a fresh run directory. It does not open a vault, GUI, account, or user configuration. A successful captured replay is recorded as `captured-oracle-replay`; only `--live` collects new execution evidence.

The historical `reconstruction/verify.py` is retained for methodological inspection. Its default writes into `evidence/`, so it is not the preservation-safe replay command. The new wrapper uses the existing corpus; the historical generator records seed `76112026` and the case construction.

## Repeating the selected REA analysis

The selected-type analysis requires the source runtime built from commit `abc8c6dadf4f11b67de1cc2ee96bb55047416d71`; the released package 6.4.0 did not expose the same selection option. From the lab root, set a fresh output directory and use the rebuilt CLI:

```powershell
$run = Join-Path 'projects/07-keepass/artifacts' ('rea-replay-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $run | Out-Null
node tooling/rea-main/scripts/rea.mjs inspect-managed-artifact projects/07-keepass/artifacts/portable/KeePass.exe --json > (Join-Path $run 'identity.json')
node tooling/rea-main/scripts/rea.mjs inspect-managed-members projects/07-keepass/artifacts/portable/KeePass.exe --type KeePassLib.Cryptography.HmacOtp --json > (Join-Path $run 'members.json')
```

These are reproduction commands derived from the saved Evidence operations and inspected CLI schema; they are not a verbatim timestamped transcript of the historical shell session. Confirm the result's executable hash, MVID, selected type, and coverage before using new coordinates. Full unrestricted member admission previously exceeded the 64 MiB representation budget; a failure there is not evidence that the selected type failed.

## Interpretation

The implementation accepts the disclosed unsigned counter and digit domains and explicit nonnegative integer Unix seconds. It is a research compatibility model. The scope excludes current-clock behavior, negative epochs, native side channels, vault handling, and all other KeePass functions. Original evidence and the reconstruction were visible to the same investigator; this was not a clean-room study.
