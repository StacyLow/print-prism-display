
# Printer Dashboard Backend API

A simple Express.js backend API for handling PostgreSQL database queries.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Start the development server:
```bash
npm run dev
```

The server will run on port 3001 by default.

## Environment Variables

You can set the following environment variables:
- `PORT`: Server port (default: 3001)

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /api/test-connection` - Test database connection
- `POST /api/print-jobs` - Fetch print jobs with filters
- `POST /api/filament-types` - Get available filament types
- `POST /api/printers` - Get available printers

## Database Configuration

The database configuration is passed in the request body for each API call, allowing dynamic connection to different databases.

## Development

The frontend Vite server is configured to proxy `/api` requests to this backend server during development.
