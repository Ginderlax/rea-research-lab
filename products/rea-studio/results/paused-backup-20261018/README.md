# Paused REA recovery checkpoint — October 18, 2026

Development and automatic follow-ups are paused at Evan's direct instruction. This backup preserves the application source at `3c710a31e438af7f1682fc5cf497be4264db35ff`, ordinary working sources and unfinished proposals without installing those proposals. The development branch is unchanged.

The checkpoint covers **69,473 selected logical files**. Its **818,941,589 unique bytes** are stored in **98 uncompressed parts**, each at most 8 MiB. Identical files already in Git are recovered from the pinned historical Git objects; other repeated contents reference an exact stored file. The [index](BACKUP-INDEX.json) records every path, size, SHA-256 and segment or Git object. [INPUTS](INPUTS.json.snapshot) preserves the exact reviewed input selection.

The actual [verification record](VERIFICATION.json) confirms successful reconstruction and size/SHA-256 verification of all **2,832,437,518 logical file bytes**. Verification read every part and reconstructed every selected file stream, including the Git/content aliases. It did not write a duplicate restore directory or execute any saved product, original executable, test, build or qualification reader. Independent [scope/privacy](SCOPE-REVIEW.json.snapshot) and [backup-source](SOURCE-REVIEW.json.snapshot) reviews are preserved.

Included content covers the unfinished audit repair and evidence readers, historical stage sources and reviews, installation before/after recovery files, all 189 earlier retained original cloud artifact ZIPs, the newly cancelled run's original ZIP and its 437 uploaded members, and original REA main/submodule Git bundles, package, metadata and restore instructions. Cancellation is not successful full-suite acceptance. Zero full replacement products have met the requested completion standard.

Downloaded vendor tools, dependency/runtime caches, generated binary fixtures and duplicate restored repositories remain local. Expanded copies may be omitted when their exact original ZIP carrier is retained. Superseded generated input inventories are replaced by the final index and exact INPUTS snapshot. Every exclusion is recorded. Original full artifact `12065020872` expired before download and remains unavailable; its retained console/API observations are preserved, with no claim that they replace the missing complete artifact. Existing failures remain open.

The [privacy record](PRIVACY-SCREEN.json.snapshot) preserves the literal screen, nine resolved byte-pinned public documentation examples and the exact vendor/fixture exclusions. Original raw finding records are also retained. This is a scoped review, not a universal secret detector or an export of cloud-only chats.

## Verify or restore

Use a full Git clone of this branch or tag, rather than GitHub's source ZIP or a shallow clone: historical Git objects are required for the aliases. Python 3.10+ and Git are needed. Once the clone is present, restoration requires no online lookup.

From the repository root, verify all file bytes without writing duplicate restored files:

```powershell
python products/rea-studio/results/paused-backup-20261018/restore.py --repository . --verify
```

Restore the selected files into a new directory that does not exist:

```powershell
python products/rea-studio/results/paused-backup-20261018/restore.py --repository . --destination ../rea-restored-20261018
```

The restorer rejects existing destinations and path traversal, checks every saved part/file identity, and refuses filesystem links or junctions on output paths. It recreates ordinary file contents and logical paths; it does not install dependencies, restore filesystem permissions/timestamps or start applications. The original REA bundles have their own preserved restore instructions. Preserve upstream licenses when using those sources.

Branch: `backup/rea-paused-20261018`. Recovery tag: `rea-paused-backup-20261018`. Only a new direct human instruction should resume development.
