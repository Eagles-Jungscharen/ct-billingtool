# Backend API Documentation

This document describes the REST API endpoints provided by the Azure Functions backend.

## Base URL

- **Development**: `http://localhost:7072`
- **Production**: `https://your-function-app.azurewebsites.net` (to be configured)

## Authentication

All endpoints (except public endpoints) require authentication via JWT Bearer tokens obtained from the ChurchTool IDP.

### Authorization Header

```http
Authorization: Bearer {jwt_token}
```

### Token Acquisition

Tokens are acquired through OIDC flow:
1. User authenticates via ChurchTool IDP
2. Frontend receives JWT token
3. Frontend includes token in API requests

## Error Responses

All endpoints may return the following error responses:

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error - Server-side error |

**Error Response Format:**

```json
{
  "status": 400,
  "message": "Error description"
}
```

## Endpoints

### User Information

#### GET /api/me

Get current user information including admin status and groups.

**Authentication**: Required

**Response**: `200 OK`

```json
{
  "userId": "string",
  "displayName": "string",
  "isAdmin": boolean,
  "groups": [
    {
      "id": "string",
      "title": "string"
    }
  ]
}
```

**Example**:

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:7072/api/me
```

---

### Invoice Profiles

#### GET /api/invoice-profiles

List all available invoice profiles (sender information).

**Authentication**: Required

**Response**: `200 OK`

```json
[
  {
    "id": "string",
    "name": "string",
    "iban": "string",
    "absenderName": "string",
    "strasse": "string",
    "hausnummer": "string",
    "plz": "string",
    "ort": "string"
  }
]
```

**Example**:

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:7072/api/invoice-profiles
```

---

### Invoices

#### GET /api/invoices

List all invoices for the authenticated user.

**Authentication**: Required

**Response**: `200 OK`

```json
[
  {
    "id": "string",
    "userId": "string",
    "rechnungsprofilId": "string",
    "rechnungsnummer": "string",
    "titel": "string",
    "beschreibung": "string",
    "status": "entwurf" | "gesendet" | "bezahlt",
    "rechnungsDatum": "2024-01-01",
    "empfaengerName": "string",
    "empfaengerStrasse": "string",
    "empfaengerHausnummer": "string",
    "empfaengerPlz": "string",
    "empfaengerOrt": "string",
    "positionen": [
      {
        "id": "string",
        "nummer": 1,
        "titel": "string",
        "beschreibung": "string",
        "einheit": "Stück",
        "anzahl": 5,
        "preisProEinheit": 10.50,
        "preisTotal": 52.50
      }
    ],
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T10:00:00Z"
  }
]
```

**Example**:

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:7072/api/invoices
```

---

#### GET /api/invoices/{id}

Get a specific invoice by ID.

**Authentication**: Required

**Parameters**:
- `id` (path, required): Invoice ID

**Response**: `200 OK` (same format as single invoice in list)

**Errors**:
- `404 Not Found`: Invoice doesn't exist or doesn't belong to user

**Example**:

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:7072/api/invoices/{invoice-id}
```

---

#### POST /api/invoices

Create a new invoice.

**Authentication**: Required

**Request Body**:

```json
{
  "rechnungsprofilId": "string",
  "rechnungsnummer": "string",
  "titel": "string",
  "beschreibung": "string (optional)",
  "status": "entwurf",
  "rechnungsDatum": "2024-01-01 (optional)",
  "empfaengerName": "string",
  "empfaengerStrasse": "string",
  "empfaengerHausnummer": "string",
  "empfaengerPlz": "string",
  "empfaengerOrt": "string",
  "positionen": [
    {
      "id": "string",
      "nummer": 1,
      "titel": "string",
      "beschreibung": "string (optional)",
      "einheit": "string",
      "anzahl": 0,
      "preisProEinheit": 0,
      "preisTotal": 0
    }
  ]
}
```

**Response**: `201 Created`

Returns the created invoice with assigned `id`, `userId`, `createdAt`, and `updatedAt`.

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"rechnungsprofilId":"...","titel":"Neue Rechnung",...}' \
  http://localhost:7072/api/invoices
```

---

#### PUT /api/invoices/{id}

Update an existing invoice.

**Authentication**: Required

**Parameters**:
- `id` (path, required): Invoice ID

**Request Body**: Same as POST (full invoice data)

**Response**: `200 OK`

Returns the updated invoice.

**Errors**:
- `404 Not Found`: Invoice doesn't exist or doesn't belong to user

**Example**:

```bash
curl -X PUT \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"rechnungsprofilId":"...","titel":"Aktualisierte Rechnung",...}' \
  http://localhost:7072/api/invoices/{invoice-id}
