<!-- This file explains what the backend project does and how to run and deploy it. -->
# Ocula Server

Ocula Server is the backend API for the Ocula full-stack project. It is built with Node.js and Express, uses PostgreSQL on Neon, and handles authentication, profile access, image entry updates, and image proxy requests for the frontend application.

## Live API

- Production API: [https://ocula-server.onrender.com](https://ocula-server.onrender.com)
- Health Check: [https://ocula-server.onrender.com/](https://ocula-server.onrender.com/)

## Overview

This service is responsible for:

- user registration
- user sign in with JWT token generation
- protected profile retrieval by user ID
- protected image entry updates
- proxying image requests when needed
- exposing a health-check endpoint for frontend availability checks
- limiting repeated sign-in and registration attempts
- exposing Swagger API documentation

## Tech Stack

- JavaScript (ES6+)
- Node.js
- Express
- PostgreSQL
- Knex
- bcryptjs
- CORS
- JSON Web Tokens (JWT)
- express-rate-limit
- Swagger UI
- Neon

## Runtime Versions

- Node.js: 20.x
- npm: 10.x
- Package Manager: npm

## Project Structure

```text
ocula-server/
|-- controllers/
|   |-- image.js
|   |-- imageProxy.js
|   |-- profile.js
|   |-- register.js
|   `-- signin.js
|-- .env.example
|-- package.json
|-- server.js
`-- README.md
```

## Environment Variables

Create a `.env` file in the project root for local development:

```env
DATABASE_URL=your_neon_database_connection_string
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_EMAIL=admin@example.com
FRONTEND_URL=http://localhost:3000
PORT=3001
```

Example:

```env
DATABASE_URL=postgresql://username:password@your-neon-host/database_name?sslmode=require
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_EMAIL=admin@example.com
FRONTEND_URL=http://localhost:3000
PORT=3001
```

Required variables:

- `DATABASE_URL` for PostgreSQL access
- `JWT_SECRET` for signing and verifying login tokens

Helpful optional variables:

- `ADMIN_EMAIL` gives one email admin access for the RBAC example route
- `FRONTEND_URL` locks CORS to your frontend origin in production

## Database

The backend uses PostgreSQL hosted on Neon.

- Provider: [Neon](https://neon.com/)
- Connection variable: `DATABASE_URL`
- Query builder: `Knex`

The real database connection string should remain in local `.env` files and deployment environment settings, not in the repository.

## Installation

```bash
npm install
```

## Running Locally

Start the server:

```bash
npm start
```

Start the server in local development with automatic restart and `.env` loading:

```bash
npm run dev
```

Run backend tests:

```bash
npm test
```

Default local address:

```text
http://localhost:3001
```

## API Routes

### Health Check

```http
GET /
```

Returns a simple response to confirm that the backend is running.

### Sign In

```http
POST /signin
```

Expected body:

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

Returns:

- signed-in user profile
- JWT token for protected routes

### Register

```http
POST /register
```

Expected body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "yourpassword"
}
```

### Profile

```http
GET /profile/:id
```

Requires:

- `Authorization: Bearer <token>`

### Image Entry Update

```http
PUT /image
```

Expected body:

```json
{
  "id": "123"
}
```

Requires:

- `Authorization: Bearer <token>`

### Admin Users

```http
GET /admin/users
```

Requires:

- `Authorization: Bearer <token>`
- token role must be `admin`

### Delete User

```http
DELETE /admin/users/:id
```

Requires:

- `Authorization: Bearer <token>`
- token role must be `admin`

Behavior:

- deletes the user's profile row
- deletes the user's auth row
- blocks the admin from deleting the currently signed-in account

### Image Proxy

```http
GET /image-proxy
```

### Swagger Docs

```http
GET /docs
GET /docs.json
```

## Deployment

The backend is deployed on Render.

Deployment notes:

- set the root directory to `ocula-server` if deploying from a monorepo
- use `npm start` as the start command
- add the environment variables from the `Environment Variables` section
- Render usually provides `PORT` automatically in production

## Notes

- The backend uses a simple health route at `/` for uptime checks.
- Database access is configured centrally in `server.js`.
- JWT protects the profile and image routes.
- Registration already uses a transaction so auth and profile rows succeed or fail together.
- The admin route is intentionally small and is only there to demonstrate beginner-friendly RBAC.
- Local `.env` files should not be committed.
- `.env.example` should be committed to document the required setup.

## Related Project

The frontend application for this project is available in the `ocula-frontend` project.
