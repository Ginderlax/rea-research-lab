# Notes recovery installation: first hosted results

Source commit: `ff3c67a55176dc96fda6273b4d56c68b055a48e6` on the development branch. This checkpoint records a failed installation campaign and the next proposed repair. It does not certify an installed replacement, feature parity, or superiority.

The seven completed GitHub Actions campaigns ran on GitHub-hosted Windows. Push jobs checked out the source commit above; pull-request jobs tested merge commit `01c459c15badb001666f038ec76172b33d493a93`. Those commits have the same Git tree. Each campaign retains its original run, job, source, artifact and failure identity.

| Campaign | Observed result | Evidence |
| --- | --- | --- |
| Notes focused checks | 128 passed | [Run 39179793988](https://github.com/Ginderlax/rea-research-lab/actions/runs/39179793988) |
| Notes retained browser scenarios | 8 passed | Same run, separate job and artifact |
| Notes recovery browser scenarios | 11 passed, 1 failed | Same run, separate job and artifact |
| Complete implemented suite | 1,136 passed; old 1,119 plus 17 named checks preserved | [Run 39179798542](https://github.com/Ginderlax/rea-research-lab/actions/runs/39179798542) |
| Publication integrity | Failed: historical Notes 36-file assertion received the installed 41-file source tree | [Run 39179798567](https://github.com/Ginderlax/rea-research-lab/actions/runs/39179798567) |
| Flow/Vault focused checks | Passed | [Run 39179798522](https://github.com/Ginderlax/rea-research-lab/actions/runs/39179798522) |
| Flow/Vault browser scenarios | Passed | [Run 39179798605](https://github.com/Ginderlax/rea-research-lab/actions/runs/39179798605) |
| Windows path checks | Passed | [Run 39179798564](https://github.com/Ginderlax/rea-research-lab/actions/runs/39179798564) |
| Archive checks and browser scenarios | Passed in two separate jobs | [Run 39179793932](https://github.com/Ginderlax/rea-research-lab/actions/runs/39179793932) |

These are observed campaign results. Strict semantic qualification of the complete uploaded evidence remains pending. A successful implemented-suite run covers the implemented tests; it does not establish every documented feature of any original product.

The failing recovery scenario edits a saved note and expects the recovery copy to retain that note's identity. A saved-note click can return before its asynchronous read finishes, leaving the editor ready for typing before the selected note owns the editor. A late read can then replace the new text and retire its recovery copy. The proposed repair gives pending saved-note reads explicit ownership, blocks premature edits and Save, rejects stale responses, and composes this state with pending organization and Save operations. Six additional deterministic checks are proposed. The existing 12 recovery browser scenarios and eight retained browser behavior bodies remain unchanged. Their next execution must determine whether the repair succeeds.

The publication repair preserves the historical 36-file proof, historical controls and original artifact roles. It must authenticate the new source epoch separately, with explicit predecessor carriers. Changing a historical count to make the old proof accept new source would not establish that transition.

All ten original uploaded ZIPs (25,797,005 bytes) have local recoverable copies matching the GitHub API SHA-256 digests. A separately reviewed, data-only backup reader verified the CRC and readable copy of all 6,002 uploaded file members (85,093,268 bytes). Raw run/job/artifact metadata and all ten job logs are preserved locally. This establishes uploaded-artifact readability; it does not substitute for semantic source qualification. No local product execution, test, build, browser run or original-product comparison was performed to obtain these results.

The new work retains the earlier bounded recovery design and its limitations. No fresh original-product comparison or speed, resource, usability, reliability or universal-superiority claim follows from this checkpoint. All ten replacements remain incomplete against the requested standard of every documented feature and every quality dimension.
