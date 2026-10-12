# 7-Zip native format property reconstruction study

## Abstract

This study reconstructs the archive-format property dispatch behavior of the x64 `7za.dll` supplied with 7-Zip Extra 26.04. REA's Ghidra provider recovered native pseudocode, a format-count global, and references to that global. A Python model combined the recovered control flow with descriptor constants calibrated from released export calls. It agreed with all 400 comparison rows: 255 distinct input pairs, including 207 distinct pairs absent from calibration. Eleven separate tests check only the model's candidate signature rule. The outcome demonstrates recovery of a useful native metadata interface; it does not reconstruct archive compression, decompression, or complete archive validation.

## Research questions and hypotheses

Archive tooling needs to identify supported formats and interpret plugin properties before choosing a handler. These decisions are a meaningful native compatibility boundary, although they are much smaller than a compressor. The research question is whether native pseudocode and original export observations suffice to reproduce that boundary without loading the DLL in the model.

H1 predicts agreement in HRESULT, variant type, and serialized value for all disclosed test pairs. H2 predicts that format indices at or beyond the observed count return `0x80070057`, while unknown property identifiers on a valid format return a successful empty variant. H3 predicts that six signature bytes can define a candidate classifier, but cannot establish archive validity. H3 is a scope constraint: its model-only tests must not be counted as original-versus-model archive tests.

## Artifact provenance

