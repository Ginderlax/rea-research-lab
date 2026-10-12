# REA Archive — working development version

This application creates, inspects, verifies and extracts real ZIP archives. It is **not a complete replacement for 7-Zip 26.04**, and no full-product improvement has been demonstrated. All documented features of the original remain part of the requested acceptance scope.

## Run and verify

From `products/rea-studio`, run `npm start`, open the printed local address and select **Lab Archive**. To run application tests:

```text
node --test apps/archive/app.test.mjs apps/archive/app.integration.test.mjs
```

Create a text fixture using the new-file form or put regular files inside the Archive application's dedicated workspace. Select its relative source folder, choose ZIP method **store** or **deflate**, and provide a new `.zip` output path. Inspecting an archive decompresses and checks every entry. Extraction requires a confirmation and a destination folder that does not already exist.

## Implemented behavior

- Classic single-disk ZIP creation with UTF-8 filenames, stored entries or DEFLATE method 8, local headers, central directory and end record. Node's standard-library zlib supplies raw DEFLATE; file bytes are not converted to text during archive operations.
- Regular binary files, Unicode paths, empty files and empty directories survive round trips. Archives can be reopened after the host restarts.
- ZIP listing reports path, original/compressed size, compression method and CRC-32. Both listing and extraction validate decompressed size and CRC, header agreement, central directory bounds and nonoverlapping entry ranges.
- Extraction validates every entry before writing any file. Traversal, absolute paths, drive/alternate-stream paths, Windows reserved paths, symbolic-link entries, duplicate/case-colliding paths and file/directory path collisions are refused.
- Decompression has explicit declared/output limits. Maximum 10,000 entries, 16 MiB per file, 64 MiB total uncompressed data and 68 MiB archive input. Unsupported encryption, methods and multi-disk/ZIP64 layouts are rejected.
- New-file creation and ZIP creation refuse existing files. Extraction builds validated files in a new staging folder and exclusively claims a new destination before moving them into place. A failed final move may leave a partial new destination; existing destinations are never overwritten.

The host confines paths to the Archive application's local workspace. The default example paths are `archive/source/hello.txt`, `archive/hello.zip` and `archive/restored`, all relative to that workspace. Inputs from another application's workspace are not automatically visible.

## Concrete parity gaps and limitations

7z/LZMA/LZMA2, XZ, BZIP2, GZIP, TAR, WIM and 7-Zip's many read-only formats; ZIP64 and multi-volume support; archive encryption; password handling; AES-256 7z/ZIP encryption; self-extracting archives; Windows Shell/FAR integration; the original file manager and command-line syntax; localization; archive update/delete/rename; complete timestamp, permission, ACL and extended-attribute preservation; streaming large archives; compression tuning and parallelism are absent. Non-UTF-8 filenames are accepted only when entirely ASCII. ZIP creation uses a fixed DOS epoch timestamp rather than retaining source dates.

On Windows, an additional integration check uses the independent .NET ZIP implementation in both directions: it reads this application's generated ZIP, and this parser reads a separately generated .NET ZIP. No external runtime package is required; that particular check is skipped on other platforms. Tests establish these round trips and malformed-input refusals, not exhaustive ZIP interoperability, adversarial review, optimum compression or faster execution than 7-Zip. The implementation imposes substantially smaller data limits than the original.

Official baseline reference reviewed on 2026-10-12: [7-Zip 26.04 and its feature list](https://www.7-zip.org/). The format reference is [PKWARE APPNOTE](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT). These references are not a frozen, complete feature inventory for the original.

Application code is an original ZIP container implementation with Node standard-library zlib. It imports no 7-Zip code or prior lab reconstruction.
