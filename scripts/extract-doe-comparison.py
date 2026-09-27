"""Reproducible page-indexed extracts. Run with the pypdf version recorded in each asset; --check detects stale assets.

Default: the 483.1B/483.1C demo pair. --library: every DOE library order that has an older and newer
version of the same number (e.g. 413.3B/413.3C), written to public/sources/comparison/doe/.
"""
import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from pypdf import PdfReader
import pypdf

ROOT = Path(__file__).resolve().parents[1]
FILES = ['DOE_O_483.1B_Chg3_CRADA.pdf', 'DOE_O_483.1C_CRADA.pdf']
CORE_OIDS = {'DOE O 483.1B', 'DOE O 483.1C'}


def order_family(oid):
    """'DOE O 413.3C' -> ('DOE O 413.3', 'C'); '10 CFR 830' -> None."""
    m = re.fullmatch(r'(DOE [OMGP] \d+\.\d+(?:-\d+)?)([A-Z]?)', oid.strip())
    return (m.group(1), m.group(2)) if m else None


def extract(source, target, header_re):
    raw_pages = [page.extract_text() or '' for page in PdfReader(source).pages]

    # Restrict removal to repeated order/date running headers at page edges.
    def header_key(line):
        line = line.strip()
        if re.fullmatch(rf'(?:\d+\s+)?{header_re}(?:\s+\d+)?', line):
            return re.sub(r'^\d+\s+|\s+\d+$', '', line)
        if re.fullmatch(r'\d{2}-\d{2}-\d{4}', line):
            return line
        return None

    occurrences = {}
    for raw in raw_pages:
        lines = raw.splitlines()
        keys = {header_key(line) for i, line in enumerate(lines) if i < 4 or i >= len(lines) - 4}
        for key in keys - {None}:
            occurrences[key] = occurrences.get(key, 0) + 1
    pages = []
    for index, raw in enumerate(raw_pages):
        lines = raw.splitlines()
        kept, removed = [], []
        for i, line in enumerate(lines):
            key = header_key(line)
            if index > 0 and (i < 4 or i >= len(lines) - 4) and key and occurrences.get(key, 0) >= 3:
                removed.append(line)
            else:
                kept.append(line)
        pages.append({'page': index + 1, 'text': '\n'.join(kept), 'omittedLines': removed})
    asset = {'schemaVersion': 1, 'extractionVersion': 'pypdf-page-text-v1', 'extractor': f'pypdf {pypdf.__version__}',
             'sourceFile': source.name, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
             'pages': pages}
    data = json.dumps(asset, ensure_ascii=False, indent=2) + '\n'
    if '--check' in sys.argv:
        if not target.exists() or target.read_text() != data:
            raise SystemExit(f'Stale comparison asset: {target.name}')
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(data)
    print(f'{source.name}: {len(pages)} pages, {sum(len(p["omittedLines"]) for p in pages)} running-header lines omitted')


def library_versioned_docs():
    docs = json.loads((ROOT / 'lib/generated/doe-library.json').read_text())['docs']
    families = defaultdict(list)
    for doc in docs:
        fam = order_family(doc['oid'])
        if fam and doc['oid'] not in CORE_OIDS:
            families[fam[0]].append(doc)
    return [d for members in families.values() if len(members) > 1 for d in members]


if '--library' in sys.argv:
    for doc in library_versioned_docs():
        source = ROOT / 'public/sources' / doc['pdf']
        fam, _ = order_family(doc['oid'])
        header_re = re.escape(fam) + r'[A-Z]?(?:\s+Chg\s*\d+)?'
        extract(source, ROOT / 'public/sources/comparison/doe' / (source.stem + '.json'), header_re)
else:
    for name in FILES:
        source = ROOT / 'public/sources' / name
        extract(source, ROOT / 'public/sources/comparison' / (source.stem + '.json'), r'DOE O 483\.1[BC]')
