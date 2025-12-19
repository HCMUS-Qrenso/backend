# Backend API - Complete Documentation

> **Last Updated:** December 19, 2025  
> **Version:** 1.2  
> **Framework:** NestJS 11 with TypeScript

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Setup & Installation](#setup--installation)
4. [Authentication System](#authentication-system)
5. [QR Validation Flow](#qr-validation-flow)
6. [Localization (i18n)](#localization-i18n)
7. [API Documentation](#api-documentation)
8. [Swagger UI](#swagger-ui)
9. [Error Handling](#error-handling)
10. [Architecture & Code Organization](#architecture--code-organization)
11. [Security Features](#security-features)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)

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
- Zone-based organization (zones: e.g., VIP, outdoor, etc.)
- Zone layout management (drag-and-drop positions)
- QR code generation with JWT tokens (365-day expiry)
- Download QR codes (PNG 512x512, PDF A4 with branding, ZIP batch)
- Token verification for customer orders
- Dual QR storage: ordering_url (actual link) + qr_code_url (display image)

✅ **Zones Management API**
- CRUD operations for table zones
- Zone statistics and table counts
- Display order management for zones
- Active/inactive zone toggling

✅ **Tenant Management API**
- Owner dashboard for all owned restaurants
- Tenant listing with pagination and filtering
- Statistics per tenant (users, tables, zones, orders)
- Tenant status and subscription tier tracking
- Search by name or slug

✅ **Menu Management API**
- CRUD operations for menu items with categories
- Modifier groups and modifiers with display ordering
- Price management and allergen information
- Image uploads and status management
- Advanced filtering and pagination
- Multi-tenant menu customization

✅ **Categories Management API**
- Full CRUD operations for menu categories
- Display order management with drag-and-drop reordering
- Category status toggling (active/inactive)
- Multi-tenant isolation with tenant context
- Bulk operations for reordering categories
- Validation to prevent deletion of categories with associated menu items

✅ **Modifiers Management API**
- Modifier groups with selection constraints (min/max selections)
- Individual modifiers within groups with pricing
- Display order management for both groups and modifiers
- Bulk reordering operations
- Multi-tenant isolation
- Validation for selection constraints and unique display orders
- Protection against deleting groups with associated menu items

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
CUSTOMER_FRONTEND_URL=http://localhost:3001
QR_API_URL=https://api.qrserver.com/v1/create-qr-code/
BREVO_SMTP_KEY=your-brevo-smtp-key
BREVO_FROM_EMAIL=noreply@yourdomain.com
BREVO_FROM_NAME=Your App Name

# QR Code & Ordering Configuration
CUSTOMER_FRONTEND_URL=http://localhost:3002
QR_API_URL=https://api.qrserver.com/v1/create-qr-code/
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database with sample data
# Creates:
# - Super admin account
# - Owner account (with NULL tenantId)
# - Sample tenant (restaurant)
# - Staff users (admin, waiter, kitchen_staff)
# - Zones and tables with QR codes
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

## QR Validation Flow

### Overview

The QR validation system enables customers to securely access restaurant menus by scanning table-specific QR codes. QR codes contain JWT tokens with GUEST role and table context.

### How It Works

#### QR Code Generation
- **JWT Token**: Contains GUEST role, tableId, tenantId, tableNumber
- **No Expiration**: QR codes remain valid until regenerated
- **URLs**: 
  - `ordering_url`: Frontend URL with token as query parameter
  - `qr_code_url`: External QR image for display

#### Token Validation (QrTokenGuard)

**Token Source:**
- **GUEST users** (unauthenticated): QR token from `Authorization: Bearer <token>` header
- **CUSTOMER users** (authenticated): QR token from `x-qr-token` header

**Validation Steps:**
1. Extract token based on user role
2. Verify JWT signature and GUEST role
3. Check table exists and is active
4. Verify token matches current table QR token
5. Attach table context to request

**Protected Endpoints:**
```typescript
@UseGuards(QrTokenGuard)
@Get('menu/categories')
async getCategories(@Req() request) {
  // request.qrContext contains { tableId, tableNumber, tenantId }
}
```

**Error Responses:**
- `403 Forbidden` - Missing QR token (scan required)
- `401 Unauthorized` - Invalid/expired token
- `403 Forbidden` - Table inactive or token outdated

### Security Features

✅ JWT-based authentication with GUEST role isolation  
✅ Database validation of table existence and status  
✅ Token regeneration invalidates old QR codes  
✅ Multi-tenant context isolation  

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

// Categories operations
throw new ConflictException(
  t('categories.categoryNameExists', 'A category with this name already exists'),
);

// Modifiers operations
return {
  message: t('modifiers.modifierGroupCreatedSuccess', 'Modifier group created successfully'),
};
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
Get all users. **[Protected - Super Admin only]**

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
- Zone layout management with positions (x, y, rotation)
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

✅ **Zone Layout**
- Position storage with (x, y) coordinates
- Zone-based organization
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
2. Generate ordering_url: ${CUSTOMER_FRONTEND_URL}/${tenant.slug}/menu?table=${id}&token=${token}
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
- `search` - Search by table number or zone
- `zone_id` - Filter by zone
- `status` - Filter by status
- `is_active` - Filter by active status
- `sort_by` (default: 'tableNumber') - Sort by field: 'tableNumber', 'status', 'createdAt', 'updatedAt'
- `sort_order` (default: 'asc') - Sort order: 'asc' or 'desc'

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
        "position": { "x": 100, "y": 200, "rotation": 45 },
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
  "position": { "x": 100, "y": 200, "rotation": 45 },
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
    "zone": {
      "id": "zone-uuid",
      "name": "VIP Area"
    },
    "shape": "rectangle",
    "status": "available",
    "is_active": true,
    "position": { "x": 100, "y": 200, "rotation": 45 },
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
    "position": { "x": 100, "y": 200, "rotation": 45 },
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
  "position": { "x": 150, "y": 250, "rotation": 45 }
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

#### 🔄 PATCH /tables/:id/status
Update table status. **[Protected - Owner/Admin/Waiter]**

**Request:**
```json
{
  "status": "available"
}
```

**Status Options:**
- `available` - Table is free
- `occupied` - Table is in use
- `reserved` - Table is reserved
- `maintenance` - Table is under maintenance

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Table status updated successfully",
  "data": {
    "id": "uuid",
    "status": "available",
    "updated_at": "2025-12-17T10:00:00Z"
  }
}
```

---

#### 📍 PATCH /tables/:id/position
Update table position for floor plan. **[Protected - Owner/Admin]**

**Request:**
```json
{
  "position": {
    "x": 150,
    "y": 250,
    "rotation": 45
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Table position updated successfully",
  "data": {
    "id": "uuid",
    "position": { "x": 150, "y": 250, "rotation": 45 },
    "updated_at": "2025-12-17T10:00:00Z"
  }
}
```

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

#### 📱 GET /tables/:id/qr
Get QR code information for a specific table. **[Protected - Owner/Admin/Waiter]**

**Response:** `200 OK`
```json
{
  "success": true,
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

#### 📋 GET /tables/qr/all
Get all QR codes with pagination. **[Protected - Owner/Admin]**

**Query Parameters:**
```typescript
{
  page?: number;      // Default: 1
  limit?: number;     // Default: 10
  has_qr?: boolean;   // Filter by QR code status
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "tables": [
      {
        "id": "uuid",
        "table_number": "T-01",
        "qr_code_url": "https://...",
        "ordering_url": "http://...",
        "qr_code_generated_at": "2025-12-14T..."
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

#### 🔄 POST /tables/qr/batch-generate
Batch generate QR codes for multiple tables. **[Protected - Owner/Admin]**

**Request:**
```json
{
  "table_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "force_regenerate": false
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "QR codes generated for 3 tables",
  "data": {
    "generated_count": 3,
    "tables": [
      {
        "id": "uuid-1",
        "table_number": "T-01",
        "qr_code_url": "https://..."
      }
    ]
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

#### 📊 GET /tables/qr/stats
Get QR statistics.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total_active_tables": 18,
    "tables_with_qr": 5,
    "tables_without_qr": 13,
    "latest_qr_update": "2025-12-17T03:55:23.903Z"
  }
}
```

---

### Zone Layout Endpoints

#### 🗺️ GET /tables/layout?zone_id=zone-uuid
Get table layout for a specific zone.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "zone": {
      "id": "zone-uuid",
      "name": "VIP Area"
    },
    "tables": [
      {
        "id": "uuid",
        "table_number": "T-01",
        "type": "rectangle",
        "name": "T-01",
        "seats": 4,
        "status": "available",
        "position": { "x": 100, "y": 200, "rotation": 45 }
      }
    ]
  }
}
```

---

#### 🏢 GET /tables/zones
Get all available zones.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "zones": [
      { "id": "zone-uuid", "name": "VIP Area" },
      { "id": "zone-uuid-2", "name": "Outdoor" }
    ]
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
      "position": { "x": 150, "y": 250, "rotation": 45 }
    },
    {
      "table_id": "uuid-2",
      "position": { "x": 300, "y": 100, "rotation": 180 }
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
      { "id": "uuid-1", "position": { "x": 150, "y": 250, "rotation": 45 } },
      { "id": "uuid-2", "position": { "x": 300, "y": 100, "rotation": 180 } }
    ]
  }
}
```

---

### Zone Endpoints

#### 🏢 GET /zones
Get paginated list of zones with filtering.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `search` - Search by zone name
- `is_active` - Filter by active status
- `sort_by` (default: 'displayOrder') - Sort by field: 'name', 'displayOrder', 'createdAt', 'updatedAt'
- `sort_order` (default: 'asc') - Sort order: 'asc' or 'desc'

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "zones": [
      {
        "id": "zone-uuid",
        "name": "VIP Area",
        "description": "Premium seating area",
        "display_order": 1,
        "is_active": true,
        "table_count": 5,
        "created_at": "2025-12-14T...",
        "updated_at": "2025-12-14T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "total_pages": 1
    }
  }
}
```

---

#### 📊 GET /zones/stats
Get zone statistics for the current tenant.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total_zones": 5,
    "active_zones": 4,
    "inactive_zones": 1,
    "total_tables_in_zones": 25,
    "zones_with_tables": 4
  }
}
```

---

#### 🏢 GET /zones/{id}
Get a single zone by ID.

**Path Parameters:**
- `id` - Zone UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "zone": {
      "id": "zone-uuid",
      "name": "VIP Area",
      "description": "Premium seating area",
      "display_order": 1,
      "is_active": true,
      "table_count": 5,
      "created_at": "2025-12-14T...",
      "updated_at": "2025-12-14T..."
    }
  }
}
```

**Errors:**
- `404 Not Found` - Zone not found

---

#### ➕ POST /zones
Create a new zone. **[Protected - Owner/Admin only]**

**Request Body:**
```json
{
  "name": "Outdoor Patio",
  "description": "Outdoor seating area",
  "is_active": true
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "zone": {
      "id": "zone-uuid",
      "name": "Outdoor Patio",
      "description": "Outdoor seating area",
      "display_order": 2,
      "is_active": true,
      "created_at": "2025-12-14T...",
      "updated_at": "2025-12-14T..."
    },
    "message": "Zone created successfully"
  }
}
```

**Errors:**
- `409 Conflict` - Zone name already exists

---

#### 📝 PUT /zones/{id}
Update an existing zone. **[Protected - Owner/Admin only]**

**Path Parameters:**
- `id` - Zone UUID

**Request Body:**
```json
{
  "name": "VIP Lounge",
  "description": "Premium lounge area",
  "is_active": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "zone": {
      "id": "zone-uuid",
      "name": "VIP Lounge",
      "description": "Premium lounge area",
      "display_order": 1,
      "is_active": true,
      "updated_at": "2025-12-14T..."
    },
    "message": "Zone updated successfully"
  }
}
```

**Errors:**
- `404 Not Found` - Zone not found
- `409 Conflict` - Zone name already exists

---

#### 🗑️ DELETE /zones/{id}
Delete a zone (only if no tables are assigned). **[Protected - Owner/Admin only]**

**Path Parameters:**
- `id` - Zone UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Zone deleted successfully",
    "deleted_at": "2025-12-14T..."
  }
}
```

**Errors:**
- `404 Not Found` - Zone not found
- `409 Conflict` - Zone has tables assigned and cannot be deleted

---

### Tenant Endpoints

#### 🏢 GET /tenants
Get all tenants owned by the authenticated owner. **[Protected - Owner only]**

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by tenant name or slug
- `status` (optional): Filter by status (`active`, `inactive`, `suspended`)
- `subscription_tier` (optional): Filter by tier (`basic`, `premium`, `enterprise`)
- `sort_by` (default: 'createdAt') - Sort by field: 'name', 'slug', 'status', 'subscriptionTier', 'createdAt', 'updatedAt'
- `sort_order` (default: 'desc') - Sort order: 'asc' or 'desc'

**Response:** `200 OK`
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
        "image": "https://example.com/restaurant-logo.png",
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

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not an owner

---

#### 📊 GET /tenants/stats
Get summary statistics for all tenants owned by the authenticated owner. **[Protected - Owner only]**

**Response:** `200 OK`
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

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User is not an owner

---

#### 🏢 GET /tenants/current
Get detailed information about the current tenant. **[Protected - Owner, Admin, Waiter, Kitchen]**

**Access Control:**
- **Owners**: Can view any tenant they own
- **Staff (Admin, Waiter, Kitchen)**: Can view their assigned tenant only

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Pizza Palace",
    "slug": "pizza-palace",
    "address": "123 Main St, City",
    "image": "https://example.com/restaurant-logo.png",
    "status": "active",
    "subscription_tier": "premium",
    "settings": {
      "currency": "USD",
      "timezone": "America/New_York"
    },
    "owner": {
      "id": "owner-uuid",
      "full_name": "John Doe",
      "email": "owner@example.com"
    },
    "statistics": {
      "total_users": 15,
      "total_tables": 25,
      "total_zones": 3,
      "total_orders": 1250,
      "total_categories": 8,
      "total_menu_items": 45
    },
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-12-15T14:30:00Z"
  }
}
```

**Errors:**
- `404 Not Found` - Tenant does not exist

---

### Menu Endpoints

#### 📋 GET /menu
Get paginated list of menu items with filtering and search. **[Protected - QrTokenGuard for GUEST/CUSTOMER]**

**Query Parameters:**
```typescript
{
  page?: number;                    // Default: 1
  limit?: number;                   // Default: 10, Max: 100
  search?: string;                  // Search by menu item name
  category_id?: string;             // Filter by category UUID
  status?: 'available' | 'unavailable';  // Filter by status
  is_chef_recommendation?: boolean; // Filter chef recommendations
  sort_by?: 'createdAt' | 'name' | 'basePrice' | 'popularityScore';  // Default: 'createdAt'
  sort_order?: 'asc' | 'desc';      // Default: 'desc'
}
```

**Headers (for CUSTOMER role):**
```
x-qr-token: <qr_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "menu_items": [
      {
        "id": "uuid",
        "name": "Phở Bò",
        "description": "Vietnamese beef noodle soup",
        "base_price": 85000,
        "preparation_time": 15,
        "status": "available",
        "is_chef_recommendation": true,
        "allergen_info": "Contains beef, gluten",
        "popularity_score": 95,
        "category": {
          "id": "uuid",
          "name": "Món chính"
        },
        "images": [
          {
            "id": "uuid",
            "image_url": "https://example.com/pho.jpg",
            "display_order": 0
          }
        ],
        "review_count": 120,
        "order_count": 450,
        "created_at": "2025-12-17T10:00:00Z",
        "updated_at": "2025-12-17T10:00:00Z"
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

#### 📊 GET /menu/stats
Get menu statistics for the tenant. **[Protected - Owner/Admin/Waiter/Kitchen]**

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total_menu_items": 45,
    "available_items": 42,
    "unavailable_items": 3,
    "chef_recommendations": 8
  }
}
```

---

#### ➕ POST /menu
Create a new menu item. **[Protected - Owner/Admin only]**

**Request:**
```json
{
  "name": "Phở Bò",
  "description": "Vietnamese beef noodle soup",
  "base_price": 85000,
  "preparation_time": 15,
  "status": "available",
  "is_chef_recommendation": true,
  "allergen_info": "Contains beef, gluten",
  "category_id": "uuid",
  "image_urls": ["https://example.com/pho.jpg"]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Menu item created successfully",
  "data": {
    "id": "uuid",
    "name": "Phở Bò",
    "description": "Vietnamese beef noodle soup",
    "base_price": 85000,
    "preparation_time": 15,
    "status": "available",
    "is_chef_recommendation": true,
    "allergen_info": "Contains beef, gluten",
    "category": {
      "id": "uuid",
      "name": "Món chính"
    },
    "created_at": "2025-12-17T10:00:00Z",
    "updated_at": "2025-12-17T10:00:00Z"
  }
}
```

**Errors:**
- `409 Conflict` - Menu item name already exists

---

#### 📤 POST /menu/import
Import menu data from CSV/XLSX file. **[Protected - Owner/Admin only]**

**Request:** `multipart/form-data`
```
file: <CSV or XLSX file>
mode: 'create' | 'update' | 'upsert'  // Default: 'create'
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "created": 10,
    "updated": 5
  }
}
```

**Errors:**
- `400 Bad Request` - File missing or invalid format

---

#### 📥 GET /menu/export
Export menu data as CSV/XLSX file. **[Protected - Owner/Admin only]**

**Query Parameters:**
```typescript
{
  format?: 'csv' | 'xlsx';        // Default: 'csv'
  scope?: 'all' | 'category';     // Default: 'all'
  categoryId?: string;            // Required when scope='category'
  includeImages?: boolean;        // Default: false
  includeModifiers?: boolean;     // Default: false
  includeHidden?: boolean;        // Default: false
}
```

**Response:** File download (CSV or XLSX)

---

#### 👁️ GET /menu/{id}
Get detailed menu item information including modifiers. **[Protected - All roles]**

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Phở Bò",
    "description": "Vietnamese beef noodle soup",
    "base_price": 85000,
    "preparation_time": 15,
    "status": "available",
    "is_chef_recommendation": true,
    "allergen_info": "Contains beef, gluten",
    "nutritional_info": null,
    "popularity_score": 95,
    "category": {
      "id": "uuid",
      "name": "Món chính"
    },
    "images": [
      {
        "id": "uuid",
        "image_url": "https://example.com/pho.jpg",
        "display_order": 0
      }
    ],
    "modifier_groups": [
      {
        "id": "uuid",
        "name": "Size",
        "type": "single",
        "is_required": true,
        "min_selections": 1,
        "max_selections": 1,
        "display_order": 1,
        "modifiers": [
          {
            "id": "uuid",
            "name": "Nhỏ",
            "price_adjustment": 0,
            "is_available": true,
            "display_order": 1
          },
          {
            "id": "uuid",
            "name": "Lớn",
            "price_adjustment": 15000,
            "is_available": true,
            "display_order": 2
          }
        ]
      }
    ],
    "pairings": [
      {
        "id": "uuid",
        "name": "Chả giò",
        "base_price": 35000
      }
    ],
    "review_count": 120,
    "order_count": 450,
    "created_at": "2025-12-17T10:00:00Z",
    "updated_at": "2025-12-17T10:00:00Z"
  }
}
```

**Errors:**
- `404 Not Found` - Menu item not found

---

#### ✏️ PUT /menu/{id}
Update an existing menu item. **[Protected - Owner/Admin only]**

**Request:** (All fields optional)
```json
{
  "name": "Phở Bò Đặc Biệt",
  "base_price": 95000,
  "status": "available",
  "is_chef_recommendation": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Menu item updated successfully",
  "data": {
    "id": "uuid",
    "name": "Phở Bò Đặc Biệt",
    "base_price": 95000,
    "updated_at": "2025-12-17T11:00:00Z"
  }
}
```

**Errors:**
- `404 Not Found` - Menu item not found
- `409 Conflict` - Menu item name already exists

---

#### 🗑️ DELETE /menu/{id}
Delete a menu item (soft delete - sets status to unavailable). **[Protected - Owner/Admin only]**

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Menu item deleted successfully"
}
```

**Errors:**
- `404 Not Found` - Menu item not found
- `409 Conflict` - Cannot delete menu item with active orders

---

### Category Endpoints

#### 📊 GET /categories/stats
Get category statistics. **[Protected - Owner/Admin/Waiter]**

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total_categories": 8,
    "active_categories": 6,
    "inactive_categories": 2,
    "total_menu_items": 45
  }
}
```

---

#### 📂 GET /categories
Get paginated list of categories with filtering. **[Protected - QrTokenGuard for GUEST/CUSTOMER]**

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `search` - Search by category name
- `status` - Filter by status: 'active', 'inactive', 'all'
- `sort_by` (default: 'displayOrder') - Sort by: 'name', 'displayOrder', 'createdAt', 'updatedAt'
- `sort_order` (default: 'asc') - Sort order: 'asc' or 'desc'
- `include_item_count` (default: true) - Include menu item count per category

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "category-uuid",
        "name": "Pizza",
        "description": "Italian pizzas",
        "display_order": 1,
        "is_active": true,
        "menu_item_count": 12,
        "created_at": "2025-12-14T...",
        "updated_at": "2025-12-14T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 8,
      "total_pages": 1
    }
  }
}
```

