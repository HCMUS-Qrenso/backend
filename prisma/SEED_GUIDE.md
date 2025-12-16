# Database Seeding Guide

This guide explains how to use the database seed script to populate your Smart Restaurant database with sample data.

## Overview

The seed script (`prisma/seed.ts`) creates a complete test dataset including:
- User accounts (super admin, owner, staff, customers)
- Two sample restaurant tenants with complete data
- Menu categories and items (Vietnamese-first naming)
- Tables with QR codes across multiple zones
- Modifiers and customization options
- Sample orders for both tenants

## Running the Seed

### Method 1: Using npm script (Recommended)
```bash
npm run prisma:seed
```

### Method 2: Using Prisma CLI
```bash
npx prisma db seed
```

### Method 3: Direct execution
```bash
npx ts-node prisma/seed.ts
```

## What Gets Created

### 👤 Users (15 total)

#### Super Admin (1)
- **Email**: `admin@smartrestaurant.com`
- **Password**: `Admin@123`
- **Role**: `super_admin`
- **Purpose**: System-wide administration

#### Restaurant Owner (1)
- **Email**: `owner@joes-diner.com`
- **Password**: `Owner@123`
- **Role**: `owner`
- **Tenants**: Owns both Joe's Vietnamese Diner and Pho & More Vietnamese Kitchen

#### Staff (10 total - 5 per tenant)

**Tenant 1 - Joe's Vietnamese Diner:**
1. **Admin**
   - Email: `admin@joes-diner.com`
   - Password: `Admin@123`
   - Role: `admin`

2. **Waiter 1**
   - Email: `waiter1@joes-diner.com`
   - Password: `Waiter@123`
   - Role: `waiter`

3. **Waiter 2**
   - Email: `waiter2@joes-diner.com`
   - Password: `Waiter@123`
   - Role: `waiter`

4. **Chef 1**
   - Email: `chef1@joes-diner.com`
   - Password: `Chef@123`
   - Role: `kitchen_staff`

5. **Chef 2**
   - Email: `chef2@joes-diner.com`
   - Password: `Chef@123`
   - Role: `kitchen_staff`

**Tenant 2 - Pho & More Vietnamese Kitchen:**
1. **Admin**
   - Email: `admin@pho-and-more.com`
   - Password: `Admin@123`
   - Role: `admin`

2. **Waiter 1**
   - Email: `waiter1@pho-and-more.com`
   - Password: `Waiter@123`
   - Role: `waiter`

3. **Waiter 2**
   - Email: `waiter2@pho-and-more.com`
   - Password: `Waiter@123`
   - Role: `waiter`

4. **Chef 1**
   - Email: `chef1@pho-and-more.com`
   - Password: `Chef@123`
   - Role: `kitchen_staff`

5. **Chef 2**
   - Email: `chef2@pho-and-more.com`
   - Password: `Chef@123`
   - Role: `kitchen_staff`

#### Customers (2)
1. **John Doe**
   - Email: `john.doe@example.com`
   - Password: `Customer@123`
   - Role: `customer`

2. **Jane Smith**
   - Email: `jane.smith@example.com`
   - Password: `Customer@123`
   - Role: `customer`

### 🏪 Restaurant Tenants (2)

#### Tenant 1: Joe's Vietnamese Diner
- **Address**: 227 Nguyen Van Cu, District 5, Ho Chi Minh City
- **Slug**: `joes-diner`
- **Subscription**: `premium`
- **Currency**: VND
- **Tax Rate**: 10%
- **Operating Hours**: Monday-Saturday 9:00-22:00, Sunday 10:00-21:00

#### Tenant 2: Pho & More Vietnamese Kitchen
- **Address**: 458 Le Van Sy, District 3, Ho Chi Minh City
- **Slug**: `pho-and-more`
- **Subscription**: `business`
- **Currency**: VND
- **Tax Rate**: 8%
- **Operating Hours**: Monday-Sunday 8:00-21:00, Friday-Saturday 8:00-22:00

