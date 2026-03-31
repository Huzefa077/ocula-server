# Ocula Server

It is the backend application for the Ocula full-stack project which is built with Node.js and Express, connects to a PostgreSQL database on Neon, and provides the API used by the frontend.

## Overview

The backend handles:

- user registration
- user sign in
- profile lookup
- image entry count updates
- image proxy support
- backend health checking

It serves as the main API layer between the frontend application and the database.

## Tech Stack

- Node.js
- Express
- PostgreSQL
- Knex
- bcryptjs
- Neon

## Project Structure

```text
ocula-server/
├── controllers/
│   ├── image.js
│   ├── imageProxy.js
│   ├── profile.js
│   ├── register.js
│   └── signin.js
├── .env.example
├── package.json
├── server.js
└── README.md
```

## Environment Variables

Create a `.env` file in the project root.

```env
DATABASE_URL=your_neon_database_connection_string
PORT=3001
```

The server checks for `DATABASE_URL` on startup and stops early if it is missing.

## Installation

```bash
npm install
```

## Running the Project

Start the backend server:

```bash
npm start
```

By default, the local server runs on:

```text
http://localhost:3001
```

## API Routes

### Health Check

```http
GET /
```

### Sign In

```http
POST /signin
```

### Register

```http
POST /register
```

### Profile

```http
GET /profile/:id
```

### Image Entry Update

```http
PUT /image
```

### Image Proxy

```http
GET /image-proxy
```

## Deployment

The backend is intended to be deployed on Render.

Required environment variable:

```env
DATABASE_URL=your_neon_database_connection_string
```

Render typically provides `PORT` automatically in production.

## Notes

- The backend uses PostgreSQL through Knex.
- The local `.env` file should not be committed.
- `.env.example` should be committed to document the required configuration.

## Related Project

The frontend for this application is available in the `ocula-frontend` folder.
