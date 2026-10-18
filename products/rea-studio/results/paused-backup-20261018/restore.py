"""Verify or restore saved file bytes only; never executes any backed-up content.
Run: python restore.py --repository /path/to/clone --verify
Or:  python restore.py --repository /path/to/clone --destination /new/empty/path
"""
from pathlib import Path, PurePosixPath
import argparse, atexit, hashlib, json, os, re, stat, subprocess

HERE = Path(__file__).resolve().parent
CHUNK = 1024*1024
HEAD = '3c710a31e438af7f1682fc5cf497be4264db35ff'

MAX_UNIQUE = 2 * 1024**3
MAX_LOGICAL = 100000
def check_name(name):
    if not isinstance(name,str) or not 0 < len(name) <= 4096 or any(ord(c)<32 or ord(c)==127 for c in name):
        raise ValueError('Invalid path text')
    if any(c in name for c in '\\:*?"<>|') or name.startswith('/'):
        raise ValueError('Unsafe path characters')
    pieces=name.split('/')
    for component in pieces:
        if component in ('','.','..') or component.casefold()=='.git' or component.rstrip(' .')!=component:
            raise ValueError('Noncanonical path component')
        stem=component.split('.')[0].upper()
        if stem in {'CON','PRN','AUX','NUL','CLOCK$'} or re.fullmatch(r'(?:COM|LPT)[1-9]',stem):
            raise ValueError('Reserved Windows path component')
    return PurePosixPath(name)
def no_reparse(path):
    # Check all existing ancestors as well as the leaf. resolve() alone can hide
    # a junction inside the workspace. Nonexistent new output leaves are allowed.
    for item in [path.absolute(),*path.absolute().parents]:
        try: info=item.lstat()
        except FileNotFoundError: continue
        if stat.S_ISLNK(info.st_mode) or getattr(info,'st_file_attributes',0)&0x400:
            raise ValueError('Link or reparse point refused: '+str(item))
def checked_identity(row):
    if type(row.get('bytes')) is not int or not 0 <= row['bytes'] <= MAX_UNIQUE or not isinstance(row.get('sha256'),str) or not re.fullmatch('[0-9a-f]{64}',row['sha256']):
        raise ValueError('Invalid bounded file identity')
    return row['bytes'],row['sha256']

ap = argparse.ArgumentParser()
ap.add_argument('--repository',required=True); ap.add_argument('--destination')
ap.add_argument('--verify',action='store_true')
args = ap.parse_args()
if args.verify == bool(args.destination): raise SystemExit('Choose --verify OR --destination')
repo = Path(args.repository).resolve()
no_reparse(HERE/'BACKUP-INDEX.json')
if (HERE/'BACKUP-INDEX.json').stat().st_size > 256*1024*1024: raise SystemExit('Index size bound exceeded')
index = json.loads((HERE/'BACKUP-INDEX.json').read_text(encoding='utf-8'))
if index['schema'] != 'rea-paused-portable-backup/v1' or index['baseCommit'] != HEAD: raise SystemExit('Unsupported index or historical commit')

def safe(name):
    p=check_name(name)
    if not (name.startswith('work/') or name.startswith('outputs/rea-backup-2026-10-12/')):
        raise ValueError('Unsupported logical root')
    return p

names = [r['path'] for r in index['files']+index['aliases']]
if len(names)>MAX_LOGICAL or len({n.casefold() for n in names}) != len(names): raise SystemExit('Duplicate or excessive logical paths')
for row in index['files']+index['aliases']: checked_identity(row)
if sum(row['bytes'] for row in index['files'])>MAX_UNIQUE: raise SystemExit('Unique byte bound exceeded')
if len(index['parts'])>257: raise SystemExit('Part count bound exceeded')
for n in names: safe(n)
parts = {}
for part in index['parts']:
    name = part['path']; check_name(name)
    if not re.fullmatch(r'payload/part-[0-9]{4}\.snapshot',name): raise ValueError('Unsafe part path')
    checked_identity(part)
    if name in parts or not 0 <= part['bytes'] <= 8*1024*1024: raise ValueError('Invalid part')
    no_reparse(HERE/name)
    h=hashlib.sha256(); size=0
    with (HERE/name).open('rb') as f:
        for b in iter(lambda:f.read(CHUNK),b''):h.update(b); size+=len(b)
    if (size,h.hexdigest())!=(part['bytes'],part['sha256']):raise ValueError('Part corruption: '+name)
    parts[name]=part
files={r['path']:r for r in index['files']}
if len(names)!=index['logicalFileCount']:raise ValueError('Count mismatch')
if sum(p['bytes'] for p in parts.values())!=index['storedUniqueBytes'] or index['storedUniqueBytes']>MAX_UNIQUE: raise ValueError('Stored byte count mismatch')
for row in index['files']:
    if set(row)&{'segments','contentAlias','git'}!={'segments'} or not isinstance(row['segments'],list) or len(row['segments'])>257: raise ValueError('Invalid direct storage')
