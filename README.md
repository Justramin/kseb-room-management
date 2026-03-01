# KSEB Room Management System

A professional room management system built with React, Express, and PostgreSQL.

## Deployment Ready

This system is configured for deployment on:
- **Neon PostgreSQL** (Database)
- **Render** (Backend)
- **Vercel** (Frontend)

## Project Structure

```
.
├── backend/
│   ├── src/            # Source files
│   ├── dist/           # Compiled files
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/            # React source files
│   ├── dist/           # Build output
│   └── package.json
└── README.md
```

## Setup & Running Locally

### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory with the following variables:
   ```env
   PORT=10000
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret
   FRONTEND_URL=http://localhost:5173
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=password123
   ```
4. Run in development mode:
   ```bash
   npm run dev
   ```
5. To build for production:
   ```bash
   npm run build
   ```
   The compiled files will be in the `dist` folder.

### Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_URL=http://localhost:10000/api
   ```
4. Run in development mode:
   ```bash
   npm run dev
   ```
5. To build for production:
   ```bash
   npm run build
   ```

## Production Deployment

### Backend (Render)
- Connect your repository.
- Setting the build command to `npm install && npm run build`.
- Set the start command to `npm start`.
- Add the necessary environment variables (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, etc.).

### Frontend (Vercel)
- Connect your repository.
- Set the build command to `npm run build`.
- Install directory as `frontend`.
- Add environment variable `VITE_API_URL` pointing to your deployed backend URL (e.g., `https://your-backend.onrender.com/api`).