---

#### ➕ POST /categories
Create a new category. **[Protected - Owner/Admin only]**

**Request Body:**
```json
{
  "name": "Beverages",
  "description": "Drinks and refreshments",
  "is_active": true
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "category-uuid",
      "name": "Beverages",
      "description": "Drinks and refreshments",
      "display_order": 3,
      "is_active": true,
      "created_at": "2025-12-14T...",
      "updated_at": "2025-12-14T..."
    },
    "message": "Category created successfully"
  }
}
```

---

#### 🔍 GET /categories/{id}
Get a specific category by ID. **[Protected - QrTokenGuard for GUEST/CUSTOMER]**

**Query Parameters:**
- `include_menu_items` (default: false) - Include associated menu items
- `include_item_count` (default: true) - Include total count of menu items

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "category-uuid",
      "name": "Pizza",
      "description": "Italian pizzas",
      "display_order": 1,
      "is_active": true,
      "menu_item_count": 12,
      "created_at": "2025-12-14T...",
      "updated_at": "2025-12-14T..."
    }
  }
}
```

---

#### 📝 PATCH /categories/{id}
Update an existing category. **[Protected - Owner/Admin only]**

**Request Body:**
```json
{
  "name": "Hot Beverages",
  "description": "Coffee, tea, and hot drinks",
  "is_active": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "category-uuid",
      "name": "Hot Beverages",
      "description": "Coffee, tea, and hot drinks",
      "display_order": 3,
      "is_active": true,
      "updated_at": "2025-12-14T..."
    },
    "message": "Category updated successfully"
  }
}
```

---

#### 🗑️ DELETE /categories/{id}
Delete a category (only if no menu items are associated). **[Protected - Owner/Admin only]**

**Query Parameters:**
- `force` (optional): Force delete even with associated menu items

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Category deleted successfully",
    "deleted_at": "2025-12-14T..."
  }
}
```