### 📁 Menu Categories (5 per tenant)

Both tenants have identical category structures with Vietnamese-first naming:

1. **Khai Vị (Appetizers)** - Vietnamese starters
2. **Món Chính (Main Dishes)** - Signature Vietnamese main courses
3. **Mì & Phở (Noodles & Soup)** - Traditional Vietnamese noodle soups
4. **Đồ Uống (Beverages)** - Drinks and Vietnamese coffee
5. **Tráng Miệng (Desserts)** - Sweet treats

### 🍽️ Menu Items (12 per tenant)

#### Khai Vị (Appetizers)
- **Gỏi Cuốn (Fresh Spring Rolls)** - 45,000/40,000 VND ⭐ Chef's Recommendation
- **Chả Giò (Crispy Spring Rolls)** - 50,000/55,000 VND
- **Bánh Xèo (Vietnamese Pancake)** - 55,000 VND (Tenant 2 only)

#### Món Chính (Main Dishes)
- **Cơm Tấm Sườn Nướng (Grilled Pork with Broken Rice)** - 75,000/70,000 VND ⭐ Chef's Recommendation
- **Gà Xào Sả Ớt (Lemongrass Chicken)** - 70,000 VND (Tenant 1)
- **Cơm Tấm Bì Chả (Broken Rice with Pork)** - 65,000 VND (Tenant 2)

#### Mì & Phở (Noodles & Soup)
- **Phở Bò (Beef Noodle Soup)** - 65,000/70,000 VND ⭐ Chef's Recommendation
- **Bún Bò Huế (Hue Spicy Beef Noodle Soup)** - 70,000 VND (Tenant 1)
- **Phở Gà (Chicken Noodle Soup)** - 65,000 VND (Tenant 2)
- **Hủ Tiếu Nam Vang (Phnom Penh Noodle Soup)** - 60,000 VND (Tenant 2)

#### Đồ Uống (Beverages)
- **Cà Phê Sữa Đá (Vietnamese Iced Coffee)** - 30,000/28,000 VND
- **Nước Dừa Tươi (Fresh Coconut Water)** - 25,000 VND (Tenant 1)
- **Nước Chanh Tươi (Fresh Lime Juice)** - 20,000 VND (Tenant 2)
- **Nước Mía (Sugarcane Juice)** - 22,000 VND (Tenant 2)

#### Tráng Miệng (Desserts)
- **Chè Thập Cẩm (Vietnamese Sweet Soup)** - 35,000 VND (Tenant 1)
- **Bánh Flan (Vietnamese Caramel Custard)** - 30,000 VND (Tenant 1)
- **Chè Đậu Xanh (Mung Bean Dessert)** - 30,000 VND (Tenant 2)
- **Rau Câu Dừa (Coconut Jelly)** - 25,000 VND (Tenant 2)

### ⚙️ Modifiers (2 groups per tenant)

#### Kích Cỡ (Size) - Single Choice
- **Nhỏ (Small)** (-10,000/-8,000 VND)
- **Vừa (Regular)** (±0 VND)
- **Lớn (Large)** (+15,000/+12,000 VND)

#### Thêm/Topping (Extras) - Multiple Choice
- **Thêm Thịt (Extra Meat)** (+20,000/+25,000 VND)
- **Thêm Rau (Extra Vegetables)** (+10,000 VND)
- **Thêm Nước Sốt (Extra Sauce)** (+5,000 VND)
- **Thêm Bánh Phở (Extra Noodles)** (+15,000 VND) (Tenant 2)
- **Thêm Rau Thơm (Extra Herbs)** (+8,000 VND) (Tenant 2)

*Note: Modifiers are linked to Pho and noodle soup items*

### 🏢 Zones (3 per tenant)