```

---

#### DELETE /api/invoices/{id}

Delete an invoice.

**Authentication**: Required

**Parameters**:
- `id` (path, required): Invoice ID

**Response**: `204 No Content`

**Errors**:
- `404 Not Found`: Invoice doesn't exist or doesn't belong to user

**Example**:

```bash
curl -X DELETE \
  -H "Authorization: Bearer {token}" \
  http://localhost:7072/api/invoices/{invoice-id}
```

---

### Admin Endpoints

These endpoints require admin privileges (ChurchTool group membership).

#### POST /api/invoice-management/invoice-profiles

Create a new invoice profile.

**Authentication**: Required (Admin only)

**Request Body**:

```json
{
  "name": "string",
  "iban": "string",
  "absenderName": "string",
  "strasse": "string",
  "hausnummer": "string",
  "plz": "string",
  "ort": "string"
}
```

**Response**: `201 Created`

Returns the created profile with assigned `id`.

**Errors**:
- `403 Forbidden`: User is not an admin

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Neues Profil","iban":"CH...",...}' \
  http://localhost:7072/api/invoice-management/invoice-profiles
```

---

#### PUT /api/invoice-management/invoice-profiles/{id}

Update an existing invoice profile.

**Authentication**: Required (Admin only)

**Parameters**:
- `id` (path, required): Profile ID

**Request Body**: Same as POST

**Response**: `200 OK`

Returns the updated profile.

**Errors**:
- `403 Forbidden`: User is not an admin
- `404 Not Found`: Profile doesn't exist

**Example**:

```bash
curl -X PUT \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Aktualisiertes Profil",...}' \
  http://localhost:7072/api/invoice-management/invoice-profiles/{profile-id}
```

---

#### DELETE /api/invoice-management/invoice-profiles/{id}

Delete an invoice profile.

**Authentication**: Required (Admin only)

**Parameters**:
- `id` (path, required): Profile ID

**Response**: `204 No Content`

**Errors**:
- `403 Forbidden`: User is not an admin
- `404 Not Found`: Profile doesn't exist

**Example**:

```bash
curl -X DELETE \
  -H "Authorization: Bearer {token}" \
  http://localhost:7072/api/invoice-management/invoice-profiles/{profile-id}
```

---

## Data Types

### Invoice Status

```typescript
type RechnungStatus = 'entwurf' | 'gesendet' | 'bezahlt'
```

| Value | Description |
|-------|-------------|
| `entwurf` | Draft - Not yet sent |
| `gesendet` | Sent - Awaiting payment |
| `bezahlt` | Paid - Payment received |

## Rate Limiting

Currently no rate limiting is implemented. This should be added in production via Azure API Management or Azure Functions built-in throttling.

## CORS

CORS is configured to allow requests from:
- **Development**: `http://localhost:5173`
- **Production**: (to be configured based on deployment)

Credentials are enabled to allow cookies and authorization headers.

## Caching

User information (`MeDto`) is cached for 5 minutes per user to reduce load on the ChurchTool API.

## Testing with curl

### Get Auth Token

You'll need a valid JWT token from ChurchTool IDP. For testing, you can:

1. Open the frontend in a browser
2. Log in via OIDC
3. Open browser DevTools → Network tab
4. Copy the Bearer token from any API request

### Example Test Sequence

```bash
# Set token variable
TOKEN="your_jwt_token_here"

# Get user info
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:7072/api/me

# List invoices
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:7072/api/invoices

# Get invoice profiles
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:7072/api/invoice-profiles

# Create an invoice
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rechnungsprofilId": "profile-id",
    "rechnungsnummer": "2024-001",
    "titel": "Test Rechnung",
    "status": "entwurf",
    "empfaengerName": "Max Mustermann",
    "empfaengerStrasse": "Hauptstrasse",
    "empfaengerHausnummer": "1",
    "empfaengerPlz": "8000",
    "empfaengerOrt": "Zürich",
    "positionen": [
      {
        "id": "pos-1",
        "nummer": 1,
        "titel": "Testprodukt",
        "einheit": "Stück",
        "anzahl": 1,
        "preisProEinheit": 100,
        "preisTotal": 100
      }
    ]
  }' \
  http://localhost:7072/api/invoices
```

## Postman Collection

A Postman collection for API testing can be found at: (to be created)

## Further Reading

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview
- [SETUP.md](SETUP.md) - Development environment setup
- [Backend README](../packages/backend/README.md) - Backend package details
