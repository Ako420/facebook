# Facebook Clone Backend

This is the backend service for a Facebook-style social platform. It provides REST APIs for authentication, user social features, posts and reels, comments, stories, messaging, notifications, uploads, and realtime updates.

## Overview

The backend is built with Node.js and Express, uses MongoDB via Mongoose for persistence, and supports realtime communication through WebSockets. It also exposes interactive API documentation via Swagger/OpenAPI.

### Core capabilities

- User registration and login with JWT authentication
- Post and reel creation, reaction handling, and comments
- Friend requests and social graph management
- Group creation and membership flows
- Direct and group conversations with message events
- Story publishing and expiry
- Notification delivery for social actions
- Image and video upload integration with Cloudinary
- WebSocket-based realtime updates and presence

## Tech stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT for authentication
- Redis (optional for multi-instance realtime/event bus)
- Cloudinary for media uploads
- Swagger / OpenAPI
- Helmet, CORS, express-rate-limit
- WebSocket server for realtime events

## Project structure

```text
backend/
├── app.js                  # App entry point and server startup
├── package.json            # Scripts and dependencies
├── .env.example           # Environment variable template
├── config/                # Environment configuration and DB setup
│   ├── cloudinary.js
│   ├── db.js
│   └── origins.js
├── controllers/           # Route handlers
├── docs/                  # OpenAPI definitions and generated Swagger docs
├── lib/                   # Realtime and event bus helpers
├── middleware/            # Auth, upload, rate limiting, error handling
├── model/                 # MongoDB schemas/models
├── router/                # API route definitions
├── scripts/               # Index sync and maintenance scripts
├── service/               # Business logic and realtime handlers
├── utils/                 # Shared helpers (token, validation, errors, transactions)
└── README.md              # Backend documentation
```

## Prerequisites

Before running the backend, ensure you have:

- Node.js 18 or newer
- MongoDB running locally or in a managed service
- Optional: Redis 7+ if you want shared realtime/event bus behavior across multiple backend instances
- A Cloudinary account for media uploads

## Environment variables

Copy the example file and configure your own values:

```bash
cp .env.example .env
```

Example contents:

```env
PORT=3000
MONGODB_URL=mongodb://localhost:27017/facebook-clone
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
CLIENT_URL=http://localhost:5173,http://localhost:5174
REDIS_URL=
```

### Variable reference

| Variable | Required | Description |
|---|---:|---|
| `PORT` | No | Server port. Defaults to `5000` if not set. |
| `MONGODB_URL` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret used to sign JWTs. |
| `JWT_EXPIRES_IN` | No | JWT lifetime; defaults to `7d`. |
| `BCRYPT_SALT_ROUNDS` | No | Password hashing cost; defaults to `12`. |
| `CLIENT_URL` | No | Allowed frontend origins for CORS. |
| `REDIS_URL` | No | Enables Redis-based bus/realtime features when provided. |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API secret. |
| `CLOUDINARY_FOLDER` | Optional | Upload destination folder. |

## Installation

```bash
npm install
```

## Running the app

### Development mode

```bash
npm run dev
```

This uses `nodemon` so the server restarts automatically when files change.

### Production mode

```bash
npm start
```

## Scripts

```bash
npm run dev         # Start the server with auto-reload
npm run start       # Start the server in production mode
npm run indexes     # Sync Mongo indexes
npm run seed        # Run seed script if available
npm run backfill:groups
npm run sweep:uploads
npm run sweep:stories
```

## Health and API docs

### Health check

```bash
curl http://localhost:3000/health
```

The endpoint returns basic server health info and DB connection status.

### Swagger docs

Once the server is running, open:

```text
http://localhost:3000/api-docs
```

The raw OpenAPI JSON is also available at:

```text
http://localhost:3000/api-docs.json
```

## API layout

The app exposes routes under `/api`:

- `/api/auth` — register, login, token management
- `/api/posts` — posts and reels
- `/api/comment` — comments on posts/reels
- `/api/friend` — friend requests and friend relationships
- `/api/groups` — group management and membership
- `/api/conversations` — messages and chat conversations
- `/api/stories` — stories and story views
- `/api/notifications` — notifications
- `/api/upload` — media uploads

## Realtime features

The backend includes a WebSocket server for live updates such as:

- chat message events
- typing indicators
- conversation updates
- notification events
- presence changes
- post and comment subscription events

WebSocket access is handled through the realtime layer in `lib/` and `service/`.

## Authentication

Routes use JWT-based authentication via a bearer token. Auth middleware validates incoming tokens and attaches the authenticated user to the request context.

### Typical flow

1. Register or log in via `/api/auth/register` or `/api/auth/login`
2. Copy the returned token
3. Include it in the `Authorization` header as:

```http
Authorization: Bearer <token>
```

## Security notes

The backend includes common hardening measures:

- CORS configuration via `config/origins.js`
- Helmet security headers
- Rate limiting middleware
- Error handler middleware
- JWT-based auth for protected routes

## Typical workflow

```bash
npm install
cp .env.example .env
# Fill in your MongoDB and JWT values
npm run dev
```

Then visit the Swagger UI or make authenticated requests from your frontend.

## Notes

- The server is designed for local development and social app experimentation.
- Realtime behavior can be run in-memory or through Redis when `REDIS_URL` is configured.
- Cloudinary must be configured for upload features to work properly.

## Troubleshooting

### Database connection issues

If MongoDB is unavailable, check:

- your `MONGODB_URL`
- whether MongoDB is running
- the firewall or network access rules

### JWT errors

If auth fails, verify:

- `JWT_SECRET` is set in `.env`
- the token is included in the `Authorization` header
- the token has not expired

### Upload errors

If uploads fail:

- confirm Cloudinary environment variables are set
- check that the configured folder and permissions are valid

## License

This project is intended for learning and demonstration purposes. Check the repository root for the project-wide license if one is defined there.
