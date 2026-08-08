# API Conventions

## Base URL

- **Local dev:** `http://localhost:4000/api/v1`
- **Production:** `https://api.dbpcms.example.com/api/v1`

## Versioning

All routes are prefixed with `/api/v1`. When we need breaking changes, we'll add `/api/v2` and run both side-by-side for a transition period.

## Authentication

All non-public endpoints require a JWT in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Access tokens expire in 15 minutes. Use the `/auth/refresh` endpoint to get a new one.

## Response Format

Every response follows the same shape:

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "total": 142, "totalPages": 8 }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": { "email": ["Email is required"] }
  }
}
```

## HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | No content (deletions) |
| 400 | Bad request (malformed) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 422 | Validation failed |
| 429 | Too many requests |
| 500 | Server error |

## Error Codes

| Code | When |
|---|---|
| `BAD_REQUEST` | Malformed request |
| `VALIDATION_ERROR` | Failed Zod validation |
| `UNAUTHORIZED` | No/invalid/expired token |
| `FORBIDDEN` | User lacks permission |
| `NOT_FOUND` | Resource doesn't exist |
| `CONFLICT` | Unique constraint violation |
| `TOO_MANY_REQUESTS` | Rate limit hit |
| `INTERNAL_SERVER_ERROR` | Unexpected error |

## Pagination

Use query params:

```
GET /api/v1/students?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc&search=abebe
```

Response includes `meta` with pagination info.

## Endpoints (Phase 1)

| Method | Path | Description |
|---|---|---|
| GET | `/` | API info |
| GET | `/health` | Detailed health |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe (checks DB) |

More endpoints land in each phase.
