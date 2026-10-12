# Bounded compressed LZMA/LZMA2 writer research

This ignored staging folder contains a genuine adaptive range encoder and
greedy LZMA match finder. It creates raw LZMA (method 030101), compressed LZMA2
(method 21), and ordinary `.7z` archives with genuinely compressed data and
optionally compressed headers. The original complete 7-Zip 26.04 Windows x64
console is only an authenticated independent test oracle. Runtime primitives
use standard JavaScript and typed byte buffers; they import no package,
original executable, DLL, compiler, native binding or WASM.

The production archive app remains frozen. This research has no production
HTTP or UI integration. Full feature parity, original compression ratio/speed
parity and improvement in all ways remain false. The complete product GUI,
other platforms, encrypted archives, multiple coder/filter pipelines,
ownership/ACL restoration, streaming and multithreading remain outside scope.

## Algorithm and profiles

`encodeLzma` emits literal/matched-literal symbols and real length/distance
matches using adaptive probability models, range coding, direct bits and
optional end markers. A three-byte hash and bounded predecessor chain find
matches of length 3 through 273. Its greedy parse has no repetition-match or
short-repetition optimization, lazy/optimal parse, bit-price search or binary
tree match finder. It can compress substantially worse than original 7-Zip.

| Own profile | Dictionary | Maximum chain candidates |
| --- | ---: | ---: |
| fast | 64 KiB | 4 |
| balanced | 1 MiB | 16 |
| thorough | 8 MiB | 64 |

These are new implementation profiles, without equivalence to original
`-mx` levels. A dictionary of 4 KiB through 8 MiB and search depth of 1 through
64 can be selected. `lc`, `lp` and `pb` are 0 through 4, with `lc + lp <= 4`.
LZMA2 advertises a valid canonical dictionary size rounded up when necessary.

`encodeLzma2` attempts genuinely compressed independent chunks (default and
maximum 32 KiB; minimum 1 KiB). Every compressed chunk resets its dictionary,
state and properties. A compressed trial must beat the raw chunk including
framing; otherwise it emits a documented stored chunk with dictionary reset.
The output ends with control byte zero. Trial output stops once it cannot
win, while work/time exceptions propagate. Stats distinguish compressed and
stored input bytes/chunks and count genuine matches only in adopted trials.
Resetting each chunk loses cross-chunk history and can make solid archives
larger. It is not the original encoder's continued-state strategy. Raw LZMA
does not have this fallback and can expand incompressible input.

The isolated container writer preserves the current app's bounded `.7z`
paths, UTF-16 names, metadata, varints, packed/unpacked/header CRCs and
one-coder-folder structure. `method: 'lzma'` and `'lzma2'` select these new
primitives; compressed header methods can be LZMA, LZMA2 or DEFLATE. Solid
groups join all file data before encoding. The copied, frozen decoder also
handles genuine compressed data/headers, including original default data.

## Bounds and memory

Primitive input accepts Buffer or unshared Uint8Array only, with intrinsic
byte length checked before copies or allocations. Strings, arrays, proxies,
SharedArrayBuffer and lying subclass getters cannot bypass size checks. The
primitive input cap is 64 MiB, output cap 96 MiB and encoder dictionary cap
8 MiB. The container retains 16 MiB per file, 64 MiB total, 10,000 entries,
and 96 MiB container limits. Existing reader dictionary cap remains 64 MiB.

Optional `maxSteps` (0 through 8 billion) and `maxTimeMs` (0 through 60,000)
bound work cooperatively. Work includes candidates/byte comparisons, hash
insertions, coded bits and output bytes. Time is checked every 4,096 units,
between chunks, at completion and around output concatenation. Zero limits
reject deterministically; small deadlines can overshoot. Allocation/fill,
native copies, garbage collection and scheduling are not process isolation.
The container forwards these optional limits separately to each primitive
operation. It has no aggregate deadline covering all files, headers, CRCs
and filesystem operations; a future host integration must add that budget.

The primitive uses the caller's byte storage without a full input copy.
Raw LZMA has a 256 KiB hash table, at most 32 MiB of predecessor storage
(four bytes times min(input size, dictionary)), and 2,208 bytes of base
probabilities plus `1,536 * 2^(lc+lp)` literal probability bytes (maximum
24,576). Encoded chunks remain live while the final packed buffer is joined,
so up to two packed outputs plus unused final block capacity can coexist.
This is additional to caller input, runtime/object overhead and garbage.

