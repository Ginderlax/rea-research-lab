"""Data-only portable evidence reader. Never imports or executes captured source.

Required metadata: run.json, jobs.json, artifacts.json, commit.json (Git database
commit endpoint), tree.json (recursive Git tree endpoint, truncated=false).
The original failing 3b4 campaign stays pinned to its own source and receipts.
"""
import argparse
import datetime
import hashlib
import io
import json
import pathlib
import re
import stat
import zipfile
import zlib

RUN = '39173776352'
ATTEMPT = 1
COMMIT = '3b4cfc3d14af3254273c666ab0c919965ab93dbe'
PARENT = '698d2e301765d1b878fb251b3d59dadb5a3c9bac'
BRANCH = 'experiment/notes-draft-recovery-20261018'
WORKFLOW = '.github/workflows/notes-draft-recovery-experiment-cloud.yml'
STUDIO = 'products/rea-studio/'
COLLECTOR = STUDIO + 'scripts/verify-notes-draft-recovery-cloud.mjs'
FLOOR = STUDIO + 'scripts/notes-draft-recovery-regression-floor.json'
FIXED_SOURCE = {
    WORKFLOW: (13270, '7221be1ddf20d3f2b3b63f506c22a4e7cddce95c3fb9eef211843fe6c47768f1'),
    COLLECTOR: (28963, '258af6c02a7e512c50b3136e5ff63ad448c49f3b60809470a62c79686b9cc652'),
    FLOOR: (38458, '7364c1fa85ec79e6fb6a997fc51a3dd9a8709737aeb3fbc1b125f147c63d33ea'),
}
JOBS = {'finite': '117812131149', 'browser': '117812131036'}
JOB_NAMES = {'finite': 'draft-recovery-finite', 'browser': 'draft-recovery-real-chromium'}
MAX_OUTER = 16 * 1024 * 1024
MAX_INNER = 15 * 1024 * 1024
MAX_FILE = 8 * 1024 * 1024
MAX_TOTAL = 96 * 1024 * 1024
MAX_FILES = 5000
ARTIFACTS = {'finite': '12153069488', 'browser': '12152559882'}
FIXED_OUTERS = {
    'finite': (3698358, 'f694b7b1b651c3ab224ea1652cc59c79b39ea9b640642f50aae2bf254940fc3d'),
    'browser': (3895756, '873b0a33c6278942ad1cf55c05ed75d15d8edb082489c2b20d29ff864368a630'),
}
METADATA_FOLDER = 'metadata-2026-10-18T22-50-53.620Z'
FIXED_METADATA = {
    'run': (13126, '405d2089f99b832375a16a8539f782bc9e0c8d99d80eb06fef1b85cf83c2fd1d'),
    'jobs': (7072, 'e4ed8103611210457ba5278c60e8f6899c82335674a7b766aefc5503f85f6409'),
    'artifacts': (1550, 'b944dfd41609553ed9d5a261e0121353bed935babc80a428ae144f0be52be0b0'),
    'commit': (1230, 'f96e62a16caaf005287a6395d212745500e97c2127a2b01381439701a6096f72'),
    'tree': (12342376, 'a2354be8522e1a15f5474ad09a2d1a3ce1c5f7f96e1cf57a721cf8ffefdc61e9'),
}
FAILED_FINITE_NAMES = {
    'draft recovery scope persists for the same workspace, differs at the same origin for another workspace, and never edits saved notes',
    'an unacknowledged committed first Save recovers only as an explicitly chosen separate copy after reload',
    'real HTTP cold restarts retain to-do transitions, history, due metadata and static browser module delivery',
}
FAILED_BROWSER_NAME = 'Draft recovery after an unacknowledged committed Save requires separate-copy consent and never automatically replays'
STORAGE_FILES = ['storage-01-persistence.json', 'storage-02-atomic-versions.json',
                 'storage-03-capacity-utf8.json', 'storage-04-corrupt-preservation.json',
                 'storage-05-injected-abort.json', 'storage-06-blocked-open-control.json',
                 'storage-07-versionchange-close.json', 'storage-08-workspace-isolation.json']
