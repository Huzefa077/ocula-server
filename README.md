# Ocula Server

Backend API for **Ocula**, a full-stack face analysis app where users can register, sign in, submit image URLs, detect faces, and track their scan count.

This backend was built as a learning-focused Node.js project with practical production pieces: authentication, protected routes, PostgreSQL storage, API documentation, rate limiting, and deployment on Render.

## Live Links

- Frontend Demo: [https://ocula-frontend.vercel.app/](https://ocula-frontend.vercel.app/)
- Backend API: [https://ocula-server.onrender.com](https://ocula-server.onrender.com)
- API Docs: [https://ocula-server.onrender.com/docs](https://ocula-server.onrender.com/docs)
- Health Check: [https://ocula-server.onrender.com/](https://ocula-server.onrender.com/)

## What This Backend Handles

- User registration and sign in
- Password hashing with `bcryptjs`
- JWT token creation and verification
- Protected profile and image-count routes
- Basic role-based access control for admin routes
- Admin user listing and deletion
- PostgreSQL database access through Knex
- Image proxy support for frontend image loading
- Rate limiting for auth routes
- Swagger API documentation

## Tech Stack

- Node.js
- Express
- PostgreSQL
- Knex
- JSON Web Tokens
- bcryptjs
- express-rate-limit
- Swagger UI
- Render
- Neon Database

## Project Structure

```text
ocula-server/
|-- controllers/          # Route handlers for auth, profile, image, and admin logic
|-- docs/                 # Swagger/OpenAPI API documentation
|-- middleware/           # JWT auth and role-check middleware
|-- tests/                # Backend API tests
|-- utils/                # Shared auth helpers
|-- app.js                # Express app setup and route wiring
|-- db.js                 # Database connection setup
|-- server.js             # Production/local server entry point
|-- .env.example          # Example environment variables
`-- README.md
```

## Environment Variables

Create a `.env` file locally using this shape:

```env
DATABASE_URL=your_neon_database_connection_string
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_EMAIL=admin@example.com
FRONTEND_URL=http://localhost:3000
PORT=3001
```

Required:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: secret key used to sign and verify JWT tokens

Recommended:

- `ADMIN_EMAIL`: email that receives admin access
- `FRONTEND_URL`: frontend origin allowed by CORS
- `PORT`: local server port, usually `3001`

Real `.env` values should stay local or inside Render/Vercel environment settings. They should not be committed to GitHub.

## Running Locally

Install dependencies:

```bash
npm install
```

Start the backend:

```bash
npm start
```

Start in development mode with `.env` loading and auto-restart:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Default local API:

```text
http://localhost:3001
```

## Main API Routes

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/` | Health check | No |
| `POST` | `/signin` | Sign in and receive JWT token | No |
| `POST` | `/register` | Create a new account | No |
| `GET` | `/profile/:id` | Get a user profile | Yes |
| `PUT` | `/image` | Increment image scan count | Yes |
| `GET` | `/admin/users` | List users for admin | Admin |
| `DELETE` | `/admin/users/:id` | Delete a user for admin | Admin |
| `GET` | `/image-proxy` | Proxy image requests | No |
| `GET` | `/docs` | Swagger API docs | No |

Protected routes expect:

```http
Authorization: Bearer <token>
```

## Deployment Notes

This backend is deployed on Render.

Render setup:

- Root Directory: `ocula-server`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variables: add the values from the environment section

The React frontend is deployed separately on Vercel and calls this backend through `REACT_APP_API_URL`.

Vercel frontend variable:

```env
REACT_APP_API_URL=https://ocula-server.onrender.com
```

Render backend variable for CORS:

```env
FRONTEND_URL=https://ocula-frontend.vercel.app
```

## What I Learned

This project helped me practice:

- Separating frontend and backend responsibilities
- Using JWT without exposing the server secret to the frontend
- Protecting routes with middleware
- Keeping password hashes separate from public user profile data
- Writing beginner-friendly API tests
- Deploying a full-stack app with separate frontend and backend services

## Related Project

Frontend repository/folder: `ocula-frontend`

Live frontend: [https://ocula-frontend.vercel.app/](https://ocula-frontend.vercel.app/)
