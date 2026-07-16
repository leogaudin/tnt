# Swagger/OpenAPI docs — what changed (commit 57fe61f)

Adds interactive API documentation at `/api-docs` on the deployed server. No behavior of any existing endpoint changed — this is purely additive.

## New files

### `server/swagger.js`
Central config. Defines:
- **Info**: title/version/description of the API.
- **`securitySchemes.apiKeyAuth`**: tells Swagger UI that protected routes expect an `x-authorization` header (the `apiKey` returned from `/register`).
- **`schemas`**: reusable object shapes for `Admin`, `Box`, and `Scan`, taken directly from the Mongoose models in `server/models/`.
- **`apis: ['./controllers/*.js']`**: tells `swagger-jsdoc` to scan every controller file for `@swagger` comment blocks and assemble them into one spec.

This file exports the finished spec object (`swaggerJSDoc(options)`), nothing else uses it except `index.js`.

### `server/controllers/*.ctrl.js`
No route logic changed. Above each `router.get/post/delete(...)` call, added a JSDoc comment block like:

```js
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Log in an admin
 *     tags: [Auth]
 *     requestBody: ...
 *     responses:
 *       200: { description: Logged in, returns the admin }
 *       401: { description: Invalid password }
 */
router.post('/login', async (req, res) => { ... })
```

These comments are inert at runtime (they're just comments) — `swagger-jsdoc` parses them at startup to build the spec. Every existing route across `auth.ctrl.js`, `admins.ctrl.js`, `boxes.ctrl.js`, `scans.ctrl.js`, and `insights.ctrl.js` got one of these, 22 in total. Routes that require the `x-authorization` header (checked via `requireApiKey` in the actual route code) are marked `security: [{ apiKeyAuth: [] }]` so Swagger UI shows a lock icon and prompts for the key.

## Changed files

### `server/index.js`
Two additions:
```js
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
...
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```
Mounted **before** the `/api` routers, so it doesn't interfere with anything under `/api`.

### `server/package.json`
Added two runtime dependencies:
```json
"swagger-jsdoc": "^6.3.0",
"swagger-ui-express": "^5.0.1"
```
Deliberately placed under `dependencies`, not `devDependencies` — Heroku prunes `devDependencies` before running the dyno (this is the same bug that broke `babel-node` earlier), so anything needed at runtime has to be a real dependency.

### `server/package-lock.json`
Regenerated to include the two new packages and their transitive dependencies. Large diff, but it's a mechanical lockfile update, not hand-edited.

## How to use it

1. Deploy this branch.
2. Visit `https://<your-app>.herokuapp.com/api-docs/` (note the trailing slash).
3. Call `POST /register` from the UI to get an `apiKey`.
4. Click the **Authorize** button (top right) and paste the `apiKey` — it's now attached to every protected request you make from the UI.
5. Expand any endpoint → **Try it out** → **Execute** to call it live against your database.

### Getting an API key

`POST /register` creates an admin account and returns an `apiKey` on the new admin record (generated in [`auth.ctrl.js`](controllers/auth.ctrl.js), line ~47). That key is what every protected endpoint expects in the `x-authorization` header.

**Through Swagger UI:**
1. Go to `https://<your-app>.herokuapp.com/api-docs/`
2. Expand `POST /register` → **Try it out**
3. Fill in the request body:
   ```json
   {
     "username": "you@example.com",
     "password": "some-password"
   }
   ```
4. Click **Execute** — the response body's `user` object includes `apiKey`. Copy it.
5. Click **Authorize** (top right of the page), paste the key into the `apiKeyAuth` field, and confirm — every protected call you make from the UI now sends it automatically.

**Or via curl:**
```bash
curl -X POST https://<your-app>.herokuapp.com/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"you@example.com","password":"some-password"}'
```

Note: `password` is hashed client-side (unsalted SHA-512) before it ever reaches the server, but the server itself does no hashing of its own — see [AUTHENTICATION.md](AUTHENTICATION.md) for the full auth flow (registration, session storage, request signing, logout) between the frontend and this API.

## What to double check when reviewing

- Request/response shapes in the `@swagger` blocks were written by reading the controller code, not auto-generated — worth spot-checking a few against the actual route logic (e.g. `boxes.ctrl.js` and `scans.ctrl.js` have the most complex bodies).
- No route paths, methods, or auth requirements were changed — only documentation was added.
