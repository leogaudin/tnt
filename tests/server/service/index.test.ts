import { describe, it, expect } from 'vitest';
import { sha512, generateId, isFinalDestination, getQuery } from '@server/service/index.js';

describe('generateId', () => {
	it('returns a non-empty string', () => {
		const id = generateId();
		expect(id).toBeTruthy();
		expect(typeof id).toBe('string');
	});

	it('returns only alphanumeric characters', () => {
		const id = generateId();
		expect(id).toMatch(/^[a-zA-Z0-9]+$/);
	});

	it('returns different values on successive calls', () => {
		const ids = new Set(Array.from({ length: 50 }, () => generateId()));
		expect(ids.size).toBe(50);
	});
});

describe('sha512', () => {
	it('returns a 128-character hex string', async () => {
		const hash = await sha512('hello');
		expect(hash).toMatch(/^[a-f0-9]{128}$/);
	});

	it('is deterministic', async () => {
		const a = await sha512('test');
		const b = await sha512('test');
		expect(a).toBe(b);
	});

	it('produces different hashes for different inputs', async () => {
		const a = await sha512('foo');
		const b = await sha512('bar');
		expect(a).not.toBe(b);
	});

	it('matches known SHA-512 digest for empty string', async () => {
		const hash = await sha512('');
		expect(hash).toBe(
			'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce' +
			'47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e'
		);
	});
});

describe('isFinalDestination', () => {
	const school = { latitude: 48.8566, longitude: 2.3522 };

	it('returns true when box is at the exact same location', () => {
		expect(isFinalDestination(school, { latitude: 48.8566, longitude: 2.3522 })).toBe(true);
	});

	it('returns true when box is within 5km tolerance', () => {
		expect(isFinalDestination(school, { latitude: 48.8656, longitude: 2.3522 })).toBe(true);
	});

	it('returns false when box is far away', () => {
		expect(isFinalDestination(school, { latitude: 51.5074, longitude: -0.1278 })).toBe(false);
	});

	it('accounts for GPS accuracy in threshold', () => {
		expect(isFinalDestination(school, { latitude: 48.9066, longitude: 2.3522, accuracy: 1000 })).toBe(true);
	});

	it('handles zero accuracy', () => {
		expect(isFinalDestination(school, { latitude: 48.8566, longitude: 2.3522, accuracy: 0 })).toBe(true);
	});

	it('handles missing accuracy', () => {
		expect(isFinalDestination(school, { latitude: 48.8566, longitude: 2.3522 })).toBe(true);
	});
});

describe('getQuery', () => {
	function mockReq(query: Record<string, string> = {}, body: Record<string, any> = {}): any {
		return { query: { ...query }, body: { ...body } };
	}

	it('parses skip and limit from query', () => {
		const req = mockReq({ skip: '10', limit: '50' });
		const { skip, limit } = getQuery(req) as any;
		expect(skip).toBe(10);
		expect(limit).toBe(50);
	});

	it('removes skip and limit from req.query', () => {
		const req = mockReq({ skip: '10', limit: '50', other: 'value' });
		getQuery(req);
		expect(req.query.skip).toBeUndefined();
		expect(req.query.limit).toBeUndefined();
		expect(req.query.other).toBe('value');
	});

	it('returns NaN for skip/limit when not provided', () => {
		const { skip, limit } = getQuery(mockReq()) as any;
		expect(Number.isNaN(skip)).toBe(true);
		expect(Number.isNaN(limit)).toBe(true);
	});

	it('returns empty filters when body has no filters', () => {
		const { filters } = getQuery(mockReq()) as any;
		expect(filters).toEqual({});
	});

	it('passes through simple filters from body', () => {
		const { filters } = getQuery(mockReq({}, { filters: { project: 'Alpha' } })) as any;
		expect(filters.project).toBe('Alpha');
	});

	it('constructs $or regex for custom filter string', () => {
		const { filters } = getQuery(mockReq({}, { filters: { custom: 'search term' } })) as any;
		expect(filters.$or).toBeDefined();
		expect(Array.isArray(filters.$or)).toBe(true);
		expect(filters.$or.length).toBeGreaterThan(0);
		expect(filters.custom).toBeUndefined();
	});
});