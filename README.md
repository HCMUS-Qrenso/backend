# Backend API - Complete Documentation

> **Last Updated:** December 15, 2025  
> **Version:** 1.0  
> **Framework:** NestJS 11 with TypeScript

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Setup & Installation](#setup--installation)
4. [Authentication System](#authentication-system)
5. [Localization (i18n)](#localization-i18n)
6. [API Documentation](#api-documentation)
7. [Swagger UI](#swagger-ui)
8. [Error Handling](#error-handling)
9. [Architecture & Code Organization](#architecture--code-organization)
10. [Security Features](#security-features)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- **Node.js** 18+ installed
- **PostgreSQL** database running
- **npm** or **yarn** package manager

### 🚀 Get Started in 3 Steps

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# 3. Run migrations and start server
npm run prisma:migrate
npm run start:dev
```

**Server will be running at:**
- API: http://localhost:3000
- Swagger Docs: http://localhost:3000/docs

---

## Project Overview

### Technology Stack

- **Framework:** NestJS 11.0
- **Language:** TypeScript 5.7
- **Database:** PostgreSQL with Prisma 7
- **Authentication:** JWT + Passport
- **Email:** Brevo (via SMTP with nodemailer)
- **Documentation:** Swagger/OpenAPI
- **Validation:** class-validator, class-transformer

### Key Features

✅ **Complete Authentication System**
- Email/Password authentication
- JWT access tokens (15min expiry)
- Refresh tokens with HTTP-only cookies
- Email verification
- Password reset flow
- Google OAuth 2.0

✅ **Tables Management API**
- Multi-tenant table management with QR codes
- Zone-based organization (floors, VIP areas, outdoor seating)
- Floor plan layout management (drag-and-drop positions)
- QR code generation with JWT tokens (365-day expiry)
- Download QR codes (PNG 512x512, PDF A4 with branding, ZIP batch)
- Token verification for customer orders
- Dual QR storage: ordering_url (actual link) + qr_code_url (display image)

✅ **Zones Management API**
- CRUD operations for table zones
- Zone statistics and table counts
- Display order management for zones
- Active/inactive zone toggling

✅ **API Documentation**
- Interactive Swagger UI
- Complete request/response schemas
- Built-in API testing

✅ **Security**
- Password hashing with bcrypt
- HTTP-only cookies for refresh tokens
- JWT-based authorization
- Role-based access control (RBAC)
- CORS configuration

✅ **Production Ready**
- Standardized error responses
- Comprehensive logging
- Global exception handling
- Environment-based configuration

---

## Setup & Installation

### 1. Install Dependencies

```bash
npm install
```

**Core Dependencies:**
- `@nestjs/common`, `@nestjs/core` - NestJS framework
- `@nestjs/jwt`, `@nestjs/passport` - Authentication
- `@prisma/client` - Database ORM
- `nodemailer` - Email service (SMTP)
- `bcrypt` - Password hashing
- `passport-jwt`, `passport-google-oauth20` - Auth strategies
- `cookie-parser` - Cookie handling
- `@nestjs/swagger` - API documentation
- `qrcode` - QR code generation
- `pdfkit` - PDF generation
- `archiver` - ZIP file creation

### 2. Environment Configuration

Create `.env` file in the project root:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/database?schema=public"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Google OAuth 2.0 (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Brevo Email (SMTP)
BREVO_SMTP_USER=your-smtp-login@smtp-brevo.com

# QR Code & Ordering
APP_ORDER_URL=http://localhost:3001
QR_API_URL=https://api.qrserver.com/v1/create-qr-code/
BREVO_SMTP_KEY=your-brevo-smtp-key
BREVO_FROM_EMAIL=noreply@yourdomain.com
BREVO_FROM_NAME=Your App Name
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed

# (Optional) Open Prisma Studio
npm run prisma:studio
```

### 4. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Secret to `.env`

### 5. Brevo Email Setup

1. Sign up at [Brevo](https://app.brevo.com/) (formerly Sendinblue)
2. Go to Settings → SMTP & API → SMTP
3. Copy your SMTP Login (e.g., `808e33001@smtp-brevo.com`)
4. Copy your SMTP Key
5. Verify your sender email address
6. Add credentials to `.env`:
   - `BREVO_SMTP_USER` - Your SMTP login
   - `BREVO_SMTP_KEY` - Your SMTP key
   - `BREVO_FROM_EMAIL` - Your verified sender email
   - `BREVO_FROM_NAME` - Display name for emails

### 6. Start Development Server

```bash
npm run start:dev
```

The server will start with hot-reload enabled.

---

## Authentication System

### Overview

The authentication system provides complete user management with email verification, password reset, and OAuth integration.

### Authentication Flow

```
┌─────────────┐
│   Signup    │──> Email Verification ──> Email Verified
└─────────────┘

┌─────────────┐
│    Login    │──> JWT Access Token (15min) + Refresh Token (7 days)
└─────────────┘

┌─────────────┐
│   Refresh   │──> New Access Token + New Refresh Token
└─────────────┘

┌─────────────┐
│Forgot Pass  │──> Reset Email ──> Reset Token ──> New Password
└─────────────┘
```

### Features

#### 1. User Registration
- **Endpoint:** `POST /auth/signup`
- Password hashing with bcrypt (10 salt rounds)
- Email verification token generation (24hr expiry)
- Automatic verification email
- User status: active (awaiting email verification)

#### 2. User Login
- **Endpoint:** `POST /auth/login`
- Email and password authentication
- Generates JWT access token (15min expiry)
- Creates refresh token (7 days expiry)
- Stores refresh token in HTTP-only cookie
- Updates last login timestamp

#### 3. Token Refresh
- **Endpoint:** `POST /auth/refresh`
- Uses refresh token from HTTP-only cookie
- Validates token and user status
- Generates new access token and refresh token
- Old refresh token is deleted (token rotation)
- Automatic cookie cleanup on errors

#### 4. Email Verification
- **Endpoint:** `POST /auth/verify-email`
- Validates verification token
- Marks email as verified
- Sends welcome email
- One-time use tokens

#### 5. Password Reset
- **Endpoint:** `POST /auth/forgot-password` (request reset)
- **Endpoint:** `POST /auth/reset-password` (set new password)
- Reset token generation (1hr expiry)
- Email with reset link
- Token validation and one-time use
- Password hash update

#### 6. Google OAuth 2.0
- **Endpoint:** `GET /auth/google` (initiate)
- **Endpoint:** `GET /auth/google/callback` (callback)
- Automatic user creation or linking
- Email pre-verified for OAuth users
- Token generation and cookie setting

#### 7. Logout
- **Endpoint:** `POST /auth/logout` (Protected)
- Deletes refresh token from database
- Clears HTTP-only cookie
- Requires JWT authentication

#### 8. Current User
- **Endpoint:** `GET /auth/me` (Protected)
- Returns current user profile
- Requires JWT authentication

### Token Management

#### Access Tokens (JWT)
- **Expiry:** 15 minutes
- **Storage:** Client-side (localStorage/memory)
- **Usage:** Bearer token in Authorization header
- **Payload:**
  ```json
  {
    "sub": "user-id",
    "email": "user@example.com",
    "role": "customer",
    "tenantId": "tenant-id"
  }
  ```

#### Refresh Tokens
- **Expiry:** 7 days
- **Storage:** HTTP-only cookie (server-controlled)
- **Rotation:** New token on each refresh
- **Security:** Cannot be accessed by JavaScript

### Cookie Configuration

```typescript
{
  httpOnly: true,              // Prevents XSS attacks
  secure: NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict',          // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',                   // Available site-wide
}
```

### Email Templates

Professional HTML email templates with:
- Gradient backgrounds
- Responsive design
- Clear call-to-action buttons
- Brand consistency

**Templates:**
1. **Verification Email** - Welcome + verification link
2. **Password Reset** - Reset instructions + link
3. **Welcome Email** - Post-verification greeting

---

## Localization (i18n)

The backend supports internationalization with **English (en)** and **Vietnamese (vi)** languages.

### How It Works

The backend uses `nestjs-i18n` to provide localized response messages based on the `Accept-Language` header sent by the client.

### Client Usage

To get responses in a specific language, include the `Accept-Language` header in your HTTP requests:

**English (default):**
```
Accept-Language: en
```

**Vietnamese:**
```
Accept-Language: vi
```

### Example Requests

**Login with English messages:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }'
```

Response:
```json
{
  "statusCode": 401,
  "message": "Incorrect password"
}
```

**Login with Vietnamese messages:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: vi" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }'
```

Response:
```json
{
  "statusCode": 401,
  "message": "Mật khẩu không chính xác"
}
```

### Supported Languages

- **en** (English) - Default language
- **vi** (Vietnamese)

### Translation Files

Translation files are located in:
- `src/i18n/en/messages.json` - English translations
- `src/i18n/vi/messages.json` - Vietnamese translations

### Adding New Languages

To add support for a new language:

1. Create a new folder in `src/i18n/` with the language code (e.g., `fr` for French)
2. Create a `messages.json` file with all the translation keys
3. The language will be automatically detected and used when clients send the appropriate `Accept-Language` header

### Adding New Messages

When adding new translatable messages:

1. Add the key-value pair to both `src/i18n/en/messages.json` and `src/i18n/vi/messages.json`
2. Use the global `t()` utility function in your code:

```typescript
import { t } from '../../common/utils';

// In your method
throw new BadRequestException(
  t('common.badRequest', 'Bad request'),
);
```

**Examples:**
```typescript
// Authentication errors
throw new UnauthorizedException(
  t('auth.emailNotExists', 'Email address not found'),
);

// Success messages
return {
  message: t('auth.userRegistered', 'User registered successfully'),
};

// Table operations
throw new NotFoundException(
  t('tables.tableNotFound', 'Table not found'),
);
```

**Note:** 
- Translation keys do NOT need the `messages.` prefix when using `t()` - it's added automatically
- The utility function is located at `src/common/utils/i18n.util.ts`
- Always provide a fallback message in English as the second parameter

### Fallback Behavior

If a client doesn't send an `Accept-Language` header or requests an unsupported language, the system will default to English (en).

### Testing Localization

You can test localization using tools like:
- **Postman:** Set the `Accept-Language` header in the Headers tab
- **curl:** Use the `-H "Accept-Language: vi"` flag
- **Browser DevTools:** Modify the request headers
- **REST Client extensions in VS Code**

### Current Coverage

All response messages have been localized in the following modules:
- **Authentication** - signup, login (with specific errors), password reset, email verification
- **Tables** - CRUD operations, QR code generation, status updates
- **Error messages** - validation errors, not found, unauthorized, etc.

### Login Error Messages

The login endpoint now provides specific error messages:

| Error | English | Vietnamese |
|-------|---------|------------|
| Email not found | "Email address not found" | "Không tìm thấy địa chỉ email" |
| Wrong password | "Incorrect password" | "Mật khẩu không chính xác" |
| Account inactive | "Account is inactive" | "Tài khoản đã bị vô hiệu hóa" |

---

## API Documentation

### Base URL
```
http://localhost:3000
```

### Authentication Endpoints

#### 📝 POST /auth/signup
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass@123!",
  "fullName": "John Doe",
  "phone": "+84901234567"
}
```

**Validation Rules:**
- **Email**: Must be a valid email format
- **Password**: Minimum 8 characters, must include:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
  - At least one special character (@, #, $, !, %, etc.)
- **Full Name**: 2-255 characters
- **Phone**: Valid international phone number format (e.g., +84901234567)

**Response:** `201 Created`
```json
{
  "message": "User registered successfully. Please check your email to verify your account."
}
```

**Errors:**
- `409 Conflict` - Email already exists
- `400 Bad Request` - Validation errors (weak password, invalid email, invalid phone)

---

#### 🔐 POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass@123!"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "customer",
    "tenantId": null
  }
}
```
*Note: Refresh token is automatically set in HTTP-only cookie*

**Errors:**
- `401 Unauthorized` - Email address not found
- `401 Unauthorized` - Email address not verified (must verify email before login)
- `401 Unauthorized` - Incorrect password
- `401 Unauthorized` - Account inactive

---

#### 🔄 POST /auth/refresh
Refresh access token using cookie.

**Request:** No body required (uses cookie)

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "customer",
    "tenantId": null
  }
}
```

**Errors:**
- `401 Unauthorized` - Refresh token not found
- `401 Unauthorized` - Invalid or expired refresh token

---

#### 📧 POST /auth/forgot-password
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "If the email exists, a password reset link has been sent."
}
```

---

#### 🔑 POST /auth/reset-password
Reset password with token.

**Request:**
```json
{
  "token": "abc123def456ghi789",
  "newPassword": "NewSecurePass@123!"
}
```

**Password Requirements:**
- Minimum 8 characters
- Must include uppercase, lowercase, number, and special character

**Response:** `200 OK`
```json
{
  "message": "Password reset successfully"
}
```

**Errors:**
- `400 Bad Request` - Invalid or expired token
- `400 Bad Request` - Weak password (doesn't meet requirements)

---

#### ✅ POST /auth/verify-email
Verify email address.

**Request:**
```json
{
  "email": "user@example.com",
  "token": "abc123def456ghi789"
}
```

**Response:** `200 OK`
```json
{
  "message": "Email verified successfully"
}
```

**Errors:**
- `400 Bad Request` - Invalid verification token
- `400 Bad Request` - Token expired

---

#### 📧 POST /auth/resend-email
Resend verification or password reset email.

**Use Cases**: 
- Resend email verification link if not received or expired
- Resend password reset link if not received or expired

**Request:**
```json
{
  "email": "user@example.com",
  "type": "email_verification"
}
```

**Type Options:**
- `email_verification` - Resend email verification link
- `password_reset` - Resend password reset link

**Response:** `200 OK`
```json
{
  "message": "Verification email sent successfully. Please check your inbox."
}
```
OR
```json
{
  "message": "If the email exists, a password reset link has been sent."
}
```

**Errors:**
- `400 Bad Request` - Email is already verified (only for `email_verification` type)

**Security Note**: 
- For `email_verification`: Returns success only if email exists and is not verified
- For `password_reset`: Doesn't reveal whether email exists (returns generic message)

**Examples:**
```bash
# Resend email verification
POST /auth/resend-email
{
  "email": "user@example.com",
  "type": "email_verification"
}

# Resend password reset
POST /auth/resend-email
{
  "email": "user@example.com",
  "type": "password_reset"
}
```

---

#### 🔓 POST /auth/logout
Logout and clear refresh token. **[Protected]**

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

#### 👤 GET /auth/me
Get current user profile. **[Protected]**

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "customer",
  "tenantId": null
}
```

---

#### 🔵 GET /auth/google
Initiate Google OAuth login.

Redirects to Google OAuth consent screen.

---

### User Endpoints

#### 👤 GET /users/profile
Get detailed user profile. **[Protected]**

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "fullName": "John Doe",
  "phone": "+84901234567",
  "role": "customer",
  "emailVerified": true,
  "status": "active",
  "avatarUrl": null,
  "tenantId": null,
  "createdAt": "2025-12-13T10:30:00.000Z",
  "lastLoginAt": "2025-12-13T12:00:00.000Z"
}
```

---

#### 👥 GET /users/all
Get all users. **[Protected - Admin/Manager only]**

**Response:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "customer",
    "status": "active",
    "emailVerified": true,
    "createdAt": "2025-12-13T10:30:00.000Z"
  }
]
```


## Tables Management API

### Overview

The Tables Management API provides comprehensive table and QR code management for multi-tenant restaurant environments. Each table has a unique QR code that customers scan to access the ordering menu.

### Key Features

✅ **Table Management**
- Full CRUD operations for tables
- Multi-tenant isolation by restaurant
- Floor plan layout management with positions (x, y)
- Table status tracking (available, occupied, reserved, maintenance)
- Pagination and filtering

✅ **QR Code System**
- Dual storage strategy:
  - `ordering_url`: Actual ordering link embedded in QR code
  - `qr_code_url`: External QR image from api.qrserver.com for display
- JWT tokens with 365-day expiry
- Multi-tenant URLs with slug: `/${tenant.slug}/menu?table=X&token=Y`
- QR code regeneration with token invalidation

✅ **Download Features**
- PNG format (512x512 high quality)
- PDF format (A4 with restaurant branding, centered QR)
- Batch download options:
  - ZIP: Individual PNG files for all tables
  - PDF: Single document with all QRs and table info
- Uses stored `ordering_url` for consistent quality

✅ **Floor Layout**
- Position storage with (x, y) coordinates
- Floor-based organization
- Batch position updates for drag-and-drop
- Table shapes (circle, rectangle, oval)

### QR Code Architecture

#### Storage Strategy
```typescript
{
  qr_code_token: "eyJhbGci...",     // JWT token (TEXT type)
  ordering_url: "http://localhost:3001/joes-diner/menu?table=X&token=Y", // Actual link (TEXT)
  qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=...", // Display image (TEXT)
  qr_code_generated_at: "2025-12-14T..."
}
```

#### Token Payload
```json
{
  "tenant_id": "uuid",
  "table_id": "uuid",
  "table_number": "T-01",
  "issued_at": "2025-12-14T10:30:00Z"
}
```

#### QR Generation Flow
```
1. Create JWT token (365-day expiry)
2. Generate ordering_url: ${APP_ORDER_URL}/${tenant.slug}/menu?table=${id}&token=${token}
3. Generate qr_code_url: ${QR_API_URL}?size=200x200&data=${encodeURIComponent(ordering_url)}
4. Store all three in database
5. Return data to client
```

#### QR Downloads
- All downloads use stored `ordering_url` for quality and consistency
- PNG: 512x512 pixels with error correction level H
- PDF: A4 page with restaurant name, table number, centered QR code
- ZIP: Batch download with filenames `table-{number}.png`

### Table Endpoints

#### 📋 GET /tables
Get paginated list of tables with filtering.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `search` - Search by table number or floor
- `floor` - Filter by floor
- `status` - Filter by status
- `is_active` - Filter by active status

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "tables": [
      {
        "id": "uuid",
        "table_number": "T-01",
        "capacity": 4,
        "floor": "Ground Floor",
        "shape": "rectangle",
        "status": "available",
        "is_active": true,
        "position": { "x": 100, "y": 200 },
        "current_order": null,
        "created_at": "2025-12-14T...",
        "updated_at": "2025-12-14T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "total_pages": 3
    }
  }
}
```

---

#### 📊 GET /tables/stats
Get table statistics.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total_tables": 25,
    "available_tables": 18,
    "occupied_tables": 5,
    "waiting_for_payment": 2,
    "maintenance_tables": 1,
    "inactive_tables": 1
  }
}
```

---

#### ➕ POST /tables
Create a new table.

**Request:**
```json
{
  "table_number": "T-01",
  "capacity": 4,
  "zone_id": "123e4567-e89b-12d3-a456-426614174000",
  "shape": "rectangle",
  "status": "available",
  "is_active": true,
  "position": { "x": 100, "y": 200 },
  "auto_generate_qr": true
}
```

**Field Constraints:**
- `capacity`: Positive integer between 1-20
- `table_number`: Max 20 characters, must be unique per tenant
- `zone_id`: Must reference an existing active zone

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Table created successfully",
  "data": {
    "id": "uuid",
    "table_number": "T-01",
    "capacity": 4,
    "floor": "Ground Floor",
    "shape": "rectangle",
    "status": "available",
    "is_active": true,
    "position": { "x": 100, "y": 200 },
    "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?...",
    "ordering_url": "http://localhost:3001/joes-diner/menu?table=...&token=...",
    "created_at": "2025-12-14T...",
    "updated_at": "2025-12-14T..."
  }
}
```

---

#### 🔍 GET /tables/:id
Get table details by ID.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "table_number": "T-01",
    "capacity": 4,
    "floor": "Ground Floor",
    "shape": "rectangle",
    "status": "available",
    "is_active": true,
    "position": { "x": 100, "y": 200 },
    "qr_code_token": "eyJhbGci...",
    "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?...",
    "ordering_url": "http://localhost:3001/joes-diner/menu?table=...&token=...",
    "qr_code_generated_at": "2025-12-14T...",
    "current_order": null,
    "created_at": "2025-12-14T...",
    "updated_at": "2025-12-14T..."
  }
}
```

---

#### 📝 PUT /tables/:id
Update table details.

**Request:**
```json
{
  "table_number": "T-01A",
  "capacity": 6,
  "zone_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "maintenance",
  "position": { "x": 150, "y": 250 }
}
```

**Note:** Capacity must be between 1-20

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Table updated successfully",
  "data": { ... }
}
```

