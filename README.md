# Keycloak & PostgreSQL Docker Setup

This project provides a Docker Compose configuration to run **Keycloak** (Identity and Access Management) backed by a **PostgreSQL** database.

## Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your machine.
- [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop).

## Getting Started

### 1. Environment Configuration

The project relies on environment variables for configuration. Create a `.env` file in the root directory if it doesn't exist.

**Example `.env` file:**

```env
POSTGRES_DB=eabpmn
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

### 2. Start the Services

Run the following command to start the containers in the background:

```bash
docker-compose up -d
```

## Accessing the Services

### Keycloak
- **URL:** [http://localhost:8080](http://localhost:8080)
- **Admin Console:** Click on "Administration Console"
- **Username:** `admin` (or as defined in `.env`)
- **Password:** `admin` (or as defined in `.env`)

### PostgreSQL
- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `eabpmn`
- **Username:** `admin`
- **Password:** `admin`

## Data Persistence

Database data is stored locally in the `./postgres_data` folder.
- This folder is **bind-mounted** to the PostgreSQL container.
- It is included in `.gitignore`, so your local data will **not** be pushed to the repository.
- If you delete this folder, your database will be reset.