for row in index['aliases']:
    if len(set(row)&{'segments','contentAlias','git'})!=1 or 'segments' in row: raise ValueError('Invalid alias storage')
tree = {}
for raw in subprocess.check_output(['git','-C',str(repo),'ls-tree','-rz',HEAD],timeout=60).split(b'\0'):
    if raw:
        props,name=raw.split(b'\t',1);mode,typ,oid=props.decode().split()
        tree[name.decode()] = (mode,typ,oid)

git_batch=None
def close_git_batch():
    if git_batch is not None:
        git_batch.stdin.close();git_batch.stdout.close()
        try:git_batch.wait(timeout=5)
        except subprocess.TimeoutExpired:git_batch.kill();git_batch.wait()
atexit.register(close_git_batch)

def chunks(row):
    global git_batch
    if 'segments' in row:
        for s in row['segments']:
            if type(s.get('offset')) is not int or type(s.get('bytes')) is not int: raise ValueError('Invalid segment numbers')
            part=parts[s['part']]
            if not (0 <= s['offset'] <= part['bytes'] and 0 < s['bytes'] <= part['bytes']-s['offset']):
                raise ValueError('Segment outside part')
            no_reparse(HERE/s['part'])
            with (HERE/s['part']).open('rb') as f:
                f.seek(s['offset']); left=s['bytes']
                while left:
                    b=f.read(min(CHUNK,left))
                    if not b:raise ValueError('Truncated part')
                    left-=len(b);yield b
    elif 'contentAlias' in row:
        original=files[row['contentAlias']]
        if (row['bytes'],row['sha256'])!=(original['bytes'],original['sha256']):raise ValueError('Alias mismatch')
        yield from chunks(original)
    elif 'git' in row:
        g=row['git'];check_name(g['path'])
        if g['commit']!=index['baseCommit'] or not all(c in '0123456789abcdef' for c in g['blob']) or len(g['blob'])!=40:
            raise ValueError('Git identity mismatch')
        # Confirm the declared historical path resolves to the pinned blob.
        if tree.get(g['path']) not in [('100644','blob',g['blob']),('100755','blob',g['blob'])]:
            raise ValueError('Git path identity mismatch')
        if git_batch is None:
            git_batch=subprocess.Popen(['git','-C',str(repo),'cat-file','--batch'],stdin=subprocess.PIPE,stdout=subprocess.PIPE)
        git_batch.stdin.write((g['blob']+'\n').encode('ascii'));git_batch.stdin.flush()
        header=git_batch.stdout.readline().decode('ascii').strip().split()
        if len(header)!=3 or header[0]!=g['blob'] or header[1]!='blob' or int(header[2])!=row['bytes']:
            raise ValueError('Missing Git blob or wrong bounded size')
        left=row['bytes']
        while left:
            b=git_batch.stdout.read(min(CHUNK,left))
            if not b:raise ValueError('Truncated Git blob')
            left-=len(b);yield b
        if git_batch.stdout.read(1)!=b'\n':raise ValueError('Malformed Git batch separator')
    else:raise ValueError('Unknown storage')

dest=None
if args.destination:
    dest=Path(args.destination).absolute()
    no_reparse(dest)
    if dest.exists():raise SystemExit('Destination must not exist; existing files are never overwritten')
    dest.mkdir(parents=True,exist_ok=False)
    no_reparse(dest)
total=0; verified_git={}
for row in index['files']+index['aliases']:
    h=hashlib.sha256(); size=0; out=None
    try:
        if 'git' in row:
            g=row['git'];check_name(g['path'])
            if not re.fullmatch('[0-9a-f]{40}',g['blob']):raise ValueError('Invalid Git blob')
            if g['commit']!=index['baseCommit'] or tree.get(g['path']) not in [('100644','blob',g['blob']),('100755','blob',g['blob'])]:
                raise ValueError('Git alias identity mismatch')
            if args.verify and g['blob'] in verified_git:
                if verified_git[g['blob']]!=(row['bytes'],row['sha256']):raise ValueError('Git alias digest mismatch')
                total+=row['bytes'];continue
        if dest:
            target=dest.joinpath(*safe(row['path']).parts)
            no_reparse(target)
            target.parent.mkdir(parents=True,exist_ok=True)
            no_reparse(target)
            target.resolve().relative_to(dest.resolve())
            out=target.open('xb')
        for b in chunks(row):
            h.update(b);size+=len(b)
            if size>row['bytes']:raise ValueError('Excess file data')
            if out:out.write(b)
        if (size,h.hexdigest())!=(row['bytes'],row['sha256']):raise ValueError('File mismatch: '+row['path'])
        if 'git' in row:verified_git[row['git']['blob']]=(size,h.hexdigest())
        if out:out.flush();os.fsync(out.fileno())
        total+=size
    finally:
        if out:out.close()
print(json.dumps({'verified':True,'logicalFiles':len(names),'logicalBytes':total,
    'parts':len(parts),'restored':bool(dest),'productCodeExecuted':False}))
