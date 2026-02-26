import { describe, it, expect } from 'vitest';
import {
	handle400Error, handle401Error, handle404Error, handle409Error,
	handle200Success, handle201Success, handle206Success,
} from '@server/service/errorHandlers.js';

function mockRes() {
	const res: any = { headersSent: false, _status: 0, _body: null };
	res.status = (code: number) => { res._status = code; return res; };
	res.json = (body: any) => { res._body = body; return res; };
	return res;
}

describe('error handlers', () => {
	it('handle400Error sets 400', () => {
		const res = mockRes();
		handle400Error(res, 'bad');
		expect(res._status).toBe(400);
		expect(res._body).toEqual({ success: false, error: 'bad' });
	});

	it('handle401Error sets 401', () => {
		const res = mockRes();
		handle401Error(res, 'unauth');
		expect(res._status).toBe(401);
	});

	it('handle404Error sets 404', () => {
		const res = mockRes();
		handle404Error(res);
		expect(res._status).toBe(404);
	});

	it('handle409Error sets 409', () => {
		const res = mockRes();
		handle409Error(res, 'conflict');
		expect(res._status).toBe(409);
	});

	it('handle200Success sets 200 with data', () => {
		const res = mockRes();
		handle200Success(res, { items: [] });
		expect(res._status).toBe(200);
		expect(res._body.data).toEqual({ items: [] });
	});

	it('handle201Success sets 201 with message and data', () => {
		const res = mockRes();
		handle201Success(res, 'created', { id: '1' });
		expect(res._status).toBe(201);
		expect(res._body.message).toBe('created');
		expect(res._body.id).toBe('1');
	});

	it('handle206Success sets 206', () => {
		const res = mockRes();
		handle206Success(res, 'partial', { count: 5 });
		expect(res._status).toBe(206);
	});

	it('does nothing when headersSent is true', () => {
		const res = mockRes();
		res.headersSent = true;
		const result = handle400Error(res, 'bad');
		expect(result).toBeUndefined();
		expect(res._status).toBe(0);
	});
});