---

#### 🗑️ DELETE /tables/:id
Delete table (soft delete - sets is_active to false).

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Table deleted successfully"
}
```

**Errors:**
- `409 Conflict` - Cannot delete table with active orders

---

### QR Code Endpoints

#### 🎯 POST /tables/:id/qr/generate
Generate or regenerate QR code for a table.

**Request:**
```json
{
  "force_regenerate": false
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "id": "uuid",
    "table_number": "T-01",
    "qr_code_token": "eyJhbGci...",
    "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?...",
    "ordering_url": "http://localhost:3001/joes-diner/menu?table=...&token=...",
    "qr_code_generated_at": "2025-12-14T..."
  }
}
```

---

#### 📥 GET /tables/:id/qr/download?format=png|pdf
Download QR code as PNG or PDF.

**Query Parameters:**
- `format`: `png` (default) or `pdf`

**Response:** 
- PNG: `image/png` (512x512 pixels)
- PDF: `application/pdf` (A4 with branding)

**Headers:**
```
Content-Type: image/png | application/pdf
Content-Disposition: attachment; filename="table-{number}-qr.png|pdf"
```

---

#### 📦 GET /tables/qr/download-all?format=zip|pdf
Download all QR codes as ZIP or PDF.

**Query Parameters:**
- `format`: `zip` (default) or `pdf`
  - `zip`: Individual PNG files for each table
  - `pdf`: Single PDF containing all QRs with table information

**Response (ZIP):** `application/zip`
```
qr-codes.zip
├── table-T-01.png
├── table-T-02.png
└── table-T-03.png
```

**Response (PDF):** `application/pdf`
- One table per A4 page
- Each page includes restaurant name, table number, QR code, and ordering instructions
- Same professional layout as individual PDF downloads

---

#### ✅ POST /tables/verify-token
Verify QR code token (public endpoint for customers).

**Request:**
```json
{
  "token": "eyJhbGci..."
}
```

**Response:** `200 OK` (Valid)
```json
{
  "valid": true,
  "table": {
    "id": "uuid",
    "tableNumber": "T-01",
    "floor": "Ground Floor",
    "capacity": 4,
    "status": "available"
  }
}
```

**Response:** `200 OK` (Invalid)
```json
{
  "valid": false,
  "error": "Token expired",
  "message": "This QR code has expired. Please ask staff for a new one."
}
```

---

### Floor Layout Endpoints

#### 🗺️ GET /tables/layout?floor=Ground%20Floor
Get table layout for a specific floor.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "floor": "Ground Floor",
    "tables": [
      {
        "id": "uuid",
        "table_number": "T-01",
        "type": "rectangle",
        "name": "T-01",
        "seats": 4,
        "area": "Ground Floor",
        "status": "available",
        "position": { "x": 100, "y": 200 }
      }
    ]
  }
}
```

