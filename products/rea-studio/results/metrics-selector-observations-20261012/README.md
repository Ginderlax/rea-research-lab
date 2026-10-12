# Metrics selector observations

This fixed seven-workload study ran 147 timing children and 147 isolated memory children against the authenticated original Grafana reducer, the current application baseline and a separate selector candidate. All measured children completed. The preserved results include 1,323 timing packet checks, 1,311,282 memory packet checks and 1,979 matching owned-process observations.

The candidate remains out of production. Its fallback p95 median was 27.91056% slower than the baseline, with disjoint observed ranges. Standard and multiple-percentile median regressions remain visible alongside substantial single and constructed p95 improvements. The study does not establish full performance parity or universal superiority.

[Tables](TABLES.md), [timing values](timing-summary.csv), [memory values](memory-summary.csv) and [paired differences](paired-differences.csv) retain signed values. The 24 negative child metrics and 644 negative paired values were not clipped. [Timing figure](timing-ranges.svg) and [memory figure](memory-ranges-and-signed-deltas.svg) show observed ranges, not confidence intervals.

The [validation receipt](measurement-validation.json) and [preservation manifest](preservation-manifest.json) bind the exact sources, finite observations, controller logs, failed consolidation attempts, source fixtures, upstream notices and figures. Every frozen review file is retained as an inert snapshot; see the [frozen methodology](stage/README.md.snapshot). The two authenticated original registry archives remain in the local backup and are listed by identity without being redistributed here.

The timing and memory windows were separately coordinated and explicitly closed. Unrelated Windows processes were uncontrolled, so machine-level isolation is unproven. The raw observer hashes were first computed at consolidation. The initial failed p1 fallback hypothesis lacks its first full console stack; the recorded failure and later exact replay remain visible. None of these records is a full-product completion claim.
