# Native Windows source dates

This unaccepted derivative corrects source collection on Windows hosts where
Node's ordinary `stat`/`lstat` date fields wrap timestamps outside the unsigned
32-bit seconds interval. The preserved independent controls demonstrated a
physically 2107 source date silently becoming 1970 in both production plain 7Z
and the frozen encrypted candidate. Native extraction was already correct;
the earlier reported restoration failure was a Node-observer error.

Windows creation now reads source metadata with one native batch after the
existing root-confined walk has read the source contents. The same adapter
covers the single-file GZIP/Zstandard branch. The batch obtains `.NET
FileInfo`/`DirectoryInfo` UTC modification, access and creation dates from
Windows PowerShell at `%SystemRoot%/System32/WindowsPowerShell/v1.0/powershell.exe`.
That installed executable and .NET filesystem support are runtime dependencies
on Windows. Failure or unavailable support refuses creation before making the
output directory or writing an archive. Non-Windows creation retains the
original ordinary Node stat-date values.

Paths travel in bounded UTF-8 stdin JSON. A fixed UTF-16LE encoded PowerShell
program is the only command payload; paths and passwords are never command
arguments, interpolated script text or diagnostic messages. The request
contains only a root and source paths/types. The child independently checks
root containment, current path/ancestor reparse attributes and the requested
file/directory type. The application validates ordered path/index/type
correspondence and checks exact UTC strings against decimal milliseconds at
100 ns resolution. Current archive date precision remains whole milliseconds.
This change does not introduce a date heuristic or reject a date merely for
being before 1970 or after 2106. Existing individual format date limits remain.

The one-batch strategy captures Windows dates **after** content reads; an access
timestamp that Windows updates as a result of reading may therefore be the
value saved. Non-Windows date capture remains before each file read, as before.
Filesystem access-time policies, delayed access-time updates, and concurrent
source changes remain platform behavior. The walk, content read, native batch,
archive construction and final write are separate operations, not an atomic
filesystem snapshot. Reparse checks narrow link races but cannot eliminate a
concurrent replacement between checks and filesystem opens. No ownership,
permission, contents, file identity or complete source-snapshot consistency
claim follows from this date correction.

The existing 7Z container stores modification time only. Plain/encrypted 7Z
restoration therefore retains its previous access-time fallback to modification
time. Plain ZIP can carry the collected modification/access/creation times;
creation-time restoration remains absent. The date fix does not redesign the
container, encryption, credentials or extraction behavior.

The new focused test file includes transport validation/failure tests, a native
Windows fixture setter/observer, 1969 and both sides of the 2106 wrap boundary,
2107, modern dates, Unicode/astral and shell-looking filenames, plain ZIP and
plain/encrypted 7Z metadata/restoration checks, missing source refusal,
single-file refusal before output, and the retained no-link walk. Native test
passwords are generated in memory and never supplied to child arguments or
metadata JSON. The handler factory is a code-level verification seam; API
request input cannot replace the metadata reader.

This derivative has only been authored and source-inspected. No local syntax
check, test, bootstrap, original executable or browser was run. Acceptance
requires independent source review and a supported cloud Windows test run,
followed by fresh source-bound integration evidence. Frozen793, its151-group
author receipt, the unfinished independent review and the prospective17-path
publication plan remain separate historical epochs.
