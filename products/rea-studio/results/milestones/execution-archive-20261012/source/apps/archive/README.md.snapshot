# REA Archive — working development version

This application creates, inspects, verifies and extracts bounded ZIP, TAR, TAR.GZ and GZIP files. It is **not a complete replacement for 7-Zip 26.04**, and no full-product improvement has been demonstrated. All documented features of the original remain part of the requested acceptance scope.

## Run and verify

From `products/rea-studio`, run `npm start`, open the printed local address and select **Lab Archive**. To run application tests:

```text
node --test --test-concurrency=1 apps/archive/app.test.mjs apps/archive/app.integration.test.mjs apps/archive/zip.test.mjs apps/archive/formats.test.mjs
```

Create a text fixture using the new-file form or put regular files inside the Archive application's dedicated workspace. ZIP, TAR and TAR.GZ take a relative source folder; GZIP takes one regular source file. Choose the format and a matching new output path: `.zip`, `.tar`, `.tar.gz`/`.tgz`, or `.gz`. ZIP supports **store** and **deflate**; ZIP DEFLATE and GZIP support compression levels 0–9. Inspection decompresses supported compressed data and checks the applicable format fields before reporting entries. Extraction requires a confirmation and a destination folder that does not already exist.

## Implemented behavior

- Single-disk classic ZIP and optional ZIP64 creation, including actual 64-bit extra fields, ZIP64 end record and locator. ZIP64 uses the same local size limits as classic ZIP. The reader resolves ZIP64 size, offset, disk and count sentinels and validates both signed and unsigned 32-bit/64-bit data descriptors, including streaming entries whose ZIP64 sizes appear only in the central directory. The filesystem creation form emits seekable headers; data-descriptor creation is available in the ZIP module API.
- ZIP creation writes UTF-8 names and optional archive comments. Reading supports UTF-8, legacy CP437 and recognized Info-ZIP Unicode Path extras whose filename CRC matches. ZIP entries use store or DEFLATE method 8; Node's standard-library zlib supplies raw DEFLATE. Listing and extraction verify decompressed size and CRC-32, local/central header agreement, central-directory bounds and nonoverlapping entry ranges.
- Source ZIP modification, access and creation dates are stored in NTFS extras at millisecond precision. Reading prefers NTFS dates, then extended Unix modification time, then DOS local wall time. DOS dates have two-second precision and carry no timezone; extraction interprets them in the local timezone. Extraction restores modification/access times, with directory dates restored after their children. Creation timestamps are reported when present but are not restored to the filesystem.
- TAR creates ustar headers with PAX records for long/Unicode paths and timestamps that need them. Reading accepts regular files and directories, ustar prefixes, PAX local/global records and GNU long names. TAR validates header checksums and structure; the format has no payload CRC. File contents can change without invalidating a TAR header checksum.
- GZIP uses RFC 1952 headers, raw DEFLATE and verified payload CRC-32/size trailers. Reading accepts optional extra, filename, comment and header-CRC fields, and validates concatenated members. Standalone GZIP extraction joins members into one file and uses the first member's filename/date when present; otherwise its filename comes from the archive basename. GZIP filenames/comments use Latin-1. Creation omits a filename outside Latin-1 rather than misencoding it. TAR.GZ wraps the supported TAR container in GZIP.
- Regular binary files, Unicode ZIP/TAR paths, empty files and empty directories survive round trips. Archives can be reopened after the host restarts.
- Extraction validates every entry before writing any file. Traversal, absolute paths, drive/alternate-stream paths, Windows reserved paths, symbolic-link entries, duplicate/case-colliding paths and file/directory path collisions are refused.
- New-file and archive creation refuse existing files. Extraction builds validated files in a new staging folder and exclusively claims a new destination before moving them into place. A failed final move may leave a partial new destination; existing destinations are never overwritten.

Limits are local implementation bounds, including when ZIP64 headers are used:

| Format | Entry/output limits | Container limits |
| --- | --- | --- |
| ZIP / ZIP64 | 10,000 entries; 16 MiB per file; 64 MiB total uncompressed bytes | 68 MiB ZIP input |
| TAR | 10,000 output entries; 16 MiB per file; 64 MiB total file bytes | 96 MiB TAR container; 64 KiB per metadata record |
| TAR.GZ | Same TAR file/entry limits | 96 MiB compressed input and 96 MiB inflated TAR container |
| Standalone GZIP | 16 MiB combined inflated output; up to 10,000 members | 96 MiB compressed input |

Paths are limited to 4,096 characters by the shared path validator. GZIP filename/comment fields have a 4,096-character limit. Unsupported methods, encryption and multi-disk layouts are rejected. These formats are processed in memory; they do not provide streaming extraction of large archives.

The host confines paths to the Archive application's local workspace. The default example paths are `archive/source/hello.txt`, `archive/hello.zip` and `archive/restored`, all relative to that workspace. Inputs from another application's workspace are not automatically visible.

## Concrete parity gaps and limitations

7z/LZMA/LZMA2, XZ, BZIP2, WIM and 7-Zip's many other read-only formats; multi-volume support; archive encryption; password handling; AES-256 7z/ZIP encryption; self-extracting archives; Windows Shell/FAR integration; the original file manager and command-line syntax; localization; archive update/delete/rename; complete timestamp, permission, ACL and extended-attribute preservation; streaming large archives; compression parallelism are absent. TAR links, sparse files, devices and other special entries are rejected. TAR ownership, mode/ACL and extended attributes are not restored. ZIP legacy names outside CP437 or a valid Unicode Path extra need an explicit encoding policy that is not implemented.

On Windows, ZIP checks use the independent .NET implementation in both directions and compare DOS-date extraction against a separately created/extracted .NET archive. Preserved original 7-Zip 26.04 also validates generated ZIP/ZIP64 files, frozen sentinel/streaming compatibility fixtures and exact extracted bytes; ZIP files generated by the original are replayed through this parser. The original binary is extracted from the verified release asset and checked by SHA-256 before use. Those Windows oracle checks are skipped on other platforms; the portable DOS regression runs in a fixed New York timezone. Tests establish the recorded round trips and malformed-input refusals, not exhaustive interoperability, adversarial review, optimum compression or faster execution than 7-Zip. The implementation imposes substantially smaller data limits than the original.

Official baseline reference reviewed on 2026-10-12: [7-Zip 26.04 and its feature list](https://www.7-zip.org/). ZIP layout was checked against [PKWARE APPNOTE 6.3.10](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT), particularly sections 4.3.9, 4.3.14–16, 4.4.6, 4.4.19–24, 4.5.3, 4.5.5 and 4.6.9. The downloaded reference, original release assets, exact tested ZIP implementation hashes and ZIP-only test result are identified in [`compatibility-evidence.json`](compatibility-evidence.json). The original acquisition records are under [`projects/08-7zip`](../../../../projects/08-7zip). These references are not a frozen, complete feature inventory for the original.

Application code contains original ZIP/TAR/GZIP container implementations with Node standard-library zlib. It imports no 7-Zip code or prior lab reconstruction. Original vendor programs are used only as independent test oracles.
