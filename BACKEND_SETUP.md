# ForgeAI Backend Setup

ForgeAI now runs on the existing full-stack Express WebDev server. The frontend no longer seeds demo projects or simulates agent responses. It calls the REST API under `/api`, and authenticated data is scoped to the signed-in user.

## Backend modules

| Area | Implementation |
|---|---|
| Server | Express mounted from `server/_core/index.ts` |
| Persistence | MongoDB / MongoDB Atlas through the official `mongodb` driver |
| Authentication | Email/password registration and login with `bcryptjs` password hashing and an HTTP-only signed session cookie |
| Agent providers | Provider interface with a Groq implementation; additional providers can be added without changing route contracts |
| Chat persistence | User and assistant messages are saved to MongoDB in user-owned chat documents |
| Projects | User-owned project documents with metadata, files, repository, and deployment fields |
| Secrets | AES-256-GCM encrypted values; normal list responses contain only masked placeholders |
| Abuse controls | Zod request validation, ownership filters on every private query, production CORS restrictions, and rate limiting on agent requests |

## REST endpoints

The backend exposes:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET|POST /api/projects`
- `GET|PATCH|DELETE /api/projects/:id`
- `GET|POST /api/chats`
- `GET /api/chats/:id`
- `GET|POST /api/secrets`
- `PATCH|DELETE /api/secrets/:id`
- `POST /api/agent/chat`

Every private route requires the ForgeAI session cookie and includes the authenticated user's MongoDB identifier in its query filter. Secret values are never returned by the normal secrets API, included in chat context, or logged.

## Required server configuration

Set these values through the WebDev project secret manager. Do not commit them to source control or paste them into the chat:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB or MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Optional database name; defaults to `forgeai` |
| `GROQ_API_KEY` | Server-only Groq API key |
| `GROQ_MODEL` | Optional Groq model; defaults to `llama-3.3-70b-versatile` |
| `SECRET_ENCRYPTION_KEY` | High-entropy key used for AES-256-GCM secret encryption |
| `CLIENT_ORIGIN` | Production browser origin allowed for credentialed requests |
| `JWT_SECRET` | The managed project session signing secret already supplied by the full-stack scaffold |

Until `MONGODB_URI`, `GROQ_API_KEY`, and `SECRET_ENCRYPTION_KEY` are supplied, the UI intentionally shows an empty, unsigned workspace rather than inventing projects, chats, repositories, or agent responses.