The artifact originates from the [upstream 7-Zip release 26.04](https://github.com/ip7z/7zip/releases/tag/26.04). Release asset metadata and advertised digest are retained in [release-metadata.json](evidence/release-metadata.json). Both the Extra archive and extraction utility match their release asset digests. The analyzed object is specifically the x64 `7za.dll` inside the Extra archive. It is not the full product's `7z.dll` and not the x86 file with the same base name.

| Object | Bytes | SHA256 |
| --- | ---: | --- |
| 7z2604 extra archive | 1,764,616 | `dc4b11d3399db18b063630137145f5585d8f7ac847bf3639bd1185d7d1f7cee0` |
| 7zr extraction utility | 602,624 | `256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282` |
| Extra x64 7za.dll | 416,256 | `e70d353e9a0f2d1755ab0a7a7100060ab1e70e47141c248e968364579a329a94` |

Digest agreement establishes equality to the published release assets. No reproducible-build or independent signature claim follows. Acquisition date is October 12, 2026; [artifact-manifest.json](artifact-manifest.json) binds the local relative paths, hashes, and upstream URLs.

## Methods and evidence

REA package 6.4.0 supplied the packaged Windows native bridge. The provider used portable Ghidra 12.1.4 and a compatible portable JDK 21, with child-process environment configuration. The provider admitted the native x86_64 PE DLL and completed default analysis before exposing results. The experiment is conservatively classified as source-assisted and investigator-assisted: it was not a source-blind, independently implemented clean-room protocol, and the contribution of REA was not compared with an unaided baseline.

| Evidence | Observation | Scope and coordinate |
| --- | --- | --- |
| [native overview](evidence/native-overview.json) | 1,639 procedures and 145 defined strings | `ev_ccae51bca70feb437fa65620e87de16334736d3657c1b976599e8ba42be7efa4` |
| [property dispatch pseudocode](evidence/handler-property-decompile.json) | `GetHandlerProperty2` control flow | `ev_65c0f7468d1adf66fffc786aa482e6eada5b790de086efef944941e155fc0007`; address `0x1000d9cc` |
| [format count pseudocode](evidence/registrar-decompile.json) | `GetNumberOfFormats` reads `DAT_10060770` | `ev_58d5fc14cc4125d08cd905f9238fe8e70d7b6af53fdeeb43e29d1b2c3cb880fe`; address `0x1000dc7c` |
| [registry global references](evidence/format-registry-xrefs-retry.json) | Six references to `0x10060770` | `ev_ea7c7f3d981185ede8916f0150273515b9bd2aa79050d9432cc8ab646c3c00cc` |
| [calibration calls](evidence/native-oracle.json) | 48 original export rows and one format | Hash-bound native DLL execution |
| [comparison calls](evidence/heldout-oracle.json) | 400 original export rows | Seeded and boundary integer pairs |

The file named `registrar-decompile.json` contains `GetNumberOfFormats` pseudocode; its historical filename does not establish that a registration procedure was recovered. The six global references are `0x1000d848`, `0x1000d885`, `0x1000d92e`, `0x1000d9ec`, `0x1000dc7c`, and `0x1000dc88`. Addresses are relative to the selected analysis image and meaningful only with the exact target hash and provider evidence.

Two failures qualify provider coverage. `evidence/pe-layout.json` records that the separate pwntools layout facet supports Linux x64 only, and therefore did not inspect this PE. The initial global-reference request failed when the JVM could not allocate memory during concurrent work. Its failure response and crash diagnostics remain preserved. A later bounded retry succeeded and yielded the six references above. The successful native evidence is valid for these operations, rather than proof that every REA facet supports Windows PE.

## Reconstruction

[property_model.py](reconstruction/property_model.py) is an executable Python model without a DLL dependency. It reproduces the reported format count of one and the property dispatch observable through a well-formed `GetHandlerProperty2` call. Each result records input index, property identifier, HRESULT, variant type, and serialized value. Text BSTRs become Unicode strings; binary BSTRs become exact hexadecimal byte sequences; booleans and integers use the normalization performed by the local oracle adapter.

Recovered pseudocode checks the format index before reading a descriptor. On a valid index it dispatches identifiers 0 through 12; omitted or unavailable values remain empty. The code emits strings, a 16-byte format identifier, a signature, booleans derived from flags, an offset, and two flag words. Values observed for the single descriptor include name and extension `7z`, signature `377abcaf271c`, signature offset zero, flags 868360, time flags 1, and update capability true. These descriptor constants were calibrated using the original DLL, rather than inferred solely from pseudocode.

The property routine branches between signature properties 6 and 7 using flag bit 4. Property identifiers 5, 9, and 10 expose three other flag bits. An invalid format index returns `0x80070057`; an unknown property for index zero returns HRESULT zero and `VT_EMPTY`. The model assumes successful memory allocation and valid ABI arguments. Allocation failure, malformed output pointers, callback behavior, and native object construction are excluded.

The candidate classifier tests whether bytes begin with the observed six-byte signature. It accepts that prefix followed by arbitrary invalid bytes; consequently its positive output means only “candidate 7z signature at offset zero.” It performs no header CRC, length, structural, decompression, or archive-integrity validation.

## Experimental design and results

The calibration collected 48 rows from indices 0, 1, and unsigned 32-bit maximum and from property identifiers 0 through 14 and unsigned maximum. The comparison corpus used six boundary indices across 24 property values, followed by 256 seeded selections, for 400 total rows. The seed is `726042026`. A local C# adapter loaded the released DLL, called `GetNumberOfFormats` and `GetHandlerProperty2`, serialized the returned PROPVARIANT-compatible data, and freed allocated variant contents. Inputs are synthetic integers; no user archives or remote services were involved.

All **400 of 400 comparison rows passed** with zero mismatches. The 400 rows contain **255 distinct index and property pairs**. Of these, **207 distinct pairs were absent from the calibration set**; 48 had already appeared during calibration. The historical `heldout` filenames therefore describe a mixed comparison set, not 400 wholly unseen observations. Many random invalid indices exercise the same rejection branch, so the row count should not be treated as 400 independent behavior classes.

The 11 candidate signature checks passed, including empty input, a five-byte prefix, the exact magic bytes, a prefixed near miss, arbitrary bytes after the magic, and six single-byte mutations. These are **model-only checks**. The original DLL was not asked to classify those byte arrays, and the checks are excluded from the 400 differential total.

The evidence supports the disclosed normalized export behavior for one descriptor. It does not establish exact equivalence for arbitrary native callers, all formats in other 7-Zip distributions, or archive decoding. [claims.json](claims.json) records these distinctions in machine-readable form.

## Reproduction and preservation

From this project directory, run `python reproduce.py` using Python 3.10 or later. It replays the saved original export responses, checks exact row alignment, recalculates distinct and novel input counts, and writes fresh results into `artifacts/replay-...`. This portable replay does not execute the original DLL. It was verified under Python 3.14.5.

On Windows x64, `python reproduce.py --live` verifies the local x64 DLL SHA256 before collecting new original responses into a fresh directory. Windows PowerShell must be available and must run as a 64-bit process. An alternate matching DLL location can be supplied with `--dll`. The wrapper calls only the disclosed export boundary. The original experiment scripts remain preserved under `reconstruction/`; their legacy defaults overwrite evidence files, so repeat experiments through the new wrapper.

[REPRODUCE.md](REPRODUCE.md) provides exact acquisition and REA invocation examples. The portable Ghidra and JDK installations, DLL, archive, snapshots, and JVM diagnostics stay local. The publication contains the bounded model, adapter source, captured observations, selected REA evidence, manifest, report, and licenses. No unnecessary native reimport was performed during finalization.

## Threats to validity and conclusion

Pseudocode is a decompiler's interpretation, rather than the original source or a formal semantic proof. Descriptor calibration introduces dependence on the oracle; the comparison set is disclosed with its overlap instead of described as independently blind. The serialization layer could conceal an ABI distinction, although binary BSTR bytes and returned variant types are retained. Successful provider operations can coexist with unsupported facets and resource failures. Finally, this single-format Extra DLL is a deliberately limited sample of a much larger product.

The study demonstrates how REA can turn native code into a reviewable, testable compatibility model: identify the export, recover its control flow and global references, calibrate descriptor data, and compare against released behavior. The result is useful for plugin metadata interoperability. A compression or decompression implementation would require a separate, substantially broader study.
