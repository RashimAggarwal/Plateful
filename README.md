# Plateful — online food ordering and restaurant management

A full-stack INT378 CA2 app with a React storefront, Express REST API, and MongoDB database. It is configured for MongoDB Atlas, so a local database server is not required.

## Features

- Public restaurant discovery, search, cuisine filters, restaurant details, menus, and reviews.
- Vegetarian-only demo restaurants and dishes, with dish search by name, description, category, or ingredient.
- Dish detail cards with food photos, ingredients, dietary/allergen notes, serving size, spice level, calories, bestseller labels, and sale pricing.
- Customer account, persisted cart, cash-on-delivery checkout, order history/details, eligible cancellation, and completed-order reviews.
- Restaurant owner profile and menu management plus order workflow actions.
- Delivery agent dashboard with first-claim assignment, pickup, and delivery updates.
- Admin stats, user activation, restaurant approval/activation, and orders/delivery APIs.
- JWT authentication, bcrypt password hashes, role/ownership checks, MongoDB schema validation and indexes, order transactions, rate limiting, security headers, health endpoint, configurable origins, and graceful shutdown.

## Stack and layout

- `frontend/`: React, Vite, React Router, Axios, Context API, Lucide icons, responsive CSS.
- `backend/`: Node.js ES modules, Express, Mongoose, JWT, bcrypt.
- `backend/src/models.js`: MongoDB document models for users, restaurants, menu items, orders, deliveries, reviews, and audit logs.
- `backend/database/`: index initialization and repeatable demo seed.

MongoDB Atlas provides replica-set transactions used by checkout. The browser keeps the bearer token in local storage for this academic demo; use HTTPS and consider secure HttpOnly cookies plus additional XSS protection for a production service.

## Docker (local testing and deployment images)

The backend is `backend/` (Express, port `4000`, `npm run start` / `npm run dev`) and the frontend is `frontend/` (React + Vite, dev port `5173`, `npm run dev` / `npm run build`). The API already exposes `GET /api/health`, which reports whether MongoDB is connected. Docker Compose uses MongoDB Atlas through `MONGODB_URI`; it does not start or migrate a database server.

From the project root in PowerShell, create and edit the Compose environment file. Use your Atlas **database user** URI and a long random JWT secret. URL-encode special characters in the database password. Do not copy either `.env` file into an image.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
docker compose config -q
docker compose build
docker compose run --rm backend npm run migrate
docker compose up -d
docker compose ps
docker compose logs -f backend frontend
```

Open `http://localhost:8080`; the API is available at `http://localhost:4000/api`. Check API/database readiness with `Invoke-RestMethod http://localhost:4000/api/health`. Press Ctrl+C to stop following logs; the containers keep running. Stop them with `docker compose down`.

`docker compose run --rm backend npm run migrate` initializes MongoDB indexes without dropping existing data. Run it once when setting up a new Atlas database, after building the backend image and before starting the stack.

The frontend image is a static NGINX build that runs as the unprivileged NGINX user. It reads the browser-visible API base URL from the runtime `API_URL` variable, so the same image can be configured for a different deployment. The Compose default `http://localhost:4000/api` is only for local testing; set `API_URL` to the public API address (or `/api` behind a same-origin reverse proxy) and set `CLIENT_ORIGIN` to the deployed frontend origin. The backend image runs on Node 22 as the non-root `node` user. No credentials, `.env` files, or `node_modules` are copied into either production image. For production deployments, provide secrets through the hosting platform's secret store instead of a checked-in file.

## Setup (no local MongoDB installation)

