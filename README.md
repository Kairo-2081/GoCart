


1. Install dependencies:
   `npm install`

2. Configure app-issued JWT authentication. Set `JWT_SECRET` in a local `.env` file (or your deployment's environment settings). Generate a unique secret with Node.js:
   `node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"`

   Add the generated value to `.env` as `JWT_SECRET=<generated-value>`. Keep `.env` out of source control and configure the same variable in the production host's secret/environment settings. The server requires at least 32 characters and exits at startup if `JWT_SECRET` is missing or too short; do not use a checked-in, hard-coded, or fallback secret. Tokens are signed with HS256 and expire after one hour.

   API requests are checked by centralized JWT middleware before body parsing or route handlers. Login, account registration, database health, and public catalog reads are guest-accessible; all other API requests require a valid JWT, with role and ownership checks applied by their routes. The frontend and static assets remain accessible so guests can reach the sign-in page.

3. Run the app:
   `npm run dev`
