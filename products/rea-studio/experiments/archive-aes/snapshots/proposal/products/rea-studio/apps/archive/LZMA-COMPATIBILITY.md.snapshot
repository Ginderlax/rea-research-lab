# Genuine bounded LZMA/LZMA2 filesystem exchange

`lzma.mjs` decodes genuine raw LZMA and compressed/stored LZMA2 chunks.
`encode-lzma.mjs` writes adaptive range-coded literal/matched-literal and
normal length/distance match symbols. They are integrated into ordinary 7Z
data and headers, create/list/test/extract operations, and the interface's
LZMA/LZMA2 profiles, solid grouping and encoded headers. Ordinary original
default compressed data/headers are supported within the existing bounds.
No package, original executable/DLL, native binding, compiler or WASM supplies
the LZMA runtime. The work is explicitly source-assisted, not clean-room.

## Writer scope and limits

The three own profiles are fast (64 KiB dictionary / 4 searched candidates),
balanced (1 MiB / 16) and thorough (8 MiB / 64). They are not original `-mx`
level equivalents. The greedy three-byte hash/predecessor finder writes
normal matches of 3–273 bytes. It lacks rep/shortrep optimization, lazy/optimal
parse, bit-price search, binary trees and multithreading. Compression can be
worse than original 7-Zip; raw LZMA can expand incompressible input.

LZMA2 attempts real compression in independent chunks of 1–32 KiB (default
32 KiB), resets dictionary/state/properties per compressed chunk, and uses
dictionary-reset stored chunks when compression would not beat the raw
payload including framing. Stats distinguish adopted compressed matches and
stored input bytes. A stored-only stream is never labeled actual compression.
Resetting history loses cross-chunk and some solid-file compression benefits.
Chunk count is capped at 65,536 for writing / 100,000 for reading. It ends
with control zero. Trial output stops once it cannot win; work/time exceptions
propagate. Continued-state original encoding remains a gap.

Writing allows dictionary 4 KiB–8 MiB, search depth 1–64, `lc/lp/pb` 0–4 with
`lc + lp <= 4`, and optional raw LZMA end markers. LZMA2's advertised dictionary
is canonical and rounded up as necessary. Reading permits a declared
dictionary up to 64 MiB. Primitive input limits are 64 MiB encoding / 96 MiB
decoding, packed output 96 MiB and decoded output 64 MiB. Input accepts
Buffer/unshared Uint8Array only, checks intrinsic byte lengths before
allocation, and takes a zero-copy input view. Container bounds remain
16 MiB/file, 64 MiB/total, 96 MiB/container, 16 MiB/header and 10,000 entries.
Writer aggregate filename bytes are guarded before allocation.

The decoder checks properties, distances, state/reset transitions, range
initialization/finish, chunk lengths, declared expansion and consumed input.
The container rejects CRC mismatches, unexplained/overlapping packed bytes,
appended data and concatenated archives before extraction writes. Optional
absent content CRCs are accepted and reported as unrecorded for unencrypted folders.
The bounded AES slice adds selected AES+compression folders and encrypted
headers under [SEVENZIP-AES-COMPATIBILITY.md](SEVENZIP-AES-COMPATIBILITY.md);
the historical LZMA receipt does not bind those additions. Other
filters/complex pipelines, external streams, SFX/split volumes, original GUI,
other platforms, streaming and parallelism remain outside scope.

## Aggregate budgets and actual memory

Primitive optional `maxSteps`/`maxTimeMs` remain capped at 8 billion / 60 seconds.
HTTP operations and direct 7Z container operations additionally share one
`OperationBudget`, default 15 seconds and 2 billion counted units, across
collection, entry copies, all codec calls, header processing, CRCs and create's
read-back verification. It does not reset per file, chunk, header or codec.
API limits can be lowered or raised within 60 seconds / 8 billion units.
Time is checked every 4,096 units, between bounded operations, on completion
and before filesystem commit. Work counts coded bits, match comparisons/
inserts, output bytes and bounded container traversals/copies, not CPU
instructions. Zero limits and aggregate exhaustion reject without a successful
partial extraction. Checks are cooperative: native zlib, buffer fills/copies,
filesystem waits, garbage collection and scheduling cannot be interrupted.
There is no worker/process memory or CPU isolation.