#### Joe's Vietnamese Diner
1. **Tầng 1 (Ground Floor)** - Main dining area (8 tables)
2. **Tầng 2 (Second Floor)** - Second floor dining area (4 tables)
3. **Khu VIP (VIP Area)** - VIP private dining area (2 tables)
4. **Khu Ngoài Trời (Outdoor)** - Outdoor seating area (4 tables)

#### Pho & More Vietnamese Kitchen
1. **Tầng Trệt (Main Floor)** - Main dining area (7 tables)
2. **Sân Thượng (Rooftop)** - Rooftop dining area with city view (4 tables)
3. **Phòng Riêng (Private Rooms)** - Private dining rooms (3 tables)

### 🪑 Tables (14 per tenant)

#### Joe's Vietnamese Diner (16 tables total)
**Ground Floor (Tầng 1):**
- T01: 2 seats, Circle
- T02: 4 seats, Rectangle
- T03: 4 seats, Rectangle
- T04: 6 seats, Oval
- T05: 8 seats, Rectangle
- T06: 4 seats, Rectangle
- T07: 2 seats, Circle
- T08: 2 seats, Circle

**Second Floor (Tầng 2):**
- T09: 6 seats, Oval
- T10: 6 seats, Rectangle
- T11: 4 seats, Rectangle
- T12: 4 seats, Rectangle

**VIP Area (Khu VIP):**
- VIP-01: 10 seats, Rectangle
- VIP-02: 8 seats, Oval

**Outdoor Area (Khu ngoài trời):**
- OUT-01: 4 seats, Rectangle
- OUT-02: 4 seats, Rectangle
- OUT-03: 2 seats, Circle
- OUT-04: 2 seats, Circle

#### Pho & More Vietnamese Kitchen (14 tables total)
**Main Floor (Tầng Trệt):**
- M1: 2 seats, Circle
- M2: 4 seats, Rectangle
- M3: 4 seats, Rectangle
- M4: 6 seats, Oval
- M5: 6 seats, Rectangle
- M6: 4 seats, Rectangle
- M7: 2 seats, Circle

**Rooftop (Sân Thượng):**
- R1: 4 seats, Rectangle
- R2: 4 seats, Rectangle
- R3: 6 seats, Oval
- R4: 8 seats, Rectangle

**Private Rooms (Phòng Riêng):**
- P1: 10 seats, Rectangle
- P2: 8 seats, Oval
- P3: 12 seats, Rectangle

### 📋 Sample Orders (2 total)

#### Order 1 - Joe's Vietnamese Diner
- **Table**: T02 (Ground Floor)
- **Customer**: John Doe
- **Waiter**: Mike Chen (waiter1@joes-diner.com)
- **Status**: Pending
- **Items**:
  1. Phở Bò - 65,000 VND
  2. Gỏi Cuốn - 45,000 VND
  3. Cà Phê Sữa Đá - 30,000 VND
- **Subtotal**: 140,000 VND
- **Tax (10%)**: 14,000 VND
- **Total**: 154,000 VND
- **Special Instructions**: "No onions, please"

#### Order 2 - Pho & More Vietnamese Kitchen
- **Table**: M2 (Main Floor)
- **Customer**: Jane Smith
- **Waiter**: Tran Thi Binh (waiter1@pho-and-more.com)
- **Status**: Pending
- **Items**:
  1. Phở Bò - 70,000 VND
  2. Gỏi Cuốn - 40,000 VND
  3. Cà Phê Sữa Đá - 28,000 VND × 2
- **Subtotal**: 158,000 VND
- **Tax (8%)**: 12,640 VND
- **Total**: 170,640 VND
- **Special Instructions**: "Extra herbs, please"

### ⚙️ Settings (3 per tenant)

#### Joe's Vietnamese Diner
1. **payment_methods**: `["zalopay", "momo", "vnpay", "cash"]`
2. **order_auto_acceptance**: `false`
3. **tax_rate**: `0.1`

#### Pho & More Vietnamese Kitchen
1. **payment_methods**: `["momo", "vnpay", "cash", "card"]`
2. **order_auto_acceptance**: `true`
3. **tax_rate**: `0.08`

