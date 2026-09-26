"""Reproducible page-indexed extracts. Run with the pypdf version recorded in each asset; --check detects stale assets."""
import hashlib
import json
import re
import sys
from pathlib import Path
from pypdf import PdfReader
import pypdf

ROOT = Path(__file__).resolve().parents[1]
FILES = ['DOE_O_483.1B_Chg3_CRADA.pdf', 'DOE_O_483.1C_CRADA.pdf']
for name in FILES:
    source = ROOT / 'public/sources' / name
    pages = []
    raw_pages = [page.extract_text() or '' for page in PdfReader(source).pages]
    # Restrict removal to repeated order/date running headers at page edges.
    def header_key(line):
        line = line.strip()
        if re.fullmatch(r'(?:\d+\s+)?DOE O 483\.1[BC](?:\s+\d+)?', line):
            return re.sub(r'^\d+\s+|\s+\d+$', '', line)
        if re.fullmatch(r'\d{2}-\d{2}-\d{4}', line):
            return line
        return None
    occurrences = {}
    for raw in raw_pages:
        lines = raw.splitlines()
        keys = {header_key(line) for i,line in enumerate(lines) if i < 4 or i >= len(lines)-4}
        for key in keys - {None}:
            occurrences[key] = occurrences.get(key, 0) + 1
    for index, raw in enumerate(raw_pages):
        lines = raw.splitlines()
        kept, removed = [], []
        for i,line in enumerate(lines):
            key = header_key(line)
            if index > 0 and (i < 4 or i >= len(lines)-4) and key and occurrences.get(key,0) >= 3:
                removed.append(line)
            else:
                kept.append(line)
        pages.append({'page':index+1,'text':'\n'.join(kept),'omittedLines':removed})
    asset = {'schemaVersion':1,'extractionVersion':'pypdf-page-text-v1','extractor':f'pypdf {pypdf.__version__}',
             'sourceFile':name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
             'pages':pages}
    target = ROOT / 'public/sources/comparison' / (source.stem + '.json')
    data = json.dumps(asset, ensure_ascii=False, indent=2) + '\n'
    if '--check' in sys.argv:
        if not target.exists() or target.read_text() != data:
            raise SystemExit(f'Stale comparison asset: {target.name}')
    else:
        target.write_text(data)
    print(f'{name}: {len(pages)} pages, {sum(len(p["omittedLines"]) for p in pages)} running-header lines omitted')