Decoding keeps caller packed bytes, one bounded output/history buffer and
probabilities. Raw LZMA literal tables use `1536 * 2^(lc+lp)` bytes, up to
6 MiB, plus 3,692 base bytes. LZMA2 caps literal tables at 24,576 bytes plus
3,692 base. No separate full dictionary is allocated beside output.

Raw encoding uses caller input, a 256 KiB hash table, at most 32 MiB
predecessors (four bytes times min(input,dictionary)), 2,208 base probabilities
and at most 24,576 literal probability bytes. Output blocks remain live while
joining the final buffer, so two packed outputs plus unused final-block
capacity can coexist. LZMA2 reuses at most 128 KiB predecessors / 256 KiB hash
per chunk and the same probability cap. Trial blocks plus their joined buffer
can coexist; adopted trial buffers remain until joining outer output. Stored
chunks reference caller input until joined. Runtime/objects/garbage add more.

Solid container writing also retains normalized entry copies (up to 64 MiB),
joined solid input (64 MiB), encoded buffers, metadata and a separate final
container (up to 96 MiB), besides caller files. Reading holds archive, decoded
solid group (up to 64 MiB) and copied file outputs (up to 64 MiB); non-Buffer
input adds an archive copy. Encoded headers add decoded/copy buffers. Output
bounds and before/after benchmark memory samples are not peak RSS ceilings.

## Independent evidence and preserved validation history

Original complete 26.04 Windows x64 oracle executable/DLL bytes are
authenticated from the official installer before testing; they stay in
ignored private run folders. Decoder tests exercise original default data and
headers, both methods, nondefault properties, end markers, state/chunk
transitions, solid layouts, corruption/truncation, dictionary/expansion and
budget limits. Writer tests ask the original to test/extract both methods/all
own profiles, solid/separate folders, plain/encoded headers, Unicode, empty
files/directories, timestamps, random data and custom properties. HTTP tests
compare SHA256 content in both directions and after host restart. Current
source/test/fixture/browser identities are in `lzma-validation.json`.

The frozen writer stage had 64/64 tests, 46 `.7z` and 12 `.lzma` positive
original exchanges. The frozen decoder stage had 35/35 and 25 original-
produced positives. Historical large checks cover 16 MiB repetitive / 2 MiB
random inputs for all own profiles/both methods. Twelve ordinary archives
contain the exact measured packed streams and pass original digest extraction.
A full 64 MiB solid archive (four 16 MiB files, LZMA2 data/LZMA header) was
288,370 bytes and encoded in an observed 1,309.9 ms. These single staged
samples precede aggregate host integration: they are not current host
benchmarks, statistical guarantees or original compression speed/ratio parity.

The initial writer execution had six failed ratio assertions although all
original compatibility checks had passed. An arbitrary `<20%` threshold
missed actual 20.24–20.35% ratios. Exact manifest-authenticated source/test
versions and all six synthetic ordinary archive bytes (base64 with SHA) are
preserved under `results/lzma-stage/history/first-ratio-attempt`. The later
`<25%` threshold is labeled a **post-hoc validation adjustment**, not
preregistered performance success or original parity evidence. Final checks
require real compressed symbols and smaller-than-stored output for known
compressible fixtures; ratios are reported separately. Initial tool-result
summaries are labeled as summaries, not invented original TAP logs.

Pinned assistance is public-domain SDK26.04 LzmaEnc.c/Lzma2Enc.c/LzmaDec.c/
Lzma2Dec.c by Igor Pavlov and MIT lzma-purejs at commit
`75ed915fecef42a87abd754efede2271be18c786` by Gary Linscott, Juan Mellado and
C. Scott Ananian. Full permission notices remain in `LZMA-LICENSE.txt`.
Exact source URLs/SHA/line refs and staged receipts are under
`results/lzma-stage`; `lzma-provenance.json` records current derivation.
Historical receipt bytes remain unchanged. Full feature parity and improvement
in all ways remain false.
