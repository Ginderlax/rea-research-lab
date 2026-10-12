# Native calculation performance follow-up

The [record](followup.json) and exact executed script snapshots retain the initial measurement, selected shared-sort change, and rejected direct-literal trial. The old implementation is preserved under [the native-core checkpoint](../milestones/native-core-20261012/snapshot-manifest.json). The selected source still matches the independent original differential corpus.

For 25,000 samples, median all-99-percentile time changed from about 160.6 ms in the candidate baseline to 1.89 ms in the selected paired run; that run's original median was 163.2 ms. All-calculation candidate time was 6.55 ms versus the original's 165.4 ms. Three other selected workloads have slightly slower candidate medians. These are exploratory component measurements on synthetic inputs, with three samples each and no statistical significance claim.

Percentiles now share one sorted input within a single call. They retain distinct native null/undefined and rank semantics. Median uses its separate contract. No sorting cache persists across calls, and cache-visible calculation state remains governed by the original contract.

Both implementations were loaded into each child to verify exact outputs. Memory observations include both implementations; they cannot demonstrate lower independent process memory or whole-product resource use. Script snapshots retain machine-local paths and are evidence, not portable installation commands. The original-program differential harness is reproducible through the app's documented commands. No full feature parity, universal superiority, production readiness or completed replacement is established.