---

#### 🔄 PUT /categories/reorder
Reorder categories display order. **[Protected - Owner/Admin only]**

**Request Body:**
```json
{
  "categories": [
    { "id": "category-1", "display_order": 1 },
    { "id": "category-2", "display_order": 2 },
    { "id": "category-3", "display_order": 3 }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Category order updated successfully",
    "updated_count": 3
  }
}
```

---

#### 🔄 PATCH /categories/{id}/status
Toggle category active status. **[Protected - Owner/Admin only]**

**Request Body:**
```json
{
  "is_active": false
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "category-uuid",
      "is_active": false,
      "updated_at": "2025-12-14T..."
    },
    "message": "Category status updated successfully"
  }
}
```

---

### Modifier Group Endpoints

#### 🛠️ GET /modifier-groups
Get paginated list of modifier groups. **[Protected - QrTokenGuard for GUEST/CUSTOMER]**

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `search` - Search by group name
- `sort_by` (default: 'displayOrder') - Sort by: 'name', 'displayOrder', 'createdAt', 'updatedAt'
- `sort_order` (default: 'asc') - Sort order: 'asc' or 'desc'
- `include_usage_count` (default: true) - Include usage count (used by menu items)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "modifier_groups": [
      {
        "id": "group-uuid",
        "name": "Pizza Toppings",
        "description": "Extra toppings for pizza",
        "type": "multiple",
        "is_required": false,
        "min_selections": 0,
        "max_selections": 3,
        "display_order": 1,
        "modifier_count": 8,
        "created_at": "2025-12-14T...",
        "updated_at": "2025-12-14T..."
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

---

#### ➕ POST /modifier-groups
Create a new modifier group. **[Protected - Owner/Admin only]**

**Request Body:**
```json
{
  "name": "Spice Level",
  "description": "Choose your spice preference",
  "type": "single",
  "is_required": true,
  "min_selections": 1,
  "max_selections": 1
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "modifier_group": {
      "id": "group-uuid",
      "name": "Spice Level",
      "description": "Choose your spice preference",
      "type": "single",
      "is_required": true,
      "min_selections": 1,
      "max_selections": 1,
      "display_order": 2,
      "created_at": "2025-12-14T...",
      "updated_at": "2025-12-14T..."
    },
    "message": "Modifier group created successfully"
  }
}
```

---

#### 🔍 GET /modifier-groups/{group_id}
Get a specific modifier group by ID with its modifiers. **[Protected - QrTokenGuard for GUEST/CUSTOMER]**

**Query Parameters:**
- `include_modifiers` (default: true) - Include list of modifiers

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "modifier_group": {
      "id": "group-uuid",
      "name": "Pizza Toppings",
      "description": "Extra toppings for pizza",
      "type": "multiple",
      "is_required": false,
      "min_selections": 0,
      "max_selections": 3,
      "display_order": 1,
      "created_at": "2025-12-14T...",
      "updated_at": "2025-12-14T...",
      "modifiers": [
        {
          "id": "modifier-uuid",
          "name": "Extra Cheese",
          "description": "Additional cheese topping",
          "price": 2.50,
          "display_order": 1,
          "is_active": true
        }
      ]
    }
  }
}
```

---

#### 📝 PATCH /modifier-groups/{group_id}
Update a modifier group. **[Protected - Owner/Admin only]**

**Request Body:**
```json
{
  "name": "Heat Level",
  "description": "Select your preferred heat level",
  "min_selections": 1,
  "max_selections": 1
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "modifier_group": {
      "id": "group-uuid",
      "name": "Heat Level",
      "description": "Select your preferred heat level",
      "min_selections": 1,
      "max_selections": 1,
      "updated_at": "2025-12-14T..."
    },
    "message": "Modifier group updated successfully"
  }
}
```

---

#### 🗑️ DELETE /modifier-groups/{group_id}
Delete a modifier group (only if no menu items are associated). **[Protected - Owner/Admin only]**

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Modifier group deleted successfully",
    "deleted_at": "2025-12-14T..."
  }
}
```