LZMA2 reuses its model/hash/predecessor arena across chunks: at most 128 KiB
predecessors, 256 KiB hash and the probability buffers above. A trial uses at
most chunk-size-minus-four output bytes; trial chunks plus the joined trial
can coexist. Adopted packed trial buffers remain live until the outer output
is joined, adding another complete packed output copy at that point. Stored
chunks reference the caller's input until joined. Chunk count is capped at
65,536 and each chunk checks time/work budget.

Container peak memory is larger: entry byte copies, up to 64 MiB joined solid
input, encoded chunk storage, final packed data, CRC/header data and joined
container can coexist. A solid read retains packed input, up to 64 MiB decoded
group data and up to 64 MiB copied file data. Output limits are not an RSS cap.
Benchmark before/after memory samples are observations, not measured peaks.

## Independent evidence and validation history

`encoder.test.mjs` authenticates both original executable/DLL and the earlier
frozen decoder receipt before testing. It exercises all three own profiles,
LZMA/LZMA2, solid and separate folders, plain and encoded headers, Unicode
paths, directories/empty files, millisecond timestamps, nondefault properties,
end markers, custom chunk sizes, incompressible data and allocation/budget
guards. Original `t` and extraction verify path/type and SHA256 content, plus
defined timestamps. Known compressible fixtures must contain genuine match
symbols and beat their stored baseline. Actual ratios are reported separately.

The initial execution `run-SxXTAn` had 58 tests: 52 passed and six failed
ratio assertions. All six original `t` and exact extraction checks had passed
before their assertion. The arbitrary `<20%` archive/source threshold was
missed by ratios 20.24–20.35%. `history/first-ratio-attempt` preserves the exact
source/test versions, authenticated against the run's captured hashes, and
all six failed case records. The source snapshots were reconstructed from
narrow subsequent edits; `attempt-result.json` records the actual tool result
and this reconstruction rather than pretending to be an original TAP log.

A later `<25%` threshold was a **post-hoc validation adjustment**, preserved
in `history/post-hoc-25pct` with its exact versions and actual 58/58 run
`run-au3HRA`. It is not preregistered performance success or evidence of
original compression ratio parity. The final 64-test version uses stored
baseline/genuine-symbol assertions and retains raw TAP in `test-final.tap`.
All three earlier run folders remain intact. There was one initial execution
with six failing cases, not six independent executions.

`benchmark-vbZ6G3` retains one measured execution each for 16 MiB repetitive
and 2 MiB random primitive inputs, both methods/all profiles. Twelve ordinary
archives include those exact measured packed streams; the original tests and
extracts them with matching lengths and SHA256 digests. A 64 MiB solid LZMA2
archive contains four 16 MiB files and a genuine compressed LZMA header; both
candidate and original extract exact data. Its observed encode time was
1,309.9 ms and archive length 288,370 bytes. The raw primitive encode times
were 98.6–629.2 ms, with different inputs. Two requested 1 ms deadlines
rejected in 1.34/1.28 ms. These single observations are not statistical
performance guarantees or comparisons to original compression speed/ratio.

## Reproduce and provenance

Use the pinned complete 26.04 original acquired in the sibling offline
baseline. Its installer publisher URL/SHA256 and exact executable/DLL/source
identities are in `provenance.json`. Tests fail when its authenticated bytes
or prior decoder receipt are absent or differ. There is no fallback to
another installed version and no skip. This folder is local ignored research,
not a published binary dependency. Source assistance/derivation is explicit:
public-domain SDK26.04 and MIT lzma-purejs commit
`75ed915fecef42a87abd754efede2271be18c786`, with retained source, line references
and full notices in `reference/`, `frozen-decoder/` and `LICENSE.txt`.

```powershell
node --test --test-concurrency=1 .\encoder.test.mjs
node --expose-gc .\benchmark.mjs
node .\benchmark-oracle.mjs <new-benchmark-folder>
node .\verify-draft.mjs
```

`draft-validation.json` freezes exact implementation, evidence, historical
attempts, reference bytes and protected production fingerprints. The verifier
checks them without rerunning or rewriting historical evidence. New work
requires a new receipt; the earlier decoder receipt/source remains unchanged.