REQUIRED_SOURCE = {WORKFLOW, COLLECTOR, FLOOR,
    STUDIO + 'apps/notes/draft-recovery.mjs', STUDIO + 'apps/notes/draft-recovery.test.mjs',
    STUDIO + 'apps/notes/draft-recovery.ui.test.mjs', STUDIO + 'apps/notes/draft-recovery.http.test.mjs',
    STUDIO + 'browser-tests/notes-draft-recovery.spec.mjs', STUDIO + 'browser-tests/notes-draft-recovery.storage.spec.mjs',
    STUDIO + 'browser-tests/playwright.notes-draft-recovery.config.mjs',
    STUDIO + 'experiments/notes-draft-recovery/README.md', STUDIO + 'experiments/notes-draft-recovery/BASELINE.json'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def identity(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def pin(value):
    return {'bytes': value['bytes'], 'sha256': value['sha256']}


def blob_oid(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()


def decode(raw):
    def pairs(rows):
        result = {}
        for key, value in rows:
            require(key not in result, 'Duplicate JSON object key')
            result[key] = value
        return result
    def invalid_constant(value):
        raise ValueError('Nonfinite JSON number: ' + value)
    return json.loads(raw.decode('utf-8-sig'), object_pairs_hook=pairs, parse_constant=invalid_constant)


def safe(name):
    require(isinstance(name, str) and name and len(name) <= 4096, 'Invalid member path')
    require(not any(ord(char) < 32 or ord(char) == 127 or char in '\\:*?"<>|' for char in name)
            and not name.startswith('/'), 'Unsafe member path')
    for part in name.split('/'):
        require(part and part not in ('.', '..') and not part.endswith((' ', '.')), 'Unsafe path component')
        require(not re.fullmatch(r'(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?', part, re.I), 'Reserved Windows path component')
    return name


def no_link(path):
    item = pathlib.Path(path).absolute()
    require('..' not in item.parts, 'Parent traversal is not allowed')
    for ancestor in reversed((item, *item.parents)):
        try:
            value = ancestor.lstat()
        except FileNotFoundError:
            continue
        require(not stat.S_ISLNK(value.st_mode) and not (getattr(value, 'st_file_attributes', 0) & 1024),
                'Symlink or Windows reparse point is not allowed')
    return item


def read_bounded(path, limit):
    item = no_link(path)
    before = item.stat()
    require(stat.S_ISREG(before.st_mode) and 0 <= before.st_size <= limit, 'Input is not an ordinary bounded file')
    raw = item.read_bytes()
    after = item.stat()
    require(len(raw) == before.st_size == after.st_size and before.st_mtime_ns == after.st_mtime_ns,
            'Input changed during read')
    return raw


def write_new(root, name, raw):
    root = no_link(root)
    target = no_link(root.joinpath(*safe(name).split('/')))
    require(target.is_relative_to(root) and target != root, 'Output escapes its fresh recovery directory')
    target.parent.mkdir(parents=True, exist_ok=True)
    no_link(target)
    with target.open('xb') as handle:
        handle.write(raw)
    require(read_bounded(target, len(raw)) == raw, 'Local file readback differs: ' + name)


def unzip(raw, count_limit, total_limit, individual_limit):
    result, directories, folded, total = {}, [], set(), 0
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        infos = archive.infolist()
        require(0 < len(infos) <= count_limit, 'Unexpected ZIP member count')
        offsets = set()
        for item in infos:
            name = item.filename.rstrip('/') if item.is_dir() else item.filename
            safe(name)
            require(name.casefold() not in folded, 'Duplicate/colliding ZIP member: ' + name)
            folded.add(name.casefold())
            require(item.header_offset not in offsets, 'Overlapping ZIP headers')
            offsets.add(item.header_offset)
            require(not item.flag_bits & 1, 'Encrypted evidence ZIP member')
            require(item.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), 'Unsupported ZIP compression')
            kind = stat.S_IFMT(item.external_attr >> 16)
            require(kind in (0, stat.S_IFREG, stat.S_IFDIR), 'ZIP contains a nonordinary member')
            if item.is_dir():
                require(item.file_size == 0 and kind in (0, stat.S_IFDIR), 'Invalid directory entry')
                directories.append(name + '/')
                continue
            require(kind in (0, stat.S_IFREG) and item.file_size <= individual_limit, 'ZIP member exceeds its fixed type/size bound')
            total += item.file_size
            require(total <= total_limit, 'ZIP total raw bytes exceed fixed bound')
            content = archive.read(item)
            require(len(content) == item.file_size and zlib.crc32(content) & 0xffffffff == item.CRC, 'ZIP member CRC/length failed')
            result[name] = content
    for name in directories:
        require(any(file.startswith(name) for file in result), 'Unexpected empty evidence directory')
    return result


def archive_readback(path, role, output):
    outer = read_bounded(path, MAX_OUTER)
    size, digest = FIXED_OUTERS[role]
    require(identity(outer) == {'bytes': size, 'sha256': digest}, 'Original first-failure outer ZIP differs')
    outer_members = unzip(outer, 1, MAX_INNER, MAX_INNER)
    expected = f'rea-draft-recovery-{role}-{RUN}-{ATTEMPT}.zip'
    require(set(outer_members) == {expected}, 'Expected exactly the original campaign ZIP inside the Actions artifact')
    inner = outer_members[expected]
    members = unzip(inner, MAX_FILES, MAX_TOTAL, MAX_FILE)
    for name, raw in members.items():
        write_new(output, role + '/readable/' + name, raw)
    write_new(output, role + '/' + expected, inner)
    rows = [{'path': name, **identity(raw), 'CRCVerified': True, 'readbackVerified': True}
            for name, raw in sorted(members.items())]
    return members, {'outer': identity(outer), 'inner': identity(inner), 'innerName': expected,
                     'members': rows, 'memberCount': len(rows), 'rawBytes': sum(row['bytes'] for row in rows),
                     'allUploadedMembersReadable': True}


def execution(role):
    return {'CI': 'true', 'GITHUB_ACTIONS': 'true', 'RUNNER_ENVIRONMENT': 'github-hosted',
            'RUNNER_OS': 'Windows', 'RUNNER_ARCH': 'X64', 'GITHUB_SHA': COMMIT,
            'GITHUB_REF': 'refs/heads/' + BRANCH, 'GITHUB_EVENT_NAME': 'push',
            'GITHUB_RUN_ID': RUN, 'GITHUB_RUN_ATTEMPT': str(ATTEMPT),
            'GITHUB_REPOSITORY': 'Ginderlax/rea-research-lab', 'GITHUB_JOB': JOB_NAMES[role]}


def eligible(name):
    if name in REQUIRED_SOURCE:
        return True
    if not name.startswith(STUDIO):
        return False
    relative = name[len(STUDIO):]
    parts = relative.split('/')
    if relative in ('server.mjs', 'catalog.mjs', 'package.json'):
        return True
    if any(part in ('node_modules', '.local', 'results') for part in parts):
        return False
    if relative.startswith('apps/notes/'):
        return True
    return parts[0] in ('apps', 'lib', 'public', 'browser-tests', 'scripts', 'tests') and bool(re.search(r'\.(mjs|json|html|css|ps1)$', parts[-1]))


def api_provenance(metadata, artifact_ids, readability):
    run, jobs, artifacts, commit, tree = [metadata[name] for name in ('run', 'jobs', 'artifacts', 'commit', 'tree')]
    require(str(run['id']) == RUN and run['head_sha'] == COMMIT and run['run_attempt'] == ATTEMPT, 'Run/source/attempt mismatch')
    require(run['head_branch'] == BRANCH and run['event'] == 'push' and run['path'] == WORKFLOW, 'Wrong workflow/event/branch')
    require(run['status'] == 'completed' and run['repository']['full_name'] == 'Ginderlax/rea-research-lab', 'Run is not completed in the intended repository')
    require(run['conclusion'] == 'failure', 'The original failed run conclusion changed')
    require(commit['sha'] == COMMIT and [row['sha'] for row in commit['parents']] == [PARENT], 'Immutable commit/parent mismatch')
    require(tree['sha'] == commit['tree']['sha'] and tree['truncated'] is False, 'Missing complete immutable Git tree')
    objects = {}
    for row in tree['tree']:
        safe(row['path'])
        if row['type'] == 'blob':
            require(row['path'] not in objects and row['mode'] in ('100644', '100755'), 'Duplicate/nonordinary Git source blob')
            objects[row['path']] = row
    require(jobs['total_count'] == 2 and len(jobs['jobs']) == 2, 'Expected exactly the two experiment jobs')
    by_job = {str(row['id']): row for row in jobs['jobs']}
    require(set(by_job) == set(JOBS.values()), 'Unexpected job identity')
    by_artifact = {str(row['id']): row for row in artifacts['artifacts']}
    require(artifacts['total_count'] == 2 and len(by_artifact) == 2, 'Expected exactly the two original role artifacts')
    require(set(by_artifact) == set(artifact_ids.values()), 'Unexpected artifact identity')
    conclusions = {}
    for role in ('finite', 'browser'):
        job = by_job[JOBS[role]]
        require(str(job['run_id']) == RUN and job['run_attempt'] == ATTEMPT and job['head_sha'] == COMMIT, 'Job source/attempt mismatch')
        require(job['name'] == JOB_NAMES[role] and job['status'] == 'completed', 'Job name/status mismatch')
        require(job['runner_group_name'] == 'GitHub Actions' and 'windows-2022' in job['labels'], 'Hosted Windows runner is not verified')
        require(job['conclusion'] == 'failure', 'The original failed job conclusion changed')
        artifact = by_artifact[artifact_ids[role]]
        require(artifact['name'] == f'notes-draft-recovery-{role}-{RUN}-{ATTEMPT}' and artifact['expired'] is False, 'Artifact name/retention mismatch')
        require(str(artifact['workflow_run']['id']) == RUN and artifact['workflow_run']['head_sha'] == COMMIT, 'Artifact source binding mismatch')
        outer = readability[role]['outer']
        require(artifact['size_in_bytes'] == outer['bytes'] and artifact['digest'] == 'sha256:' + outer['sha256'], 'Artifact API size/digest differs from the actual outer ZIP')
        conclusions[role] = job['conclusion']
    return objects, {'runConclusion': run['conclusion'], 'jobConclusions': conclusions,
                     'sourceCommit': COMMIT, 'actualImmutableTree': tree['sha'], 'hostedWindowsVerified': True}


def source_qualification(members, role, objects):
    value = lambda name: decode(members[name])
    before = value(f'draft-recovery-{role}-before.json')
    after = value(f'draft-recovery-{role}-after.json')
    attempt = value(f'draft-recovery-{role}-{role}.json')
    for record, phase in ((before, 'before'), (after, 'after'), (attempt, role)):
        require(record['schema'] == 'rea-notes-draft-recovery-experiment-cloud/v1' and record['phase'] == phase and record['role'] == role, 'Record role/schema mismatch')
        require(record['execution'] == execution(role) and record['sourceCommit'] == COMMIT, 'Record belongs to another attempt/source')
        for flag in ('sourceOverlay', 'sourceMutationPerformed', 'installedAcceptance', 'historicalReceiptsRebound', 'originalAutosaveComparison', 'fullParity', 'superiority'):
            require(record[flag] is False, 'Unexpected acceptance/mutation declaration')
        require(record['originalFullApplicationExecutions'] == 0 and record['sourceStable'] is True, 'Original application/source stability mismatch')
        retained = record['retainedEvidence']
        require(len({row['path'] for row in retained['rows']}) == len(retained['rows']), 'Duplicate evidence declaration')
        for row in retained['rows']:
            require(identity(members[safe(row['path'])]) == pin(row), 'Declared evidence bytes differ: ' + row['path'])
        require(retained['bytes'] == sum(row['bytes'] for row in retained['rows']) and retained['excludesOwnTerminalRecord'] is True, 'Evidence declaration byte/count mismatch')
    require(before['status'] == 'source-verified-unexecuted' and after['status'] == 'source-verified', 'Source checks did not independently succeed')
    require(attempt['status'] in ('passed', 'failed') and after['executionStatus'] == attempt['status'], 'Actual attempt status was not preserved')
    before_raw = members[f'draft-recovery-{role}-before.json']
    require(after['beforeReceipt'] == identity(before_raw) and attempt['beforeReceipt'] == identity(before_raw), 'Before receipt binding failed')
    require(after['executionAttempt'] == identity(members[f'draft-recovery-{role}-{role}.json']), 'After receipt binds another test attempt')
    rows = value(f'draft-recovery-{role}-source-before.json')
    require(rows == value(f'draft-recovery-{role}-source-after.json') == value(f'draft-recovery-{role}-execution-postcheck.json'), 'Before/independent-after/in-process-after source census differs')
    require(rows == sorted(rows, key=lambda row: row['path']) and len({row['path'] for row in rows}) == len(rows), 'Source rows are not a unique sorted closure')
    floor_raw = members['source-before/' + FLOOR + '.snapshot']
    floor = decode(floor_raw)
    require(floor['schema'] == 'rea-notes-draft-recovery-regression-floor/v1' and floor['baselineGitCommit'] == PARENT, 'Wrong regression floor epoch')
    require(len(floor['priorTests']) == 21 and len(floor['priorNamedResults']) == 111 and len(set(floor['priorNamedResults'])) == 111, 'Wrong prior floor')
    require(len(floor['newNamedResults']) == 17 and len(set(floor['newNamedResults'])) == 17, 'Wrong new finite roster')
    require(len(floor['browserUITitles']) == 4 and len(floor['browserStorageTitles']) == 8, 'Wrong browser roster')
    require(len(floor['originalInputs']) == 64, 'Wrong retained original closure')
    names = sorted(set(name for name in objects if eligible(name)) | {row['path'] for row in floor['originalInputs']})
    require([row['path'] for row in rows] == names, 'Selected source closure differs from the independent immutable Git API tree')
    expected_tree = bytearray()
    for row in rows:
        name = safe(row['path'])
        left, right = members['source-before/' + name + '.snapshot'], members['source-after/' + name + '.snapshot']
        require(left == right and identity(left) == pin(row), 'Captured source bytes changed: ' + name)
        require(blob_oid(left) == row['gitBlob'] == objects[name]['sha'], 'Captured source is not the actual immutable commit blob: ' + name)
        require(objects[name]['size'] == len(left), 'Git API source size differs')
        expected_tree.extend(f"{objects[name]['mode']} blob {objects[name]['sha']}\t{name}\0".encode('utf-8'))
    require(bytes(expected_tree) == members['source-before/GIT-TREE.selected.raw'] == members['source-after/GIT-TREE.selected.raw'], 'Raw selected Git rows differ')
    for name, (size, digest) in FIXED_SOURCE.items():
        require(identity(members['source-before/' + name + '.snapshot']) == {'bytes': size, 'sha256': digest}, 'Reviewed workflow/collector/floor changed')
    for row in floor['priorTests'] + floor['originalInputs'] + floor['unchangedTooling']:
        require(identity(members['source-before/' + row['path'] + '.snapshot']) == pin(row), 'Frozen prior/original/tool input changed')
        if 'gitBlob' in row:
            require(objects[row['path']]['sha'] == row['gitBlob'], 'Frozen prior Git blob changed')
    require(attempt['regressionFloor'] == identity(floor_raw), 'Attempt floor receipt mismatch')
    source_paths = {prefix + name + '.snapshot' for prefix in ('source-before/', 'source-after/') for name in names}
    source_paths |= {'source-before/GIT-TREE.selected.raw', 'source-after/GIT-TREE.selected.raw'}
    common = {f'draft-recovery-{role}-{name}.json' for name in ('before', role, 'after', 'source-before', 'source-after', 'execution-postcheck')}
    common.add('workflow-attempt.json')
    if role == 'finite':
        exact_files = source_paths | common | {'finite-stdout.txt', 'finite-stderr.txt'} | {'notes-observations/' + name for name in ('inline-confirmation.json', 'fresh-boundaries.json', 'publication-boundaries.json', 'review.json')}
    else:
        exact_files = source_paths | common | {'browser-tooling-acquisition.json', 'browser-acquire-stdout.txt', 'browser-acquire-stderr.txt', 'browser-acquire-events.jsonl', 'real-chromium-stdout.txt', 'real-chromium-stderr.txt', 'playwright-results.json', 'playwright-output/.last-run.json'} | set(STORAGE_FILES)
        exact_files |= {'notes-draft-case-' + hashlib.sha256(title.encode()).hexdigest()[:20] + '.json' for title in floor['browserUITitles']}
        # Failed Playwright attempts may retain their bounded failure evidence.
        if attempt['status'] == 'failed':
            extras = set(members) - exact_files
            require(all(name.startswith('playwright-output/') or re.fullmatch(r'notes-draft-failure-[0-9a-f]{20}\.png', name) for name in extras), 'Unexpected failure-evidence extra')
            exact_files |= extras
    require(set(members) == exact_files, 'Unexpected or missing evidence members: ' + str(sorted(set(members) ^ exact_files)[:12]))
    after_declared = {row['path'] for row in after['retainedEvidence']['rows']}
    require(after_declared == set(members) - {f'draft-recovery-{role}-after.json', 'workflow-attempt.json'}, 'Independent final evidence declaration is incomplete')
    workflow = value('workflow-attempt.json')
    require(workflow['schema'] == 'rea-notes-draft-recovery-workflow-attempt/v1' and workflow['role'] == role, 'Workflow receipt role mismatch')
    require(workflow['sourceCommit'] == COMMIT and str(workflow['runId']) == RUN and str(workflow['runAttempt']) == str(ATTEMPT), 'Workflow receipt source/attempt mismatch')
    require(workflow['checkoutOutcome'] == workflow['sourceBeforeOutcome'] == workflow['sourceAfterOutcome'] == 'success', 'Source/workflow step failed')
    require(workflow['verificationOutcome'] == ('success' if attempt['status'] == 'passed' else 'failure'), 'Workflow did not preserve actual test failure status')
    for flag in ('sourceOverlay', 'installedAcceptance', 'historicalReceiptsRebound', 'originalAutosaveComparison', 'fullParity', 'superiority'):
        require(workflow[flag] is False, 'Unexpected workflow claim')
    return floor, attempt, {'sourceFiles': len(rows), 'sourceBytes': sum(row['bytes'] for row in rows), 'allCapturedGitBlobsMatchIndependentTree': True, 'unchangedPriorTestFiles': 21, 'retainedPriorNamedChecks': 111, 'retainedOriginalInputs': 64, 'sourceStable': True}


def finite_observation(members, floor, attempt):
    text = members['finite-stdout.txt'].decode('utf-8')
    require(text.startswith('TAP version 13\n') or text.startswith('TAP version 13\r\n'), 'Missing actual TAP header')
    names = re.findall(r'^# Subtest: ([^\r\n]+)\r?$', text, re.M)
    require(len(names) == len(set(names)) == 128 and sorted(names) == sorted(floor['priorNamedResults'] + floor['newNamedResults']), 'The exact128 named results were not executed')
    results = re.findall(r'^(ok|not ok) ([0-9]+) - ([^\r\n]+)\r?$', text, re.M)
    require(len(results) == 128, 'Missing top-level TAP results')
    for index, result in enumerate(results):
        require(int(result[1]) == index + 1 and result[2] == names[index], 'TAP result/name ordering mismatch')
    summary = {}
    for name in ('tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo'):
        matches = re.findall(r'^# ' + name + r' ([0-9]+)\r?$', text, re.M)
        require(len(matches) == 1, 'Missing/duplicate TAP summary: ' + name)
        summary[name] = int(matches[0])
    require(summary['tests'] == 128 and summary['suites'] == summary['cancelled'] == summary['skipped'] == summary['todo'] == 0, 'TAP count/skip/abort contract failed')
    require(summary['pass'] + summary['fail'] == 128 and summary['fail'] == sum(row[0] == 'not ok' for row in results), 'TAP summary contradicts actual named results')
    child = attempt['children']
    require(len(child) == 1 and child[0]['label'] == 'finite' and child[0]['closeObserved'] is True and child[0]['signal'] is None and child[0]['stopReason'] is None and child[0]['rawLogsComplete'] is True, 'Finite process did not close with complete raw logs')
    require(child[0]['exitCode'] == (0 if summary['fail'] == 0 else 1), 'TAP/process status contradiction')
    require(attempt['status'] == ('passed' if summary['fail'] == 0 else 'failed'), 'Collector discarded a real finite failure')
    failed_names = [row[2] for row in results if row[0] == 'not ok']
    require(summary['pass'] == 125 and summary['fail'] == 3 and set(failed_names) == FAILED_FINITE_NAMES,
            'The fixed first-failure125/128 result or its three failure names changed')
    require(child[0]['stdout'] == 'finite-stdout.txt' and child[0]['stderr'] == 'finite-stderr.txt'
            and child[0]['outputBytes'] == [len(members['finite-stdout.txt']), len(members['finite-stderr.txt'])]
            and not child[0].get('spawnError'), 'Finite raw output closure differs')
    return {'summary': summary, 'failedNames': failed_names, 'all128NamesRetained': True, 'acceptance': False}


def exact_keys(value, names, label):
    require(type(value) is dict and set(value) == set(names), 'Unexpected raw observation fields: ' + label)


def uuid(value):
    return type(value) is str and re.fullmatch(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}', value, re.I) is not None


def integer(value, minimum=0):
    return type(value) is int and minimum <= value <= 9007199254740991


def normalized_record(row):
    exact_keys(row, ('schema', 'scope', 'id', 'version', 'title', 'body', 'tags', 'notebookId', 'isTodo',
                     'sourceNoteId', 'sourceRevision', 'pendingSave', 'updatedAt'), 'normalized record')
    require(type(row['schema']) is int and row['schema'] == 1 and uuid(row['scope']) and uuid(row['id']), 'Invalid raw schema/scope/ID')
    require(integer(row['version'], 1) and integer(row['updatedAt']), 'Invalid raw record version/time')
    require(type(row['isTodo']) is bool and type(row['pendingSave']) is bool, 'Invalid raw boolean')
    for key, limit in (('title', 4096), ('body', 2000000), ('tags', 16384), ('notebookId', 200)):
        require(type(row[key]) is str and len(row[key].encode('utf-16-le', 'surrogatepass')) // 2 <= limit, 'Invalid raw text field')
    source = row['sourceNoteId']
    require((source is None and type(row['sourceRevision']) is int and row['sourceRevision'] == 0)
            or ((uuid(source) or (type(source) is str and re.fullmatch(r'[0-9a-f]{32}', source, re.I)))
                and integer(row['sourceRevision'], 1)), 'Invalid raw provenance')
    require(len(json.dumps(row, ensure_ascii=False, separators=(',', ':')).encode('utf-8')) <= 2 * 1024 * 1024,
            'Oversized normalized raw observation')
    return row


def stored_input(value, scope):
    exact_keys(value, ('id', 'version', 'title', 'body', 'tags', 'notebookId', 'isTodo',
                       'sourceNoteId', 'sourceRevision', 'pendingSave', 'updatedAt'), 'raw input')
    return normalized_record({'schema': 1, 'scope': scope, **value})


def synthetic(row, **changes):
    normalized_record(row)
    expected = {'schema': 1, 'scope': row['scope'], 'id': row['id'], 'version': 1, 'title': 'Synthetic draft',
                'body': 'Synthetic body', 'tags': 'one, two', 'notebookId': '__default__', 'isTodo': False,
                'sourceNoteId': None, 'sourceRevision': 0, 'pendingSave': False, 'updatedAt': 1, **changes}
    require(row == expected, 'Synthetic raw record content differs from the committed storage scenario')
    return expected


def storage_observations(members):
    observations = [decode(members[name]) for name in STORAGE_FILES]
    one, two, three, four, five, six, seven, eight = observations
    exact_keys(one, ('scope', 'input', 'listed', 'stored', 'savedCount'), STORAGE_FILES[0])
    expected = stored_input(one['input'], one['scope'])
    synthetic(expected, title='x' * 400, body='<img src=x onerror=alert(1)>\n\0raw text',
              tags=' , duplicate, duplicate, ', isTodo=True, pendingSave=True)
    require(type(one['savedCount']) is int and one['savedCount'] == 0 and one['listed'] == [expected]
            and one['stored'] == expected, 'Native persistence lost raw text or implicitly saved a note')

    exact_keys(two, ('oldPut', 'equalPut', 'oldRemove', 'afterStale', 'removed', 'afterRemove', 'retiredPut'), STORAGE_FILES[1])
    require(two['oldPut'] == two['equalPut'] == two['retiredPut'] == 'STALE' and two['oldRemove'] is False
            and two['removed'] is True and two['afterRemove'] == [], 'Native atomic stale/remove controls differ')
    require(type(two['afterStale']) is list and len(two['afterStale']) == 1, 'Missing atomic retained record')
    synthetic(two['afterStale'][0], version=2, body='newer from another connection', updatedAt=2)

    exact_keys(three, ('originals', 'fifth', 'oversized', 'unchanged', 'updated'), STORAGE_FILES[2])
    originals = three['originals']
    require(type(originals) is list and len(originals) == 4 and len({row['id'] for row in originals}) == 4,
            'Capacity control is missing four distinct original copies')
    for index, row in enumerate(originals):
        synthetic(row, title='kept ' + str(index), updatedAt=index + 1)
    require(len({row['scope'] for row in originals}) == 1 and three['fifth'] == three['oversized'] == 'LIMIT'
            and three['unchanged'] == list(reversed(originals)), 'Capacity refusal evicted or changed original copies')
    expected_update = {**originals[0], 'version': 2, 'title': 'updated while full', 'updatedAt': 10}
    require(three['updated'] == [expected_update, originals[3], originals[2], originals[1]], 'Update while full lost or reordered retained copies')

    exact_keys(four, ('controls',), STORAGE_FILES[3])
    controls = four['controls']
    require(type(controls) is list and len(controls) == 4, 'Missing four native corrupt-data controls')
    good = {**controls[0]['malformed'], 'schema': 1}
    synthetic(good)
    wrong_scope = controls[3]['malformed']['scope']
    require(uuid(wrong_scope) and wrong_scope != good['scope'], 'Wrong-workspace corruption control is not distinct')
    corruptions = [{**good, 'schema': 99}, {**good, 'sourceRevision': -1},
                   {**good, 'unexpected': 'preserve this unsupported field'}, {**good, 'scope': wrong_scope}]
    for control, malformed in zip(controls, corruptions):
        exact_keys(control, ('malformed', 'retained', 'listCode', 'putCode', 'removeCode'), 'corruption control')
        require(control['malformed'] == malformed and control['retained'] == malformed
                and control['listCode'] == control['putCode'] == control['removeCode'] == 'CORRUPT',
                'Native corrupt control was not preserved exactly on all three refused operations')

    exact_keys(five, ('control', 'original', 'aborted', 'after', 'retried'), STORAGE_FILES[4])
    require(five['control'] == 'Test-injected transaction.abort() after real IDB put; not native disk quota exhaustion.'
            and five['aborted'] == 'UNAVAILABLE' and type(five['after']) is list and len(five['after']) == 1,
            'Injected native abort evidence/control wording differs')
    abort_original = stored_input(five['original'], five['after'][0]['scope'])
    synthetic(abort_original)
    require(five['after'] == [abort_original] and five['retried'] == [{**abort_original, 'version': 3, 'body': 'later genuine transaction succeeds'}],
            'Injected aborted transaction lost the last commit or later retry content')

    exact_keys(six, ('control', 'blocked', 'version', 'retained', 'input'), STORAGE_FILES[5])
    blocked_original = stored_input(six['input'], six['retained']['scope'])
    synthetic(blocked_original)
    require(six['control'] == 'Adapter asks real IDB for version 2 while a raw version-1 connection stays open; no synthetic blocked event or quota claim.'
            and six['blocked'] == 'BLOCKED' and type(six['version']) is int and six['version'] == 1
            and six['retained'] == blocked_original, 'Native blocked-upgrade control changed version or retained bytes')

    exact_keys(seven, ('input', 'version', 'retained', 'closedList', 'closedPut', 'closedRemove'), STORAGE_FILES[6])
    closed_original = stored_input(seven['input'], seven['retained']['scope'])
    synthetic(closed_original)
    require(type(seven['version']) is int and seven['version'] == 2 and seven['retained'] == closed_original
            and seven['closedList'] == seven['closedPut'] == seven['closedRemove'] == 'CLOSED',
            'Native versionchange failed to close all operations or preserve the raw copy')

    exact_keys(eight, ('scopeA', 'scopeB', 'input', 'before', 'wrongScope', 'recordsA', 'recordsB'), STORAGE_FILES[7])
    require(uuid(eight['scopeA']) and uuid(eight['scopeB']) and eight['scopeA'] != eight['scopeB']
            and eight['before'] == [] and eight['wrongScope'] == 'INVALID', 'Native workspace isolation controls differ')
    isolation_original = stored_input(eight['input'], eight['scopeA'])
    synthetic(isolation_original)
    require(eight['recordsA'] == [isolation_original]
            and eight['recordsB'] == [{**isolation_original, 'scope': eight['scopeB'], 'body': 'separate workspace, same record ID'}],
            'Same-origin native workspaces leaked or altered each other\'s same-ID copy')
    return [{'path': name, **identity(members[name]), 'rawNativeInvariantsVerified': True} for name in STORAGE_FILES]


def browser_observation(members, floor, attempt):
    report = decode(members['playwright-results.json'])
    specs = []
    def visit(suite):
        specs.extend(suite.get('specs', []))
        for nested in suite.get('suites', []):
            visit(nested)
    for suite in report['suites']:
        visit(suite)
    require(report['errors'] == [], 'Playwright infrastructure errors are present')
    require(len(specs) == 12 and sorted(row['title'] for row in specs) == sorted(floor['browserUITitles'] + floor['browserStorageTitles']), 'Missing/duplicate real Chromium scenario')
    failed = []
    for spec in specs:
        require(len(spec['tests']) == 1 and len(spec['tests'][0]['results']) == 1, 'Browser retry or duplicate project execution')
        test = spec['tests'][0]; result = test['results'][0]
        require(result['retry'] == 0 and result['status'] in ('passed', 'failed'), 'Browser scenario skipped, retried or timed out')
        expected_file = 'notes-draft-recovery.spec.mjs' if spec['title'] in floor['browserUITitles'] else 'notes-draft-recovery.storage.spec.mjs'
        require(spec['file'].replace('\\', '/').split('/')[-1] == expected_file, 'Browser scenario executed from another file')
        require(spec['ok'] == (result['status'] == 'passed') and test['status'] == ('expected' if result['status'] == 'passed' else 'unexpected'), 'Playwright result contradicts scenario status')
        if result['status'] != 'passed':
            failed.append(spec['title'])
    stats = report['stats']
    require([stats['expected'], stats['unexpected'], stats['skipped'], stats['flaky']] == [12 - len(failed), len(failed), 0, 0], 'Browser summary mismatch')
    require(attempt['status'] == ('passed' if not failed else 'failed'), 'Collector discarded a real browser failure')
    ui_cases = []
    for title in floor['browserUITitles']:
        name = 'notes-draft-case-' + hashlib.sha256(title.encode()).hexdigest()[:20] + '.json'
        case = decode(members[name])
        require(case['schema'] == 'rea-notes-draft-recovery-real-browser-case/v1' and case['title'] == title, 'Wrong UI observation')
        require(case['sourceCommit'] == COMMIT and str(case['runId']) == RUN and str(case['attempt']) == str(ATTEMPT), 'UI observation source mismatch')
        require(case['browserName'] == 'chromium' and case['browserVersion'] == '156.0.8078.4' and case['realBrowser'] is True and case['actualHTTP'] is True and case['retry'] == 0, 'Actual Chromium launch/delivery was not observed')
        require(case['delivery'] == identity(members['source-before/' + STUDIO + 'apps/notes/draft-recovery.mjs.snapshot']), 'Delivered module differs from committed source')
        require(all(case['cleanup'][key] is True for key in ('contextClosed', 'hostClosed', 'dataRemoved', 'heldRoutesFinished')), 'UI owned cleanup incomplete')
        require(case['errors'] == [] and case['originalProductExecutions'] == 0 and case['fullParity'] is False and case['superiority'] is False, 'Unexpected UI error or claim')
        require(case['statusAtFixtureClose'] == ('failed' if title in failed else 'passed'), 'UI failure status was not retained')
        ui_cases.append({'title': title, 'status': case['statusAtFixtureClose'], 'path': name, **identity(members[name])})
    require(failed == [FAILED_BROWSER_NAME] and stats['expected'] == 11 and stats['unexpected'] == 1,
            'The fixed first-failure11/12 browser result or its failed title changed')
    child = attempt['children']
    require(len(child) == 1 and child[0]['label'] == 'real-chromium' and child[0]['closeObserved'] is True
            and child[0]['signal'] is None and child[0]['stopReason'] is None and child[0]['rawLogsComplete'] is True
            and child[0]['exitCode'] == 1 and not child[0].get('spawnError'), 'Browser child did not close with complete failed-attempt logs')
    require(child[0]['stdout'] == 'real-chromium-stdout.txt' and child[0]['stderr'] == 'real-chromium-stderr.txt'
            and child[0]['outputBytes'] == [len(members['real-chromium-stdout.txt']), len(members['real-chromium-stderr.txt'])],
            'Browser child raw output closure differs')
    storage_checks = storage_observations(members)
    acquisition = decode(members['browser-tooling-acquisition.json'])
    require(acquisition['status'] == 'acquired' and acquisition['sourceCommit'] == COMMIT and acquisition['productTests'] == 0 and acquisition['applicationSourcesChanged'] is False, 'Browser acquisition failed or changed sources')
    expected_execution = execution('browser')
    for key in ('GITHUB_JOB', 'GITHUB_REF', 'GITHUB_EVENT_NAME'):
        del expected_execution[key]
    require(acquisition['execution'] == expected_execution, 'Browser acquisition belongs to another attempt')
    require(acquisition['browserImage']['revision'] == '1248' and acquisition['browserImage']['expectedVersion'] == '156.0.8078.4', 'Browser image version mismatch')
    for child in acquisition['children']:
        require(child['exitCode'] == 0 and child['signal'] is None and child['closeObserved'] is True and child['stopReason'] is None, 'Tool acquisition child failed')
    require(len(acquisition['children']) == 2, 'Unexpected acquisition process count')
    for field, name in (('package', 'package.json'), ('lock', 'package-lock.json'), ('browserMetadata', 'browser-metadata.json')):
        require(acquisition['toolingSource'][field] == identity(members['source-before/' + STUDIO + 'browser-tests/' + name + '.snapshot']), 'Locked browser source mismatch')
    return {'summary': stats, 'failedNames': failed, 'all12NamesRetained': True, 'UIObservations': ui_cases, 'nativeStorageObservations': storage_checks, 'acceptance': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--finite-zip', required=True)
    parser.add_argument('--finite-artifact-id', required=True)
    parser.add_argument('--browser-zip', required=True)
    parser.add_argument('--browser-artifact-id', required=True)
    parser.add_argument('--metadata', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    work = no_link(pathlib.Path(__file__).absolute().parents[1])
    run_root = no_link(work / 'cloud-verification-backups' / ('run-' + RUN))
    metadata_root = no_link(args.metadata)
    require(metadata_root == run_root / METADATA_FOLDER, 'Use the exact first-failure metadata directory')
    for role in ('finite', 'browser'):
        require(getattr(args, role + '_artifact_id') == ARTIFACTS[role], 'Use the fixed original artifact ID')
        require(no_link(getattr(args, role + '_zip')) == run_root / ('artifact-' + ARTIFACTS[role] + '.zip'),
                'Use the fixed original artifact path')
    output = no_link(args.output)
    require(output.parent == run_root and output.name.startswith('portable-readback-r2-'),
            'Output must be a fresh portable-readback-r2- directory directly inside this run backup')
    safe(output.name)
    require(not output.exists(), 'Use a new output directory; previous readbacks must be preserved')
    output.mkdir()
    receipt = {'schema': 'rea-notes-draft-recovery-portable-evidence-qualification/v1',
               'createdAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'runId': RUN, 'sourceCommit': COMMIT,
               'status': 'running', 'acceptance': False, 'readability': {}, 'sourceQualifications': {}, 'actualResults': {}, 'failures': [],
               'readerExecution': 'Data-only standard-library JSON, ZIP CRC, file readback and Git-blob hash processing. Captured code is never imported or executed.',
               'applicationExecutions': 0, 'originalExecutions': 0, 'browserExecutions': 0, 'tests': 0, 'builds': 0, 'syntaxChecks': 0,
               'installedAcceptance': False, 'historicalReceiptsRebound': False, 'originalAutosaveComparison': False, 'fullParity': False, 'superiority': False}
    members = {}
    try:
        for role in ('finite', 'browser'):
            members[role], receipt['readability'][role] = archive_readback(getattr(args, role + '_zip'), role, output)
        receipt['allUploadedMembersReadable'] = True
        metadata = {}
        for name in ('run', 'jobs', 'artifacts', 'commit', 'tree'):
            raw = read_bounded(pathlib.Path(args.metadata) / (name + '.json'), 32 * 1024 * 1024)
            size, digest = FIXED_METADATA[name]
            require(identity(raw) == {'bytes': size, 'sha256': digest}, 'Original raw API metadata differs: ' + name)
            write_new(output, 'metadata/' + name + '.json', raw)
            metadata[name] = decode(raw)
        ids = {'finite': args.finite_artifact_id, 'browser': args.browser_artifact_id}
        objects, receipt['apiProvenance'] = api_provenance(metadata, ids, receipt['readability'])
        for role in ('finite', 'browser'):
            try:
                floor, attempt, qualification = source_qualification(members[role], role, objects)
                receipt['sourceQualifications'][role] = qualification
                observation = finite_observation if role == 'finite' else browser_observation
                receipt['actualResults'][role] = observation(members[role], floor, attempt)
            except Exception as error:
                receipt['failures'].append({'stage': role, 'type': type(error).__name__, 'message': str(error)[:4000]})
        receipt['acceptance'] = (not receipt['failures'] and receipt['apiProvenance']['runConclusion'] == 'success'
                                  and all(value == 'success' for value in receipt['apiProvenance']['jobConclusions'].values())
                                  and all(receipt['actualResults'].get(role, {}).get('acceptance') is True for role in ('finite', 'browser')))
        require(receipt['acceptance'] is False, 'This first failed campaign can never be accepted as a product pass')
        receipt['status'] = 'qualified-source-and-readback-with-actual-test-results' if not receipt['failures'] else 'incomplete-qualification-preserved'
    except Exception as error:
        receipt['failures'].append({'stage': 'readback-or-API-provenance', 'type': type(error).__name__, 'message': str(error)[:4000]})
        receipt['status'] = 'incomplete-qualification-preserved'
    receipt['completedAtUtc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    write_new(output, 'QUALIFICATION.json', (json.dumps(receipt, indent=2) + '\n').encode())
    print(json.dumps({'status': receipt['status'], 'allUploadedMembersReadable': receipt.get('allUploadedMembersReadable', False), 'acceptance': receipt['acceptance'], 'sourceQualifiedRoles': sorted(receipt['sourceQualifications']), 'actualResults': {role: value.get('summary') for role, value in receipt['actualResults'].items()}, 'failures': receipt['failures']}))
    return 0 if not receipt['failures'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
