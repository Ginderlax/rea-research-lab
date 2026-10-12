# Native repository password derivation follow-up

The prior native writer stored scrypt N=32,768/r=8/p=1. Three authenticated original restic 0.19.1 runs on this machine stored the same N/r with p=11,12,13. The weaker writer work factor was a concrete regression, recorded in the native-core checkpoint rather than treated as equivalent protection.

The revised writer measures a synthetic Node/OpenSSL derivation once per process and chooses p toward a 500 ms target. It always keeps N=32,768/r=8 and p between 13 and 32. The lower bound retains at least the highest work factor in those three observed original runs; the upper bound stays within the existing bounded reader budget. Measurement noise and implementation differences mean the estimated time is not an enforced deadline. This is a declared policy change, not an exact port of the original calibration algorithm.

The calibration probe uses a synthetic fixed phrase and independent random salt. Its temporary derived bytes are cleared. Only parameter measurements are cached; repository passwords and derived repository keys are not part of that cache. Normal creation uses a fresh repository salt and the supplied password. Existing key files remain readable and are not rewritten automatically.

Four focused checks cover parameter bounds, invalid measurements, process-local immutable calibration sharing, actual native derivation, and original CLI reading/checking/restoring new version-1 and version-2 repositories. The [follow-up receipt](results/kdf-policy-validation.json) binds the current source bytes. The [prior native validation](native-validation.json) remains historical; its p=1 limitations and source identities describe the preserved earlier checkpoint.

From `products/rea-studio`:

```text
node --test apps/backup/restic-kdf-policy.test.mjs apps/backup/restic-kdf.interop.test.mjs
```

The independent original executable is the digest-authenticated local study artifact. It is a test oracle and is not required by the application runtime.

The fixed lower bound does not prove stronger security than every original installation, particularly on other hardware. Password strength, variable-time BigInt MAC arithmetic, repository migration, memory disposal guarantees and a cryptographic audit remain unresolved. The [pinned original key policy](https://github.com/restic/restic/blob/6aa3a516ce654808a1f28f9fa21e9b7c8e6e90bf/internal/repository/key.go) sets a 500 ms/60 MiB calibration budget; its [pinned dependency](https://github.com/elithrar/simple-scrypt/blob/v1.4.1/scrypt.go) adjusts N and p differently. No production security equivalence, universal resistance to attacks, whole-product performance gain or complete replacement is established by these checks.
