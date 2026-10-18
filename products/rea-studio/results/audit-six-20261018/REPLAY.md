# Offline data replay

Use a fresh workspace. `DATA.json` maps the 59 main payload files and `MORE.json` maps the 12 supplementary files to their original relative paths, lengths and SHA256 identities. Those metadata files, this guide and any later filing receipts are additional provenance; they are excluded from their own content tables to avoid a self-hash cycle.

Restore only these inputs for the fixed Python data reader:

1. The nine raw files named by `strict-reader-fixed-inputs-39169535767.json`, at its exact `rawFolder` and filenames. These include the original outer ZIP, raw job log and seven API responses.
2. The fixed R2 reader and its fixed input specification at their original paths under `work/audit-six-projection-evidence-20261018-next/`. Public `methods/` files are inert stored source copies; use the `source` to `target` mapping to restore their original filenames and bytes.
3. The exact projection source context at `work/resume-20261018-audit/source-authority.json` and the four old baseline inputs named by the fixed specification.

The workspace root is determined from the reader's own location. Preserve the specified directory structure and exact bytes, including JSONL key order and original line endings. Original ZIP bytes are stored publicly with `.zip.snapshot` suffixes; restore them using the mapping rather than guessing names.

Keep the previously exported `readable/` files, `QUALIFIED.json` and other prior result copies outside this fresh replay workspace. In particular, do not restore the previously generated `artifact-12151917408-strict-six-projection-reader-v2` output folder. The reader deliberately refuses an existing output folder and writes a fresh readable result.

Run only the restored fixed Python data reader. Do not run the collector or make network requests for offline replay. Captured audit, application and original-product source bytes are data and must never be imported or executed by this process. This is bounded backup readback, not a product test or a new hosted audit.

A successful replay confirms the saved finite source/control evidence and exact old-to-new raw observation continuity. The hosted global audit remains failed, with all 986 older observations still open. The five additional campaign archives have member readability recorded in `READABILITY.json`; their source and product acceptance remains pending.
