# Reproducing the 7-Zip property experiment

The recommended entry point is `python reproduce.py`. It compares the bounded model with published captured export responses and saves a new result under `artifacts/`. Python 3.10 or later is sufficient for this portable replay. Expected results are 400 passes, zero failures, 255 distinct pairs, 207 distinct pairs absent from calibration, and 11 separate model-only signature checks.

## Obtaining the original artifact

The original [7z2604 Extra archive](https://github.com/ip7z/7zip/releases/download/26.04/7z2604-extra.7z) must have SHA256 `dc4b11d3399db18b063630137145f5585d8f7ac847bf3639bd1185d7d1f7cee0`. The upstream [7zr extractor](https://github.com/ip7z/7zip/releases/download/26.04/7zr.exe) used here must have SHA256 `256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282`. Extract the archive into `artifacts/extra/`. Use `artifacts/extra/x64/7za.dll`, with SHA256 `e70d353e9a0f2d1755ab0a7a7100060ab1e70e47141c248e968364579a329a94`; the other architectures are not interchangeable.

Published release metadata is saved with the study. The original archive, utility, and DLL are retained in the local copy and excluded from Git. A fresh clone can run captured replay without them.

## Calling the original exports

On Windows x64 with 64-bit Windows PowerShell, run:

```powershell
python reproduce.py --live
```

An alternate matching path can be supplied using `--dll`. The wrapper verifies its hash, then builds the local C# adapter in the PowerShell process and calls the two disclosed exports with synthetic integers. It writes oracle and verification outputs into a new run directory. It does not read or decompress user archives. The new `--live` run reuses the frozen comparison inputs; it does not silently regenerate a different random corpus.

Historical `reconstruction/verify.py` and its generator are retained, including seed `726042026`. Their defaults overwrite files under `evidence/`; use the preservation-safe wrapper for repetition. The comparison corpus includes 48 distinct calibration pairs, so the historical `heldout` names do not imply complete separation.

## Repeating the native REA operations

Native analysis needs REA package 6.4.0 with its packaged Windows bridge, portable Ghidra 12.1.4, and a compatible 64-bit JDK 21. The local source rebuild used for other studies does not contain the packaged native addon. Set `GHIDRA_INSTALL_DIR` and `JAVA_HOME` for the analysis child process, rather than changing machine-wide settings.

For a configured `REA_NATIVE_CLI` environment variable pointing to the released `scripts/rea.mjs`, the corresponding commands are:

```powershell
$dll = 'projects/08-7zip/artifacts/extra/x64/7za.dll'
$run = Join-Path 'projects/08-7zip/artifacts' ('rea-replay-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $run | Out-Null
node $env:REA_NATIVE_CLI inspect $dll --provider ghidra --json > (Join-Path $run 'overview.json')
node $env:REA_NATIVE_CLI decompile $dll GetHandlerProperty2 --provider ghidra --json > (Join-Path $run 'properties.json')
node $env:REA_NATIVE_CLI decompile $dll 0x1000dc7c --provider ghidra --json > (Join-Path $run 'format-count.json')
node $env:REA_NATIVE_CLI xrefs $dll 0x10060770 --provider ghidra --json > (Join-Path $run 'global-references.json')
```

These reproduction examples follow the saved Evidence operations and CLI command mapping; they are not a verbatim timestamped historical transcript. Verify the target hash and native image coordinates before using addresses. Each CLI invocation can import independently, so run these sequentially with adequate memory. The study already preserves successful native evidence; ordinary model replay does not require Ghidra.

## Interpretation

The modeled result is a normalized native property tuple under successful allocation and valid ABI use. Signature checks concern only a six-byte candidate prefix; they do not establish archive integrity. The study does not reconstruct compression, decompression, native plugin objects, RAR code, or the full 7-Zip product.
