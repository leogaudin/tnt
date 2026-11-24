import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

/** Same selection rule as every package: TNT_COUNTRY, else <package>/countries/default.json. */
export function selectedCountry(pkg: 'client' | 'server' | 'mobile', env = process.env): string {
	if (env.TNT_COUNTRY) return env.TNT_COUNTRY;
	return JSON.parse(fs.readFileSync(path.join(root, pkg, 'countries/default.json'), 'utf8')).country;
}

export function countryDir(pkg: 'client' | 'server' | 'mobile', country = selectedCountry(pkg)): string {
	return path.join(root, pkg, 'countries', country);
}