---

#### 🔄 PUT /modifier-groups/reorder
Reorder modifier groups display order. **[Protected - Owner/Admin only]**

**Request Body:**
```json
{
  "modifier_groups": [
    { "id": "group-1", "display_order": 1 },
    { "id": "group-2", "display_order": 2 }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Modifier groups reordered successfully",
    "updated_count": 2
  }
}
```

---

### Individual Modifier Endpoints

#### 🛠️ GET /modifier-groups/{group_id}/modifiers
Get modifiers within a specific group. **[Protected - QrTokenGuard for GUEST/CUSTOMER]**

**Query Parameters:**
- `include_unavailable` (default: true) - Include unavailable modifiers
- `sort_by` (default: 'display_order') - Sort by: 'name', 'display_order', 'price_adjustment', 'created_at'
- `sort_order` (default: 'asc') - Sort order: 'asc' or 'desc'

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "modifiers": [
      {
        "id": "modifier-uuid",
        "name": "Extra Cheese",
        "description": "Additional cheese topping",
        "price": 2.50,
        "display_order": 1,
        "is_active": true,
        "created_at": "2025-12-14T...",
        "updated_at": "2025-12-14T..."
      }
    ]
  }
}
```

---

#### ➕ POST /modifier-groups/{group_id}/modifiers
Create a new modifier in a group. **[Protected - Owner/Admin only]**

**Request Body:**
```json
{
  "name": "Mild",
  "description": "Mild spice level",
  "price": 0.00,
  "is_active": true
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "modifier": {
      "id": "modifier-uuid",
      "name": "Mild",
      "description": "Mild spice level",
      "price": 0.00,
      "display_order": 1,
      "is_active": true,
      "created_at": "2025-12-14T...",
      "updated_at": "2025-12-14T..."
    },
    "message": "Modifier created successfully"
  }
}
```

---

#### 📝 PATCH /modifiers/{modifier_id}
Update a modifier. **[Protected - Owner/Admin only]**

**Request Body:**
```json
{
  "name": "Medium Spice",
  "description": "Medium heat level",
  "price": 0.50
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "modifier": {
      "id": "modifier-uuid",
      "name": "Medium Spice",
      "description": "Medium heat level",
      "price": 0.50,
      "updated_at": "2025-12-14T..."
    },
    "message": "Modifier updated successfully"
  }
}
```

---

#### 🗑️ DELETE /modifiers/{modifier_id}
Delete a modifier. **[Protected - Owner/Admin only]**

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Modifier deleted successfully"
  }
}
```

