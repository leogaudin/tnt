// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { mergeResources } from '@client/language/merge';
import en from '@client/language/locales/en.json';
import fr from '@client/language/locales/fr.json';

describe('mergeResources', () => {
	it('later layers win: base < country locales < labels', () => {
		const out = mergeResources(
			{ en: { a: 'base', b: 'base' } },
			{ en: { b: 'locale', c: 'locale' } },
			{ en: { c: 'label' } },
		);
		expect(out.en).toEqual({ a: 'base', b: 'locale', c: 'label' });
	});

	it('keeps a language that only exists in the country locales', () => {
		expect(mergeResources({ en: { a: '1' } }, { pt: { a: 'um' } }, {}).pt).toEqual({ a: 'um' });
	});

	it('does not mutate its inputs', () => {
		const base = { en: { a: '1' } };
		mergeResources(base, {}, { en: { a: '2' } });
		expect(base).toEqual({ en: { a: '1' } });
	});

	it('base en and fr locales have the same keys', () => {
		expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
	});
});

describe('Liberia labels', () => {
	it('say principal where the base locale says HT, and only there', async () => {
		const { default: liberia } = await import('@client/../countries/liberia/config');
		const out = mergeResources({ en, fr }, {}, liberia.labels);
		expect(out.en.htName).toBe('Principal Name');
		expect(out.en.htPhone).toBe('Principal Phone');
		expect(en.htName).toBe('HT Name');
		expect(out.en.school).toBe('School Name');
	});
});
