# Authentication — how the frontend talks to the API

> This is a living document. If the auth flow changes (new hashing, tokens, sessions, expiry, etc.), update this file in the same PR as the code change.

## Summary

There are no JWTs, cookies, or server-side sessions. Authentication is a single long-lived **API key**, generated once at registration, stored in the browser's `localStorage`, and sent as a custom `x-authorization` header on every request that needs it.

## 1. Registration / login (client)

File: [`client/src/pages/Login/index.jsx`](../client/src/pages/Login/index.jsx)

1. User types a username (email). On blur/Enter, the client does an existence check by calling `POST /login` with a throwaway password (`'42'`) — it only cares whether the response is `404` (no such user → show "create account") or anything else (user exists → show "log in").
2. On submit, the password is hashed client-side with `sha512` (`js-sha512` package) **before** it's sent:
   ```js
   const user = { username, password: sha512(password) };
   callAPI('POST', userExists ? 'login' : 'register', user)
   ```
3. The server ([`server/controllers/auth.ctrl.js`](controllers/auth.ctrl.js)) has no concept of hashing — it just stores/compares whatever string arrives:
   - `POST /register` ([auth.ctrl.js:29](controllers/auth.ctrl.js#L29)) creates the admin, generates a random `apiKey` (`generateApiKey()` → `generateId()`), and returns the full admin object including `apiKey`.
   - `POST /login` ([auth.ctrl.js:9](controllers/auth.ctrl.js#L9)) does `if (password !== user.password)` — a direct string comparison against the stored hash.
   - Net effect: passwords are stored as an **unsalted SHA-512 hash**, not true plaintext, but there's no salt and no server-side hashing — precomputed hash lookups (rainbow tables) are still a risk.

## 2. Storing the session (client)

Files: [`client/src/service/index.js:21`](../client/src/service/index.js#L21), [`client/src/pages/Login/index.jsx:61`](../client/src/pages/Login/index.jsx#L61)

- On successful login/register, the response's `user` object (which includes `apiKey`) is saved wholesale:
  ```js
  localStorage.setItem('user', JSON.stringify(res['user']));
  window.location.reload();
  ```
- `user` is exported from `service/index.js` as:
  ```js
  export const user = JSON.parse(localStorage.getItem('user'));
  ```
  This only runs **once, at module load time** — it is not reactive. That's why login/register force a full page reload instead of just updating state.

## 3. Attaching the key to requests (client)

File: [`client/src/service/index.js:36-53`](../client/src/service/index.js#L36-L53)

Every API call goes through `callAPI(method, endpoint, data, headers)`:
```js
export const callAPI = async (method, endpoint, data = null, headers = {}, signal = null) => {
	const authorization = user?.apiKey || '';
	const requestHeaders = {
		'Content-Type': 'application/json',
		'Accept-Encoding': 'gzip, deflate',
		'X-Authorization': authorization,
		...headers,
	};
	...
}
```
This is why "protected" endpoints in Swagger are documented with `security: [{ apiKeyAuth: [] }]` against the `x-authorization` header — it's the exact header the real client sends.

## 4. Server-side check

File: [`server/service/apiKey.js`](service/apiKey.js)

```js
export const requireApiKey = async (req, res, next) => {
	if (!req.headers['x-authorization'])
		return handle401Error(res, 'API key required');

	const admin = await Admin.findOne({ apiKey: req.headers['x-authorization'] });

	if (!admin)
		return handle401Error(res, 'Invalid API key');

	return next(admin);
};
```
Any route that calls `requireApiKey(req, res, async (admin) => { ... })` is scoped to that admin's own data — most queries filter by `adminId: admin.id` inside the callback.

Two routes deliberately bypass this for public sharing:
- `GET /boxes/:adminId` and `GET /projects/:id` skip the API key check if the target admin has `publicInsights: true` on their account (toggled via `POST /toggle_insights`).

## 5. Refresh / rehydrate on app load

File: [`client/src/context/index.jsx:19-24`](../client/src/context/index.jsx#L19-L24)

```js
const initTnT = async (setters) => {
	const res = await callAPI('GET', 'me').then(res => res.json())
	const me = res.data;
	localStorage.setItem('user', JSON.stringify(me));
	Object.assign(user, me);
	...
}
```
On every app load, if a `user.id` already exists in storage, `GET /me` (authenticated via the stored `apiKey`) re-fetches the admin record and syncs it back into both `localStorage` and the in-memory `user` object.

## 6. Logout

File: [`client/src/components/Navbar.jsx:90`](../client/src/components/Navbar.jsx#L90)

```js
localStorage.removeItem('user');
```
That's it — there's no server-side session or token to invalidate, since the `apiKey` itself is the only credential and it's never rotated, expired, or blacklisted server-side. "Logging out" just makes the browser forget the key; the key itself remains valid until the admin document is deleted or the key is manually changed.

## Known limitations (as of this writing)

- No password salting/hashing on the server — security relies entirely on the client always hashing with the same unsalted SHA-512 scheme.
- `apiKey` never expires and can't be rotated from the UI — if leaked, it's valid forever until an admin manually edits the database.
- No refresh/short-lived tokens — the same long-lived key is used for every request indefinitely.
- No rate limiting or lockout on `/login` attempts.

Getting your own API key for manual testing (e.g. via Swagger) is documented in [SWAGGER_CHANGES.md](SWAGGER_CHANGES.md#getting-an-api-key).