---

#### 🏢 GET /tables/floors
Get all available floors.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "floors": ["Ground Floor", "First Floor", "Second Floor"]
  }
}
```

---

#### 🔄 POST /tables/layout/batch-update
Batch update table positions (for drag-and-drop).

**Request:**
```json
{
  "updates": [
    {
      "table_id": "uuid-1",
      "position": { "x": 150, "y": 250 }
    },
    {
      "table_id": "uuid-2",
      "position": { "x": 300, "y": 100 }
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Layout updated successfully",
  "data": {
    "updated_count": 2,
    "tables": [
      { "id": "uuid-1", "position": { "x": 150, "y": 250 } },
      { "id": "uuid-2", "position": { "x": 300, "y": 100 } }
    ]
  }
}
```

---

### Database Schema

#### Tables Table
```sql
CREATE TABLE tables (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  table_number VARCHAR(20) NOT NULL,
  capacity INT NOT NULL,
  position VARCHAR(100),  -- JSON: {"x": 100, "y": 200}
  floor VARCHAR(100),
  shape VARCHAR(100),     -- circle, rectangle, oval
  status VARCHAR(20) DEFAULT 'available',
  qr_code_token TEXT UNIQUE,
  qr_code_url TEXT,       -- External QR image URL
  ordering_url TEXT,      -- Actual ordering link
  qr_code_generated_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, table_number)
);
```

### Additional Documentation

For complete API documentation with all endpoints, see:
- Frontend API Documentation: `/frontend/API_DOC_FOR_TABLES/TABLES_API_DOCUMENTATION.md`
- Database Design: `/docs/database/DATABASE_DESIGN.dbml`
- Database Description: `/docs/database/DATABASE_DESCRIPTION.md`

---
**Errors:**
- `403 Forbidden` - Insufficient permissions

---

## Swagger UI

### Access Documentation
Open in your browser:
```
http://localhost:3000/docs
```

### Features

✅ **Interactive API Explorer**
- Test all endpoints directly
- View request/response schemas
- See example values
- Try different scenarios

✅ **Authentication Support**
- JWT Bearer token authentication
- Cookie-based refresh tokens
- Persistent authorization

✅ **Organized by Tags**
- **auth** - Authentication endpoints
- **users** - User management

### How to Use Swagger

#### 1. Test Public Endpoints
1. Find endpoint (e.g., `POST /auth/login`)
2. Click "Try it out"
3. Enter request data
4. Click "Execute"
5. View response

#### 2. Test Protected Endpoints
1. Login via `POST /auth/login`
2. Copy the `accessToken` from response
3. Click "Authorize" button (🔓) at top right
4. Paste token in "JWT-auth" field
5. Click "Authorize"
6. Now you can test protected endpoints

#### 3. Download API Spec
```
http://localhost:3000/docs-json
```

### Swagger Configuration

Located in `src/main.ts`:
```typescript
const config = new DocumentBuilder()
  .setTitle('Backend API')
  .setDescription('API documentation for the backend application')
  .setVersion('1.0')
  .addTag('auth', 'Authentication endpoints')
  .addTag('tables', 'Table management and QR code endpoints')
  .addTag('users', 'User management endpoints')
  .addBearerAuth()
  .addCookieAuth('refreshToken')
  .build();
```

---

## Error Handling

### Standardized Error Response

All API errors follow a consistent structure:

```json
{
  "statusCode": 400,
  "message": "Invalid credentials",
  "error": "Bad Request",
  "timestamp": "2025-12-13T10:30:00.000Z",
  "path": "/auth/login"
}
```

### Error Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `statusCode` | number | HTTP status code |
| `message` | string \| string[] | Error message or validation errors |
| `error` | string | Error type/name |
| `timestamp` | string | ISO 8601 timestamp |
| `path` | string | API endpoint |

### Common HTTP Status Codes

#### 2xx Success
- **200 OK** - Request successful
- **201 Created** - Resource created

#### 4xx Client Errors
- **400 Bad Request** - Invalid input/validation errors
- **401 Unauthorized** - Invalid credentials or expired token
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource already exists

#### 5xx Server Errors
- **500 Internal Server Error** - Unexpected server error

### Example Error Responses

**Validation Error (400):**
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be at least 6 characters"
  ],
  "error": "Bad Request",
  "timestamp": "2025-12-13T10:30:00.000Z",
  "path": "/auth/signup"
}
```

**Unauthorized (401):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "timestamp": "2025-12-13T10:30:00.000Z",
  "path": "/auth/login"
}
```

**Forbidden (403):**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden",
  "timestamp": "2025-12-13T10:30:00.000Z",
  "path": "/users/all"
}
```

