The candidate remains unintegrated. All-percentiles median regresses against baseline, and the remaining standard/multi-selection medians do not establish a whole-candidate nonregression result. Values below come from independently authenticated raw child records, with seven repetitions per implementation/workload. Ranges are observed minima/maxima, not confidence intervals.

| Workload | Original ms/call median [range] | Baseline median [range] | Candidate median [range] | Candidate vs baseline median | Ranges overlap? |
|---|---:|---:|---:|---:|---|
| smallStandard | 0.00118468 [0.000961922, 0.001615796] | 0.001090498 [0.000967002, 0.001480149] | 0.001099183 [0.000875302, 0.001420191] | 0.7964251% | true |
| largeStandard | 0.159853 [0.1368952, 0.1840957] | 0.1802391 [0.1573232, 0.2151846] | 0.1677009 [0.1483157, 0.222766] | -6.9564% | true |
| singlePercentile | 1.85812 [1.790677, 2.035996] | 1.948117 [1.760779, 2.505238] | 0.29055 [0.2793455, 0.3461755] | -85.0856% | false |
| allPercentiles | 186.0015 [167.7264, 216.108] | 2.004033 [1.8536, 3.4449] | 2.7655 [2.044733, 3.230467] | 37.99671% | true |
| allCalculations | 182.3343 [176.0689, 220.5403] | 6.553767 [5.6095, 7.909967] | 6.580733 [6.243733, 7.2063] | 0.4114682% | true |
| constructedPercentile | 4.912706 [4.43215, 5.087224] | 4.633926 [4.357209, 5.045794] | 0.4110775 [0.368668, 0.4456815] | -91.12896% | false |
| adversarialFallbackPercentile | 0.8672635 [0.7735685, 0.984277] | 0.8478475 [0.809021, 0.989459] | 0.272661 [0.245755, 0.356502] | -67.8408% | false |

A positive timing percentage means slower. Both median ratios and per-repetition paired differences are preserved in recomputed-summary.json and paired-differences.csv. Original comparisons are separate from baseline comparisons. The substantial all-percentile/all-calculation advantage over original already belongs to baseline; it is not a new benefit established for this selector candidate.

| Workload | Original lifetime peak RSS MiB median [range] | Baseline median [range] | Candidate median [range] | Candidate minus baseline retained heap bytes median [paired range] |
|---|---:|---:|---:|---:|
| smallStandard | 105.9375 [105.8047, 106.0703] | 104.9375 [104.5859, 105.0859] | 104.9531 [104.7148, 105.207] | -24 [-96, 48] |
| largeStandard | 109.5078 [109.2227, 109.9141] | 108.7813 [108.3047, 109.6055] | 108.7148 [108.3789, 109.4922] | -24 [-48, 0] |
| singlePercentile | 106.5859 [106.2305, 106.7891] | 90.34766 [90.09766, 90.66016] | 93.71094 [93.40234, 94.03906] | -3504 [-3552, -3504] |
| allPercentiles | 146.8867 [146.4961, 147.9922] | 89.05469 [88.58203, 90.00781] | 90.05469 [88.70703, 90.32813] | -12288 [-12288, -12272] |
| allCalculations | 279.6758 [245.4219, 280.082] | 229.2422 [220.0273, 235.3594] | 229.5586 [198.2109, 232.293] | -23008 [-23424, -22640] |
| constructedPercentile | 220.9258 [220.8711, 221.4336] | 220.1875 [219.7656, 220.7695] | 94.04688 [93.56641, 94.35938] | -3440 [-3440, -3368] |
| adversarialFallbackPercentile | 160.7305 [159.8438, 161.125] | 159.7891 [158.6641, 160.0781] | 93.61719 [93.30469, 94.63281] | -3584 [-3584, -3512] |

Lifetime RSS is a complete-child high-water mark; independently polled RSS and checkpoint RSS are separate metrics in the JSON/CSV files. Initialization, retention and release deltas, paired reference differences and all negative values are retained without clipping. Both release references are provided: releasedAfterGC minus beforeRetention, and releasedAfterGC minus warmBase. The latter is the prospective summary definition; the former preserves the historical comparison definition. Negative signed observations and paired differences remain visible. These deltas include GC and the common post-retention serializer/cache validation pressure; they are not cumulative allocation or leak measurements.

Timing controller duration was 105.580 seconds against the prospective 5–8 minute reservation. Isolated-memory duration was 273.433 seconds against the 10–15 minute reservation. These are scheduling durations, separate from measured per-call loops. Root/agents paused throughout each explicitly authorized window; unrelated Windows activity was uncontrolled. No machine-level isolation or universal performance claim is made.