1. Create a MongoDB Atlas project and cluster, create a database user, and allow your computer's IP under Network Access. Copy the application connection URI from Atlas.
2. From this project directory, create local environment files:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   Copy-Item frontend\.env.example frontend\.env
   ```

3. Edit `backend\.env`: replace the `MONGODB_URI` placeholder with your Atlas URI. The database name in the URI should be `plateful`. Replace `<username>` and `<password>` with the database user's credentials (URL-encode special characters in the password). Set a long random `JWT_SECRET`.
4. Install packages and initialize indexes/sample data:

   ```powershell
   npm install --prefix backend
   npm install --prefix frontend
   npm --prefix backend run migrate
   npm --prefix backend run seed
   ```

   If you already seeded an earlier version, run `npm --prefix backend run seed` again after updating the app to refresh the demo restaurants and vegetarian menu.

5. Start the app from the project root in two PowerShell windows:

   ```powershell
   npm run dev:api
   ```

   ```powershell
   npm run dev:web
   ```

6. Visit <http://localhost:5173>. API health is at <http://localhost:4000/api/health>.

You can alternatively start each app from its own folder with `npm run dev`.

## Demo accounts

The seed command creates the following development accounts. The shared password is `Plateful2026!`.

| Role | Email |
|---|---|
| Customer | `customer@plateful.demo` |
| Restaurant owner | `owner@plateful.demo` |
| Delivery agent | `agent@plateful.demo` |
| Admin | `admin@plateful.demo` |

Do not use these credentials in a deployed environment.

## Environment variables

Backend (`backend/.env`):

| Variable | Purpose |
|---|---|
| `PORT` | API port, default `4000` |
| `NODE_ENV` | Runtime mode |
| `MONGODB_URI` | MongoDB Atlas or compatible MongoDB connection URI |
| `DB_POOL_SIZE` | Maximum connections in Mongoose pool, default `10` |
| `DB_CONNECT_TIMEOUT_MS` | Server selection timeout, default `10000` |
| `JWT_SECRET` | Secret used to sign bearer tokens |
| `JWT_EXPIRES_IN` | Token lifetime, default `1d` |
| `CLIENT_ORIGIN` | Allowed frontend origin(s), comma-separated |

Frontend (`frontend/.env`): `VITE_API_URL` is the API base URL and defaults to `http://localhost:4000/api`.

## API overview

Protected endpoints use `Authorization: Bearer <token>`. Successful responses use `{ "data": ... }` and errors use `{ "error": ... }`.

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Checks API and MongoDB connectivity |
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` | Authentication |
| `GET /api/restaurants`, `GET /api/menu/search?q=pizza`, `GET /api/restaurants/:id`, `GET /api/restaurants/:id/menu`, `GET /api/restaurants/:id/reviews` | Vegetarian restaurant and dish discovery; menu search includes ingredients |
| `POST/PATCH/DELETE /api/restaurants` and `/api/restaurants/:id` | Owner/admin restaurant management |
| `GET /api/owner/restaurant`, `POST/PATCH/DELETE /api/menu`, `/api/menu/:id` | Owner/admin restaurant and menu management |
| `POST /api/orders`, `GET /api/orders/my-orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id/status`, `POST /api/orders/:id/cancel` | Checkout and order workflow |
| `GET /api/deliveries/assigned`, `GET /api/deliveries/:id`, `PATCH /api/deliveries/:id/status` | Delivery workflow |
| `POST /api/restaurants/:id/reviews` | Review after a delivered order |
| `GET /api/admin/dashboard`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/status`, `GET/PATCH /api/admin/restaurants`, `GET /api/admin/orders`, `GET /api/admin/deliveries` | Admin tools |

Checkout uses database-derived menu prices and creates the order, embedded order-item snapshot, and delivery record in a transaction. The order path is `placed → accepted → preparing → ready_for_pickup → out_for_delivery → delivered`. Owners can reject placed orders; customers can cancel only placed orders. Delivery agents claim an unassigned job by accepting it, and cannot update another agent's assignment.

## Build and tests

```powershell
npm --prefix backend test
npm run build
```

The backend test covers allowed and rejected order status transitions. Full checkout/auth/ownership verification requires an Atlas URI, then run the migration and seed commands and test through the UI.

## Deployment and limitations

Build `frontend/` as a static site and deploy `backend/` as a separate Node service. Configure `VITE_API_URL`, `MONGODB_URI`, `CLIENT_ORIGIN`, and a securely stored `JWT_SECRET`. Run `npm --prefix backend run migrate` as a controlled deployment step before starting the API. Food images are remote URLs; no persistent local uploads or cloud SDK are required.

Other academic-demo limitations include first-claim delivery dispatch rather than geographic assignment, no live payment gateway, seeded owner/admin accounts rather than public role selection, and audit-log model without event population. Production hardening should include secure token storage, audit events, stronger operational logging, and broader API integration tests.

## AWS Terraform

The reusable AWS EKS/ECR Terraform configuration and manual review/apply/cleanup guide are in [`infra/terraform/README.md`](infra/terraform/README.md). It uses MongoDB Atlas; it does not create RDS or PostgreSQL resources. No AWS resources are created until you intentionally run `terraform apply`.

## Jenkins CI/CD

The root [`Jenkinsfile`](Jenkinsfile) runs local checks by default. Docker image builds and AWS publishing/deployment are opt-in parameters; the latter waits for approval. Agent, credential, IAM/RBAC, and Kubernetes workload prerequisites are documented in [`docs/jenkins-cicd.md`](docs/jenkins-cicd.md).
