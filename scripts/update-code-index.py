"""Regenerate the navigation index without reading private environment or database values."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
files = sorted(p for folder in ['src', 'server/src', 'server/test', 'scripts'] for p in (root / folder).rglob('*') if p.is_file())
lines = ['# CEPT code index', '', 'Generated from active source. Recheck line numbers after edits. See ../PROJECT_MAP.md.', '', '## API registrations', '', '| File | Line | Endpoint |', '| --- | --- | --- |']
for p in files:
    if p.suffix != '.js' or not str(p.relative_to(root)).replace('\\', '/').startswith('server/src/'): continue
    for number, line in enumerate(p.read_text(encoding='utf-8-sig').splitlines(), 1):
        match = re.search(r"(?:registerAction\(router,|router\.(?:post|get)\(|app\.(?:post|get)\()\s*['\"]([^'\"]+)", line)
        if match:
            endpoint = match[1]
            if not endpoint.startswith('/'): endpoint = '/api/' + endpoint
            elif not endpoint.startswith('/api') and endpoint != '*' and 'app.get' not in line: endpoint = '/api' + endpoint
            lines.append(f'| `{p.relative_to(root).as_posix()}` | {number} | `{endpoint}` |')
lines += ['', '## Function entry points', '', '| File | Line | Function |', '| --- | --- | --- |']
for p in files:
    if p.suffix not in {'.js', '.jsx', '.mjs'}: continue
    for number, line in enumerate(p.read_text(encoding='utf-8-sig').splitlines(), 1):
        match = re.search(r'(?:function\s+(\w+)\s*\(|const\s+(handle\w+|fetch\w+|run\w+|exportNumbers)\s*=)', line)
        if match: lines.append(f'| `{p.relative_to(root).as_posix()}` | {number} | `{match[1] or match[2]}` |')
lines += ['', '## Active source inventory', '', '| File | Bytes |', '| --- | --- |']
for p in files: lines.append(f'| `{p.relative_to(root).as_posix()}` | {p.stat().st_size} |')
(root / 'docs/CODE_INDEX.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
