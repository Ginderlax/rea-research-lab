# Notes recovery: publication source transition

The installed Notes recovery code has 41 source files. The older publication proof describes a historical 36-file source tree. Publication correctly failed when that older proof was applied directly to the new tree. This change authenticates both source epochs separately and connects every affected proof reader to that explicit transition.

The eight affected readers include the root and follow-up verifiers, Archive integration, Editor Save, Notes Inline, Notes/Vault, the layout checkpoint and the Editor value API. Their historical source assertions remain intact. Each changed reader has an exact predecessor carrier, and the current reader is independently mandatory. The old publication producer also has a fixed physical predecessor carrier for the original repeat-projection controls.

On-disk contexts preserve an actual directory-enumeration callback and repeat that enumeration during rechecks and rebinding. Pure byte validators keep their historical default API. An explicit current context requires separate current-source and proof-byte readers; it reauthenticates current inputs and constructs a fresh historical verifier against the supplied proof channel. A caller-created context or stale source acquisition cannot replace those checks.

The new source group contains exactly 113 current inputs, 15 historical carriers and one externally pinned manifest: 129 mandatory data rows. One separately pinned helper makes 130 captured rows. Their combined raw size must remain at most 8 MiB, and the helper has its own 256 KiB limit. The historical Notes36 60-object/64-file/256 KiB checks, 306 control bodies and 95 artifact roles retain their original identities and limits. One additional source envelope makes exactly 96 artifact roles, within the unchanged workflow file cap. These are distinct source contracts; the larger group does not reinterpret the historical limits.

Independent source review retained the original mixed line endings and exact historical control bodies. New controls cover current and predecessor bytes, actual directory acquisition, context branding, both proof channels and the externally pinned helper. A total of 502 publication controls is required prospectively. This source change must pass hosted execution before publication acceptance can be claimed.

The preceding application commit, `644c3c6b086f1864562f0dd83f6b86377695403f`, produced the observed results below. Notes jobs tested that commit directly. Pull-request jobs tested merge `7509d93302262c5afac26fbcd0bbb7dad6b58a09`, whose parents are the source commit and main `5290458c13800cceb70e90f800b6fbf73ef051d8`; the merge and source commit have the same Git tree.

- [Notes recovery](https://github.com/Ginderlax/rea-research-lab/actions/runs/39183033334): 134 finite checks, 12 recovery browser scenarios and eight retained browser scenarios passed in separate jobs.
- [Complete implemented suite](https://github.com/Ginderlax/rea-research-lab/actions/runs/39183038082): 1,142 checks passed, with no failures or skips. The source collector recorded 817 stable source files.
- [Publication](https://github.com/Ginderlax/rea-research-lab/actions/runs/39183038022): failed at the historical 41-versus-36 assertion. That failure remains recorded.

All eight original uploaded archives for that campaign, totaling 22,760,010 bytes, match the GitHub API digests and have recoverable local copies. A separately reviewed data-only reader verified CRC and readable copies for all 5,200 uploaded file members, totaling 76,762,539 bytes, plus all eight raw job logs. Raw run/job/artifact metadata and both tested Git identities are preserved. Strict semantic qualification of those artifacts remains pending; the test results above do not establish every documented original-product feature.

This change introduces publication tooling and historical-source adapters. It makes no new original-product performance comparison, complete replacement, full parity, security-equivalence or universal-superiority claim. All ten replacements remain incomplete against the requested completion standard.
