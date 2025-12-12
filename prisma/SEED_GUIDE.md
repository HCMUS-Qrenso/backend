# Database Seeding Guide

This guide explains how to use the database seed script to populate your Smart Restaurant database with sample data.

## Overview

The seed script (`prisma/seed.ts`) creates a complete test dataset including:
- User accounts (super admin, owner, staff, customers)
- A sample restaurant tenant
- Menu categories and items
- Tables with QR codes
- Modifiers and customization options
- A sample order

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

### 👤 Users (9 total)

#### Super Admin (1)
- **Email**: `admin@smartrestaurant.com`
- **Password**: `Admin@123`
- **Role**: `super_admin`
- **Purpose**: System-wide administration

#### Restaurant Owner (1)
- **Email**: `owner@joes-diner.com`
- **Password**: `Owner@123`
- **Role**: `owner`
- **Tenant**: Joe's Vietnamese Diner

#### Staff (5)
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

#### Customers (2)
1. **John Doe**
   - Email: `john.doe@example.com`
   - Password: `Customer@123`
   - Role: `customer`

2. **Jane Smith**
   - Email: `jane.smith@example.com`
   - Password: `Customer@123`
   - Role: `customer`

### 🏪 Restaurant Tenant (1)

**Joe's Vietnamese Diner**
- Address: 227 Nguyen Van Cu, District 5, Ho Chi Minh City
- Slug: `joes-diner`
- Subscription: `premium`
- Currency: VND
- Tax Rate: 10%
- Operating Hours: Monday-Saturday 9:00-22:00, Sunday 10:00-21:00

### 📁 Menu Categories (5)

1. Appetizers
2. Main Dishes
3. Noodles & Soup
4. Beverages
5. Desserts

### 🍽️ Menu Items (10)

#### Appetizers
- **Fresh Spring Rolls (Gỏi Cuốn)** - 45,000 VND ⭐ Chef's Recommendation
- **Crispy Spring Rolls (Chả Giò)** - 50,000 VND

#### Main Dishes
- **Grilled Pork with Broken Rice (Cơm Tấm)** - 75,000 VND ⭐ Chef's Recommendation
- **Lemongrass Chicken (Gà Xào Sả Ớt)** - 70,000 VND

#### Noodles & Soup
- **Beef Pho (Phở Bò)** - 65,000 VND ⭐ Chef's Recommendation
- **Hue Spicy Beef Noodle Soup (Bún Bò Huế)** - 70,000 VND

#### Beverages
- **Vietnamese Iced Coffee (Cà Phê Sữa Đá)** - 30,000 VND
- **Fresh Coconut Water (Nước Dừa)** - 25,000 VND

#### Desserts
- **Vietnamese Sweet Soup (Chè)** - 35,000 VND
- **Flan (Bánh Flan)** - 30,000 VND

### ⚙️ Modifiers

#### Size (Single Choice)
- Small (-10,000 VND)
- Regular (±0 VND)
- Large (+15,000 VND)

#### Extras (Multiple Choice)
- Extra Meat (+20,000 VND)
- Extra Vegetables (+10,000 VND)
- Extra Sauce (+5,000 VND)

*Note: Modifiers are linked to Pho and Bun Bo Hue items*

### 🪑 Tables (5)

| Table | Capacity | Floor | Shape | Status |
|-------|----------|-------|-------|--------|
| T01 | 2 | Ground Floor | Circle | Available |
| T02 | 4 | Ground Floor | Rectangle | Available |
| T03 | 4 | Ground Floor | Rectangle | Available |
| T04 | 6 | Ground Floor | Oval | Available |
| T05 | 8 | Ground Floor | Rectangle | Available |

All tables have QR codes generated.

### 📋 Sample Order (1)

- **Table**: T02
- **Customer**: John Doe
- **Waiter**: Mike Chen (waiter1)
- **Status**: Pending
- **Items**:
  1. Beef Pho - 65,000 VND
  2. Fresh Spring Rolls - 45,000 VND
  3. Vietnamese Iced Coffee - 30,000 VND
- **Subtotal**: 140,000 VND
- **Tax (10%)**: 14,000 VND
- **Total**: 154,000 VND
- **Special Instructions**: "No onions, please"

### ⚙️ Settings (3)

1. **payment_methods**: `["zalopay", "momo", "vnpay", "cash"]`
2. **order_auto_acceptance**: `false`
3. **tax_rate**: `0.1`

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
- Create additional sample orders

## Security Notes

⚠️ **Important**: 
- Default passwords are simple for testing purposes only
- Change all passwords before deploying to production
- The seed script includes a safety check that cleans existing data
- Never run seed scripts in production without reviewing the data first

## Viewing Seeded Data

### Using Prisma Studio
```bash
npm run prisma:studio
```
Then open http://localhost:5555 in your browser.

### Using Database Client
Connect to PostgreSQL and query:
```sql
-- View all users
SELECT email, role, full_name FROM users;

-- View menu items by category
SELECT c.name as category, m.name, m.base_price 
FROM menu_items m 
JOIN categories c ON m.category_id = c.id
ORDER BY c.display_order, m.name;

-- View current orders
SELECT o.order_number, u.full_name as customer, o.status, o.total_amount
FROM orders o
LEFT JOIN users u ON o.customer_id = u.id;
```

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

## Next Steps

After seeding:
1. ✅ Verify data in Prisma Studio
2. ✅ Test login with provided credentials
3. ✅ Create API endpoints to interact with the data
4. ✅ Build your frontend to consume the API
5. ✅ Add authentication and authorization