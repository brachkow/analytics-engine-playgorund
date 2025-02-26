# Cloudflare Analytics Engine Playground

A simple web application that allows you to interact with Cloudflare's Analytics Engine SQL API.

## Features

- Input your Cloudflare Account ID and API Key
- Write SQL queries with syntax highlighting
- Execute queries against the Cloudflare Analytics Engine
- View formatted JSON results
- Error handling for failed queries

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- pnpm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Enter your Cloudflare Account ID and API Key in the respective fields
2. Write your SQL query in the editor
3. Click "Execute Query" to send the request to Cloudflare's Analytics Engine
4. View the results in the formatted JSON output area

## API Documentation

For more information about Cloudflare's Analytics Engine SQL API, visit:
[Cloudflare Analytics Engine SQL API Documentation](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)

## Example Queries

```sql
-- Get HTTP requests from the last 24 hours
SELECT * FROM http_requests WHERE datetime > NOW() - INTERVAL '1' DAY LIMIT 10

-- Count requests by status code
SELECT status, COUNT(*) as count FROM http_requests GROUP BY status ORDER BY count DESC

-- Get top client countries
SELECT clientCountryName, COUNT(*) as count 
FROM http_requests 
GROUP BY clientCountryName 
ORDER BY count DESC 
LIMIT 10
```

## License

MIT