---

#### 🔄 PUT /modifier-groups/{group_id}/modifiers/reorder
Reorder modifiers within a group. **[Protected - Owner/Admin only]**

**Request Body:**
```json
{
  "modifiers": [
    { "id": "mod-1", "display_order": 1 },
    { "id": "mod-2", "display_order": 2 }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Modifiers reordered successfully",
    "updated_count": 2
  }
}
```

---

### Additional Documentation

For complete API documentation with all endpoints, see:
- Frontend API Documentation: `/frontend/API_DOC_FOR_TABLES/TABLES_API_DOCUMENTATION.md`
- Database Design: `/docs/database/DATABASE_DESIGN.dbml`
- Database Description: `/docs/database/DATABASE_DESCRIPTION.md`

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
- **tenants** - Tenant management for owners
- **tables** - Table management and QR codes
- **zones** - Zone management endpoints
- **categories** - Category management endpoints
- **modifiers** - Modifier groups and modifiers
- **menu** - Menu item management
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
  .addTag('tenants', 'Tenant management endpoints for owners')
  .addTag('tables', 'Table management and QR code endpoints')
  .addTag('zones', 'Zone management endpoints')
  .addTag('categories', 'Category management endpoints')
  .addTag('modifiers', 'Modifier groups and modifiers management endpoints')
  .addTag('menu', 'Menu item management endpoints')
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
│   │   ├── tenant/           # Tenant module
│   │   │   ├── dto/          # Tenant DTOs
│   │   │   ├── tenant.controller.ts
│   │   │   ├── tenant.service.ts
│   │   │   └── tenant.module.ts
│   │   │
│   │   ├── tables/           # Tables module
│   │   │   ├── dto/          # Table DTOs
│   │   │   ├── tables.controller.ts
│   │   │   ├── tables.service.ts
│   │   │   └── tables.module.ts
│   │   │
│   │   ├── zones/            # Zones module
│   │   │   ├── dto/          # Zone DTOs
│   │   │   ├── zones.controller.ts
│   │   │   ├── zones.service.ts
│   │   │   └── zones.module.ts
│   │   │
│   │   ├── categories/       # Categories module
│   │   │   ├── dto/          # Category DTOs
│   │   │   ├── categories.controller.ts
│   │   │   ├── categories.service.ts
│   │   │   └── categories.module.ts
│   │   │
│   │   ├── modifiers/        # Modifiers module
│   │   │   ├── dto/          # Modifier DTOs
│   │   │   ├── modifiers.controller.ts
│   │   │   ├── modifiers.service.ts
│   │   │   └── modifiers.module.ts
│   │   │
│   │   └── user/             # User module
│   │       ├── user.controller.ts
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
- **TablesService** - Table and QR code management
- **CategoriesService** - Category CRUD operations and ordering
- **ModifiersService** - Modifier groups and modifiers management

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

**Available Roles:**
- `super_admin` - Full system access
- `owner` - Can own and manage multiple restaurant tenants
- `admin` - Full access within a single tenant
- `waiter` - Table and order management
- `kitchen_staff` - Kitchen operations
- `customer` - Customer ordering

**Owner Multi-Tenancy:**
Owners have `tenantId = NULL` in the database and can own multiple restaurant tenants. When accessing tenant-specific endpoints, owners must specify which tenant they're working with using the `x-tenant-id` header:

```bash
# Example: Owner accessing tables for a specific tenant
curl -H "Authorization: Bearer <owner_jwt>" \
     -H "x-tenant-id: <tenant_uuid>" \
     http://localhost:3000/tables
```

The `TenantOwnershipGuard` validates that the owner actually owns the specified tenant before allowing access.

✅ **Protected Endpoints**
- JWT validation on protected routes
- User status checking (active/inactive)
- Email verification requirements (login blocked until verified)
- Tenant ownership validation for owners

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

*Last Updated: December 19, 2025*