### Frontend Error Handling

**TypeScript Interface:**
```typescript
interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}
```

**Example Usage:**
```typescript
try {
  const response = await api.login(credentials);
} catch (err) {
  const error = err as ApiError;
  
  if (error.statusCode === 401) {
    // Redirect to login
    router.push('/login');
  } else if (error.statusCode === 400) {
    // Show validation errors
    if (Array.isArray(error.message)) {
      error.message.forEach(msg => toast.error(msg));
    } else {
      toast.error(error.message);
    }
  }
}
```

### Global Exception Filter

All errors are caught and formatted by the global exception filter:

```typescript
// src/common/filters/http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Formats all errors consistently
    // Logs errors with appropriate levels
    // Cleans up cookies on auth errors
  }
}
```

---

## Architecture & Code Organization

### Project Structure

```
backend/
├── src/
│   ├── common/                 # Shared utilities
│   │   ├── constants/         # Configuration constants
│   │   ├── decorators/        # Custom decorators
│   │   ├── dto/               # Common DTOs
│   │   ├── filters/           # Exception filters
│   │   ├── guards/            # Authorization guards
│   │   ├── interfaces/        # TypeScript interfaces
│   │   └── utils/             # Utility functions
│   │
│   ├── modules/               # Feature modules
│   │   ├── auth/             # Authentication module
│   │   │   ├── dto/          # Auth DTOs
│   │   │   ├── guards/       # Auth guards
│   │   │   ├── services/     # Business logic
│   │   │   ├── strategies/   # Passport strategies
│   │   │   ├── templates/    # Email templates
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.module.ts
│   │   │
│   │   └── user/             # User module
│   │       ├── user.controller.ts
│   │
│   │   └── tables/           # Tables module
│   │       ├── dto/          # Table DTOs
│   │       ├── tables.controller.ts
│   │       ├── tables.service.ts
│   │       └── tables.module.ts
│   │       ├── user.service.ts
│   │       └── user.module.ts
│   │
│   ├── app.module.ts          # Root module
│   ├── main.ts                # Application entry
│   └── prisma.service.ts      # Database service
│
├── prisma/                     # Database
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration files
│   └── seed.ts                # Seed data
│
├── docs/                       # Documentation
├── test/                       # E2E tests
└── dist/                       # Build output
```

