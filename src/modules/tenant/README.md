# Tenant Module

## Overview
The Tenant module provides endpoints for restaurant owners to manage and view all their restaurant tenants. This module allows owners to see an overview of all restaurants they own with detailed statistics and filtering capabilities.

## Features

### 1. Get All Tenants
- **Endpoint**: `GET /tenants`
- **Role Required**: OWNER
- **Description**: Returns a paginated list of all tenants owned by the authenticated owner

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by tenant name or slug
- `status` (optional): Filter by status (`active`, `inactive`, `suspended`)
- `subscription_tier` (optional): Filter by subscription tier (`basic`, `premium`, `enterprise`)

#### Response Example
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Pizza Palace",
        "slug": "pizza-palace",
        "address": "123 Main St, City",
        "status": "active",
        "subscription_tier": "premium",
        "settings": {},
        "statistics": {
          "total_users": 15,
          "total_tables": 25,
          "total_zones": 3,
          "total_orders": 1250
        },
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-12-15T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

### 2. Get Tenant Statistics
- **Endpoint**: `GET /tenants/stats`
- **Role Required**: OWNER
- **Description**: Returns summary statistics for all tenants owned by the authenticated owner

#### Response Example
```json
{
  "success": true,
  "data": {
    "total_tenants": 5,
    "active_tenants": 4,
    "inactive_tenants": 0,
    "suspended_tenants": 1,
    "subscription_breakdown": {
      "basic": 2,
      "premium": 2,
      "enterprise": 1
    }
  }
}
```

## Usage

### Authentication
All endpoints require JWT authentication with the OWNER role. Include the bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Example Requests

#### Get all tenants with pagination
```bash
curl -X GET "http://localhost:3000/tenants?page=1&limit=10" \
  -H "Authorization: Bearer <your-token>"
```

#### Search for tenants
```bash
curl -X GET "http://localhost:3000/tenants?search=pizza" \
  -H "Authorization: Bearer <your-token>"
```

#### Filter by status
```bash
curl -X GET "http://localhost:3000/tenants?status=active" \
  -H "Authorization: Bearer <your-token>"
```

#### Get statistics
```bash
curl -X GET "http://localhost:3000/tenants/stats" \
  -H "Authorization: Bearer <your-token>"
```

## Files Structure

```
tenant/
├── dto/
│   ├── query-tenants.dto.ts    # DTO for query parameters
│   └── index.ts                # Export all DTOs
├── tenant.controller.ts         # Controller with endpoints
├── tenant.service.ts            # Business logic
├── tenant.module.ts             # Module definition
└── README.md                    # This file
```

## Database Schema
The module uses the `Tenant` model from Prisma schema which includes:
- Owner relationship (many tenants per owner)
- Users, tables, zones, and orders relationships
- Subscription tier and status tracking
- Settings storage (JSON)

## Security
- Only OWNER role can access these endpoints
- Each owner can only view their own tenants
- JwtAuthGuard and RolesGuard protect all routes

## Future Enhancements
- Create new tenant endpoint
- Update tenant settings endpoint
- Delete/suspend tenant endpoint
- Detailed analytics per tenant
- Export tenant data