## Resetting the Database

To clear all data and reseed:

```bash
# Reset and reseed in one command
npx prisma migrate reset

# Or manually:
npx prisma migrate reset --skip-seed  # Reset without seeding
npm run prisma:seed                    # Then seed
```

## Customizing the Seed Data

Edit `prisma/seed.ts` to:
- Add more users, categories, or menu items
- Change default passwords (remember to update this README)
- Modify restaurant settings
- Create additional tenants or sample orders
- Adjust Vietnamese naming conventions

## Security Notes

⚠️ **Important**:
- Default passwords are simple for testing purposes only
- Change all passwords before deploying to production
- The seed script includes a safety check that cleans existing data
- Never run seed scripts in production without reviewing the data first
- Both tenants demonstrate multi-tenant architecture capabilities

## Viewing Seeded Data

### Using Prisma Studio
```bash
npm run prisma:studio
```
Then open http://localhost:5555 in your browser.

### Using Database Client
Connect to PostgreSQL and query:
```sql
-- View all users by tenant
SELECT u.email, u.role, u.full_name, t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
ORDER BY t.name, u.role;

-- View menu items by tenant and category
SELECT t.name as tenant, c.name as category, m.name, m.base_price
FROM menu_items m
JOIN categories c ON m.category_id = c.id
JOIN tenants t ON m.tenant_id = t.id
ORDER BY t.name, c.display_order, m.name;

-- View current orders by tenant
SELECT t.name as tenant, o.order_number, u.full_name as customer, o.status, o.total_amount
FROM orders o
LEFT JOIN users u ON o.customer_id = u.id
JOIN tenants t ON o.tenant_id = t.id
ORDER BY t.name, o.created_at DESC;

-- View tables by tenant and zone
SELECT t.name as tenant, z.name as zone, tb.table_number, tb.capacity, tb.shape
FROM tables tb
JOIN zones z ON tb.zone_id = z.id
JOIN tenants t ON tb.tenant_id = t.id
ORDER BY t.name, z.display_order, tb.table_number;
```

## Multi-Tenant Architecture

The seed data demonstrates a complete multi-tenant setup:

- **Owner Account**: One owner can manage multiple restaurants
- **Isolated Data**: Each tenant has separate staff, menu, tables, and settings
- **Shared Platform**: Common infrastructure with tenant-specific customization
- **Scalable Model**: Easy to add new tenants without code changes

## Testing the Multi-Tenant Setup

After seeding, you can test:

1. **Login as Owner**: Access both tenants' dashboards
2. **Staff Isolation**: Each tenant's staff can only access their restaurant
3. **Menu Customization**: Different menus and pricing per tenant
4. **Settings Variation**: Different payment methods and tax rates
5. **Order Management**: Separate order flows per tenant

## Troubleshooting

### Error: "client password must be a string"
- Check that `DATABASE_URL` is properly set in `.env`
- Ensure dotenv is loading correctly
- Verify PostgreSQL is running

### Error: "Unique constraint failed"
- The database may already have data
- Run `npx prisma migrate reset` to clear it

### Error: "Cannot find module 'bcrypt'"
```bash
npm install bcrypt @types/bcrypt
```

### Seed script doesn't run automatically
Add this to `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

### Vietnamese characters not displaying correctly
- Ensure your database encoding supports UTF-8
- Check terminal/console font supports Vietnamese characters
- The seed data uses proper Vietnamese diacritics

## Next Steps

After seeding:
1. ✅ Verify data in Prisma Studio (check both tenants)
2. ✅ Test login with provided credentials for each tenant
3. ✅ Create API endpoints with tenant isolation
4. ✅ Build frontend with multi-tenant support
5. ✅ Add authentication and authorization per tenant
6. ✅ Test order flows for both restaurants
7. ✅ Implement tenant-specific settings and customization
8. ✅ Add tenant management features for owners