### Design Patterns

#### 1. Dependency Injection
All services use constructor injection:
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly jwtService: JwtService,
  private readonly emailService: EmailService,
  private readonly tokenService: TokenService,
- **TablesService** - Table and QR code management
) {}
```

#### 2. Single Responsibility Principle
- **AuthService** - Authentication business logic
- **TokenService** - Token management (creation, validation, deletion)
- **EmailService** - Email operations (Brevo SMTP via nodemailer)

#### 3. Separation of Concerns
- Controllers handle HTTP requests/responses
- Services contain business logic
- Guards handle authorization
- Filters handle exceptions
- DTOs validate and transform data

#### 4. Configuration Management
Centralized in `common/constants/`:
```typescript
export const COOKIE_CONFIG = {
  REFRESH_TOKEN: {
    name: 'refreshToken',
    options: { httpOnly: true, secure: true, ... }
  }
};
```

### Key Components

#### Guards
- **JwtAuthGuard** - JWT authentication
- **GoogleAuthGuard** - Google OAuth
- **RolesGuard** - Role-based access control

#### Decorators
- **@Public()** - Mark endpoints as public
- **@CurrentUser()** - Extract user from request
- **@Roles()** - Define required roles

#### Strategies
- **JwtStrategy** - JWT token validation
- **GoogleStrategy** - Google OAuth validation

---

## Security Features

### Authentication Security

✅ **Password Security**
- Bcrypt hashing with 10 salt rounds
- Minimum 6 characters required
- Passwords never stored in plain text

✅ **Token Security**
- JWT with HS256 algorithm
- Short-lived access tokens (15min)
- Refresh token rotation
- HTTP-only cookies for refresh tokens
- Automatic token cleanup on logout

✅ **Cookie Security**
- `httpOnly: true` - Prevents XSS
- `secure: true` - HTTPS only in production
- `sameSite: 'strict'` - CSRF protection
- 7-day expiry with auto-renewal

### Authorization

✅ **Role-Based Access Control (RBAC)**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
async getAllUsers() { }
```

