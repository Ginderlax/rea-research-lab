# Compressed LZMA / LZMA2 decoder research draft

This is an executed, isolated decoder under ignored workspace `work/`. It does
not modify or supply the frozen Archive application. The primitive uses ordinary
JavaScript, typed probability tables and a bounded output buffer. It never calls
the original 7-Zip program and has no installed package, compiler, native addon
or WebAssembly dependency. The original complete Windows x64 7-Zip 26.04 program
is authenticated and executed only by the independent test/benchmark harnesses.

The implementation is explicitly source-assisted, studying and adapting the
public-domain official SDK decoder and the pinned MIT Juan Mellado decoder.
`LICENSE.txt`, `provenance.json` and preserved `reference/` bytes provide the
authors, licenses, immutable source URLs, digests and line references. This is
not an independent clean-room derivation, and there is no full-feature or
all-ways-improved parity claim.

## Executable scope

`lzma.mjs` implements genuine raw LZMA1 range decoding, literal contexts,
matches/repetitions, direct/modelled distance bits, exact range termination,
known-size streams with or without an explicit end marker, and dictionary
distance validation. `decodeLzma(input, expectedSize, fivePropertyBytes, opts)`
returns binary bytes; it never converts the contents to text.

`decodeLzma2(input, expectedSize, oneDictionaryPropertyByte, opts)` adds compressed
and stored LZMA2 chunks, all dictionary/property/state reset controls, state and
probability continuity, exact compressed and decompressed chunk sizes, and the
mandatory outer end byte. Properties constrain LZMA2 `lc + lp <= 4`. Compressed
LZMA2 chunks cannot use an LZMA1 end marker. Truncated or unexplained trailing
bytes, concatenated streams, invalid history and size mismatches are refused.

The isolated copy of `sevenzip.mjs` connects those two functions to its existing
simple one-coder folder parser. This opens the tested original default `.7z`
data and LZMA encoded headers, with solid and non-solid contents, keeping all
container/file/folder CRC and metadata/path checks. It preserves the current
container limits: 96 MiB archive, 16 MiB header/file, 64 MiB total/solid output,
10,000 entries, and a maximum advertised dictionary of 64 MiB. The primitive
can independently decode one 64 MiB raw stream; that is not permission for a
64 MiB single file in the app/container reader.

The writer remains the prior Copy/DEFLATE/LZMA2 stored-block writer. No genuine
LZMA/LZMA2 encoder has been implemented. Multiple coders/BCJ/delta filters,
encryption, volumes, SFX, links/special files and rich metadata restoration are
still outside this slice. Typical executable-containing 7z archives may use
additional filters and therefore remain unsupported even when their last coder
is LZMA or LZMA2. GUI/edition/platform parity is unestablished.

## Bounds, memory and work budgets

Raw input must be a Buffer or unshared Uint8Array, with intrinsic byte length,
buffer and offset verified before allocation. Arrays, strings, proxies and
SharedArrayBuffer-backed input are rejected. Detached or foreign-realm inputs
are not supported. Dictionary, declared output, properties and option bounds
are checked before allocating the output. The primitive takes an input view
and allocates one exact-size output buffer; it has no separate full dictionary
buffer. History references use that output and cannot cross a dictionary reset
or the advertised dictionary window. The LZMA2 dictionary property is validated
before allocation; chunk-specific lc/lp/pb properties are validated as their
bounded frames are read.

In addition to the output (at most 64 MiB) and caller-retained input (at most
96 MiB), base probability tables hold 3,692 bytes. The reused LZMA2 literal
table is 24,576 bytes. LZMA1 literal tables use `768 * 2^(lc+lp)` 16-bit values,
at most 6,291,456 bytes for the SDK-permitted extreme `lc=8,lp=4` properties.
Objects, input/output views, Node allocation pools, garbage collection and
runtime overhead add memory. The container reader also retains its archive
copy and file-entry copies; its peak memory can substantially exceed one output
bound. These are allocation bounds, not process RSS isolation or a fixed peak
memory promise. Benchmark RSS snapshots are observations, not high-water
measurements or enforced limits.

Options can lower `maxInput`, `maxOutput`, `maxDictionary` and `maxChunks`
(100,000 hard maximum). Optional `maxSteps` is a safe integer from zero through
8,000,000,000; units count coded/direct bit decisions, output bytes and chunk
controls. Optional `maxTimeMs` is finite, from zero through 60,000 ms. Omitted
step/time budgets remain optional and do not change supported decoded bytes.
The elapsed budget begins before output/table allocation. It is checked every
4,096 work units, between chunks, before/after native stored-copy operations,
and at compressed segment completion. Match copies span at most 273 bytes.
Exhaustion throws without returning a successful partial output. These are
cooperative guards and can overshoot by one check interval/native operation;
they do not preempt the process. A future HTTP integration must pass an aggregate
host-operation deadline across every folder/header and also account for its
container parsing, checksums and filesystem work.

## Reproduction and independent evidence

From this folder, run:

```powershell
node --test --test-concurrency=1 lzma.test.mjs
node --expose-gc benchmark.mjs
node verify-draft.mjs
```

The test harness requires the authenticated offline baseline at sibling
`full-archive-baseline-20261012/full-product-x64/7z.exe` and `7z.dll`. Acquisition
of their official 26.04 installer and SDK package is pinned in the provenance
record. They are local research assets, not runtime dependencies or publication
exceptions. Each run retains the synthetic input, original-produced container,
independently extracted raw coder bytes/properties and SHA256 comparison record
under its unique `run-*` folder. Nothing is silently replaced.

The current frozen test result and exact source bytes are in
`draft-validation.json`. Positive vectors cover LZMA/LZMA2, one-byte/repeated/
random/distant matches, four nondefault property groups, explicit LZMA end
markers, multi-chunk continuing state, mixed copy/compressed chunks and original
default/LZMA/LZMA2 containers with genuinely encoded headers, solid on/off.
Negative probes cover every truncation point of small vectors, exact input and
output sizes, malformed range initialization, reset/property rules, corruption
detected by container CRCs, dictionaries, expansion, byte input guards and
deterministic zero step/time budget refusal. Raw LZMA/LZMA2 has no checksum of
its own; a syntactically valid corrupted raw stream can decode altered bytes.
The `.7z` reader verifies the checksums provided by its container.

The separate benchmark records three exact-digest decodes per case, a genuine
original compressed stream expanding to the full 64 MiB bound, 4 MiB random
LZMA and LZMA2 data, Node/version information, memory snapshots and a 1 ms
budget trial. Fast stored LZMA2 chunks can legitimately complete within that
budget. It does not compare native 7-Zip decompression speed and cannot establish
performance parity across datasets/platforms. Only this isolated test selection
has run; the current app remains frozen until its owner authorizes integration.

Earlier attempted runs are retained: the first test run had an incorrect test
assumption that LZMA2 dictionary property 25 exceeded 64 MiB (it does not), and
the first benchmark incorrectly required a sub-millisecond native copy case to
exhaust a 1 ms budget. Both harness expectations were corrected. Neither was an
observed decoder data mismatch; neither failed attempt is claimed as a pass.
