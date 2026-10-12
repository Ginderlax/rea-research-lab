The candidate remains unintegrated. Fixed fallback p95 regresses against baseline, and the remaining standard/multi-selection medians do not establish a whole-candidate nonregression result. Values below come from independently authenticated raw child records, with seven repetitions per implementation/workload. Ranges are observed minima/maxima, not confidence intervals.

| Workload | Original ms/call median [range] | Baseline median [range] | Candidate median [range] | Candidate vs baseline median | Ranges overlap? |
|---|---:|---:|---:|---:|---|
| smallStandard | 0.000909468 [0.000890067, 0.001783937] | 0.000905823 [0.000837639, 0.001125382] | 0.000952744 [0.000858375, 0.001757476] | 5.17993% | true |
| largeStandard | 0.151548 [0.1362386, 0.1756335] | 0.1516082 [0.143014, 0.2147942] | 0.1558093 [0.1469944, 0.1732288] | 2.770957% | true |
| singlePercentile | 1.793672 [1.682826, 2.218834] | 1.675264 [1.61952, 1.903007] | 0.366437 [0.335988, 0.541235] | -78.12661% | false |
| allPercentiles | 173.5022 [160.36, 216.9227] | 1.921667 [1.8224, 2.075433] | 1.9776 [1.819667, 2.683133] | 2.910668% | true |
| allCalculations | 172.1338 [168.7907, 205.2837] | 6.103433 [5.7118, 7.684133] | 6.1404 [5.8988, 7.8892] | 0.60567% | true |
| constructedPercentile | 4.402829 [4.183228, 4.602058] | 4.261285 [4.110885, 4.976645] | 0.441693 [0.4131745, 0.499351] | -89.63475% | false |
| adversarialFallbackPercentile | 0.824292 [0.73778, 0.964879] | 0.8179555 [0.7436175, 0.842726] | 1.046251 [0.9250565, 1.491104] | 27.91056% | false |

A positive timing percentage means slower. Both median ratios and per-repetition paired differences are preserved in recomputed-summary.json and paired-differences.csv. Original comparisons are separate from baseline comparisons. The substantial all-percentile/all-calculation advantage over original already belongs to baseline; it is not a new benefit established for this selector candidate.

| Workload | Original lifetime peak RSS MiB median [range] | Baseline median [range] | Candidate median [range] | Candidate minus baseline retained heap bytes median [paired range] |
|---|---:|---:|---:|---:|
| smallStandard | 106.2539 [106.0313, 106.4961] | 104.9023 [104.625, 105.293] | 105.1563 [104.9258, 105.5352] | 0 [-72, 72] |
| largeStandard | 109.6328 [109.2891, 109.9258] | 108.7148 [108.6875, 109.6094] | 109.1641 [108.3984, 109.7109] | 0 [-24, 24] |
| singlePercentile | 106.7734 [106.5898, 107.0781] | 90.82813 [90.51172, 90.97656] | 88.72266 [88.51563, 89.03906] | -7488 [-7488, -7488] |
| allPercentiles | 147.1406 [146.6992, 147.9961] | 89.17578 [88.81641, 90.72266] | 90.14453 [89.30469, 91.02734] | 0 [-16, 88] |
| allCalculations | 250.875 [246.0781, 280] | 224.457 [198.9414, 230.4414] | 230.3125 [222.8672, 232.6289] | 104 [-272, 480] |
| constructedPercentile | 221.1016 [220.5313, 221.7188] | 220.5625 [220.0781, 220.8633] | 102.8477 [102.5781, 103.3789] | -7376 [-7376, -7376] |
| adversarialFallbackPercentile | 161.2188 [159.8945, 161.5234] | 159.2969 [158.6094, 160.4688] | 159.8672 [158.6523, 161.1992] | -2736 [-2784, -2688] |

Lifetime RSS is a complete-child high-water mark; independently polled RSS and checkpoint RSS are separate metrics in the JSON/CSV files. Initialization, retention and release deltas, paired reference differences and all negative values are retained without clipping. In all-calculations, released heap deltas include negative observations for baseline and candidate. These deltas include GC and the common post-retention serializer/cache validation pressure; they are not cumulative allocation or leak measurements.

Timing controller duration was 100.064 seconds against the prospective 3–5 minute reservation. Isolated-memory duration was 264.904 seconds against the 10–15 minute reservation. These are scheduling durations, separate from measured per-call loops. Root/agents paused throughout each explicitly authorized window; unrelated Windows activity was uncontrolled. No machine-level isolation or universal performance claim is made.
