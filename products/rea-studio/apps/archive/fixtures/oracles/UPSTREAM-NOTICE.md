# Original test oracle

7z2604-x64.exe is the unmodified official complete Windows x64 7-Zip 26.04 installer, released 2026-10-05. Local executable backups and the test cache are ignored and excluded from publication. The application never launches or wraps this program. Run apps/archive/bootstrap-original.mjs from products/rea-studio to authenticate existing backups or download the pinned official installer and 7zr.exe into ignored .local/archive-original before the independent Windows tests.

Official asset: https://github.com/ip7z/7zip/releases/download/26.04/7z2604-x64.exe

Publisher SHA-256: d54bf805f9f3704d1e8db2fa3498ae7ef2df0312b40b558e7c71c734430a665d

Bootstrap asset: https://github.com/ip7z/7zip/releases/download/26.04/7zr.exe

Bootstrap SHA-256: 256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282

Corresponding official complete sources: https://github.com/ip7z/7zip/releases/download/26.04/7z2604-src.7z

Source package SHA-256: 6bcfd2679d178174df06d09d50147dd7b5980d7beac896136689dfc9d51e0fd9

The original license is preserved in 7-Zip-License.txt and inside the installer. The exact source package, SDK, manual and complete Windows x64 binaries are also preserved in the local full-archive-baseline-20261012 offline baseline described by the feature inventory. Test setup authenticates the installer, bootstrap program, extracted 7z.exe and 7z.dll before invoking private copies.

The complete product advertises Zstandard and ZIP method 93 decompression. It does not encode these formats. Positive ingestion fixtures use independently authenticated Windows bsdtar 3.8.8; a separate fixture producer builds their ZIP envelope without importing application code.
