# Claim ledger

| Class | Claim | Evidence | Limit |
| --- | --- | --- | --- |
| Observed | Exact release bytes and embedded Go claims | REA ev_99d189902e8214855fb03563672ed97d01e7efada64885131ee6875bba92788f; artifact-manifest.json | Build metadata is not compiler/dependency authentication. |
| Observed | 122 content-ID lists match the model across three snapshots | results.json: original_observations | Repeated files and one recorded release. |
| Observed | Duplicate, revision and rename identity checks pass | results.json: duplicate_reference_pair_checks, changed_content_id_checks, renamed_content_id_checks | Finite fixtures, not a hash collision study. |
| Observed | 12 stored-object names hash their stored bytes | results.json: storage_observations | Includes key metadata; not every object is asserted encrypted. |
| Observed | Original restic full-data check passes | results.json: restic_read_data_check_passed; local integrity-check.txt | This synthetic repository only. |
| Source-assisted model | Empty files have no blobs and nonempty small fixtures use a plaintext SHA-256 ID | reconstruction.mjs; version-pinned design reference | Chunking at or above 512 KiB is excluded. |
| Unknown | Full chunker, encryption, pack/index or remote-backend equivalence | Declared exclusions | Not reconstructed or claimed. |
