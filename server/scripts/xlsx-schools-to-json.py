#!/usr/bin/env python3
"""
Converts a GRID3-format Nigeria schools .xlsx export into the JSON shape
expected by import-boxes.js.

Expects a worksheet with columns including: wardname, lganame, statename, name, x, y
(x = longitude, y = latitude). Reads the sheet with the most rows in the
workbook, since GRID3 exports typically also include a small pivot "Summary" sheet.

Usage:
    python3 scripts/xlsx-schools-to-json.py <input.xlsx> <output.json>

No third-party dependencies — .xlsx is parsed directly as a zip of XML via
the standard library, since this project has had intermittent network
issues installing packages locally.
"""
import sys
import zipfile
import xml.etree.ElementTree as ET
import re
import json

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def col_to_idx(cellref):
	letters = re.match(r'([A-Z]+)', cellref).group(1)
	idx = 0
	for c in letters:
		idx = idx * 26 + (ord(c) - ord('A') + 1)
	return idx - 1


def load_shared_strings(z):
	if 'xl/sharedStrings.xml' not in z.namelist():
		return []
	sst = ET.fromstring(z.read('xl/sharedStrings.xml'))
	strings = []
	for si in sst.findall('m:si', NS):
		texts = si.findall('.//m:t', NS)
		strings.append(''.join(t.text or '' for t in texts))
	return strings


def parse_row(row, strings):
	cells = {}
	for c in row.findall('m:c', NS):
		ref = c.attrib['r']
		idx = col_to_idx(ref)
		t = c.attrib.get('t')
		v = c.find('m:v', NS)
		val = v.text if v is not None else None
		if t == 's' and val is not None:
			val = strings[int(val)]
		cells[idx] = val
	maxidx = max(cells.keys()) if cells else -1
	return [cells.get(i, '') for i in range(maxidx + 1)]


def main():
	if len(sys.argv) != 3:
		print(__doc__)
		sys.exit(1)

	in_path, out_path = sys.argv[1], sys.argv[2]
	z = zipfile.ZipFile(in_path)
	strings = load_shared_strings(z)

	sheet_files = [n for n in z.namelist() if re.match(r'xl/worksheets/sheet\d+\.xml$', n)]
	best_rows, best_name = [], None
	for name in sheet_files:
		sheet = ET.fromstring(z.read(name))
		rows = sheet.findall('.//m:sheetData/m:row', NS)
		if len(rows) > len(best_rows):
			best_rows, best_name = rows, name

	print(f'Using {best_name} ({len(best_rows) - 1} data rows)')

	header = parse_row(best_rows[0], strings)
	idx = {name: i for i, name in enumerate(header)}

	required_cols = ['name', 'lganame', 'statename', 'x', 'y']
	missing = [c for c in required_cols if c not in idx]
	if missing:
		print(f'ERROR: expected columns not found in header: {missing}')
		print(f'Header found: {header}')
		sys.exit(1)

	valid, skipped = [], 0
	for row in best_rows[1:]:
		vals = parse_row(row, strings)

		def get(col):
			i = idx.get(col)
			return vals[i] if i is not None and i < len(vals) else ''

		school = (get('name') or '').strip()
		district = (get('lganame') or '').strip()
		division = (get('statename') or '').strip()
		zone = (get('wardname') or '').strip()

		try:
			lat = float(get('y'))
			lon = float(get('x'))
			valid_coords = -90 <= lat <= 90 and -180 <= lon <= 180 and lat != 0 and lon != 0
		except (ValueError, TypeError):
			valid_coords = False

		if not school or not district or not division or not valid_coords:
			skipped += 1
			continue

		valid.append({
			'division': division,
			'district': district,
			'zone': zone,
			'school': school,
			'schoolLatitude': lat,
			'schoolLongitude': lon,
		})

	with open(out_path, 'w') as f:
		json.dump(valid, f)

	print(f'Wrote {len(valid)} valid rows to {out_path} ({skipped} skipped for missing/invalid fields)')


if __name__ == '__main__':
	main()