✅ **Protected Endpoints**
- JWT validation on protected routes
- User status checking (active/inactive)
- Email verification requirements (optional)

### Input Validation

✅ **DTO Validation**
```typescript
class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

✅ **Global Validation Pipe**
- Automatic whitelist
- Strip unknown properties
- Transform payloads

### CORS Configuration

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true, // Allow cookies
});
```

### Email Security

✅ **Token Security**
- Cryptographically random tokens
- One-time use only
- Time-limited expiry
- Marked as used after consumption

✅ **Information Disclosure**
- Generic messages for security
- No user existence confirmation
- Rate limiting recommended

---

## Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:cov
```

### Testing Protected Endpoints

```bash
# 1. Login to get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 2. Use token for protected endpoints
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm run start:prod
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://..."
JWT_SECRET=very-secure-secret-key
FRONTEND_URL=https://yourdomain.com
BREVO_SMTP_USER=your-smtp-login@smtp-brevo.com
BREVO_SMTP_KEY=your-brevo-smtp-key
```

### Database Migrations

```bash
# Deploy migrations to production
npm run prisma:migrate:deploy
```

### Health Check

```
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2025-12-13T10:30:00.000Z"
}
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```
Error: P1001: Can't reach database server
```
**Solution:**
- Check PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Test connection: `psql -U user -d database`

