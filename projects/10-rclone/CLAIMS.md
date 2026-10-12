# Claim ledger

| Class | Claim | Evidence | Limit |
| --- | --- | --- | --- |
| Observed | Exact release bytes and embedded Go claims | REA ev_452ecd8d19932dba9a11b1f891362d6977a5ef0c862b9ecfe0c0f0ae6dade513; artifact-manifest.json | Metadata only; no native algorithm recovery. |
| Source-assisted model | AES-CTR, public format constant, IV prefix and raw base64url | reference-manifest.json: format; reconstruction.mjs | Consulted before testing; not independently inferred by REA. |
| Observed | 115 original outputs decode and re-encode exactly | results.json: cases | 230 assertions; valid synthetic UTF-8 and reused original IV. |
| Observed | All 115 sample IVs are distinct | results.json: observed_distinct_ivs | No RNG distribution or global uniqueness claim. |
| Observed | Hyphen with a pipe at EOF produces empty text | initial-counterexample.json; results.json: stdin cases | Character-device terminal behavior remains untested. |
| Method limitation | Native import was unavailable/cancelled | rea-evidence-summary.json: native_analysis; artifacts/native-cancellation.json | No rclone decompilation result. |
| Unknown | Malformed-token, remote-account and whole-product equivalence | Declared exclusions | No real credentials or remote configurations examined. |