#### 2. JWT Secret Not Set
```
Error: JWT secret not configured
```
**Solution:**
- Set `JWT_SECRET` in `.env`
- Use a strong random string

#### 3. Email Sending Failed
```
WARN [EmailService] Brevo SMTP key not configured
```
**Solution:**
- Add `BREVO_SMTP_USER` and `BREVO_SMTP_KEY` to `.env`
- Verify sender email in Brevo dashboard
- Check SMTP credentials at https://app.brevo.com/settings/keys/smtp

#### 4. Google OAuth Error
```
ERROR OAuth2Strategy requires a clientID option
```
**Solution:**
- Add Google credentials to `.env`
- Or remove Google OAuth if not needed

#### 5. Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Debug Mode

```bash
npm run start:debug
```

### Logging

Check logs for:
- User registrations
- Login attempts
- Token refreshes
- Email sending
- Errors and warnings

---

## Quick Command Reference

```bash
# Development
npm run start:dev          # Start with hot-reload
npm run build              # Build for production
npm run start:prod         # Start production server

# Database
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio
npm run prisma:seed        # Seed database

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format with Prettier
npm run test               # Run unit tests
npm run test:e2e           # Run E2E tests
npm run test:cov           # Test coverage
```

---

## Additional Resources

### Official Documentation
- [NestJS](https://docs.nestjs.com/)
- [Prisma](https://www.prisma.io/docs/)
- [Passport.js](http://www.passportjs.org/)
- [Brevo](https://developers.brevo.com/)
- [Nodemailer](https://nodemailer.com/)

### API Documentation
- Swagger UI: http://localhost:3000/docs
- OpenAPI Spec: http://localhost:3000/docs-json

---

## Support & Contributing

### Getting Help
- Check this documentation first
- Review Swagger UI for API details
- Check error logs for debugging

### Best Practices
- Always use environment variables for secrets
- Never commit `.env` file
- Use strong JWT secrets
- Enable HTTPS in production
- Implement rate limiting4
- Keep dependencies updated

---

**Built with ❤️ using NestJS**

*Last Updated: December 13, 2025*
