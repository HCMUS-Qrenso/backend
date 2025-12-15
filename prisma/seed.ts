import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// Load environment variables
config();

// Initialize Prisma Client with Prisma 7 adapter
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning existing data...');
  await prisma.orderItemModifier.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.menuItemModifierGroup.deleteMany();
  await prisma.menuItemPairing.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.menuItemImage.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.dailySalesSummary.deleteMany();
  await prisma.menuItemAnalytics.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userOAuthProvider.deleteMany();
  await prisma.userVerificationToken.deleteMany();
  await prisma.user.deleteMany({ where: { role: { not: 'super_admin' } } });
  await prisma.tenant.deleteMany();
  console.log('✓ Cleaned existing data\n');

  // 1. Create Super Admin
  console.log('👤 Creating Super Admin...');
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@smartrestaurant.com',
      passwordHash: await bcrypt.hash('Admin@123', 10),
      fullName: 'System Administrator',
      role: 'super_admin',
      emailVerified: true,
      status: 'active',
    },
  });
  console.log(`✓ Created Super Admin: ${superAdmin.email}\n`);

  // 2. Create Restaurant Owner
  console.log('👤 Creating Restaurant Owner...');
  const owner = await prisma.user.create({
    data: {
      email: 'owner@joes-diner.com',
      passwordHash: await bcrypt.hash('Owner@123', 10),
      fullName: 'Joe Smith',
      phone: '+84901234567',
      role: 'owner',
      emailVerified: true,
      status: 'active',
    },
  });
  console.log(`✓ Created Owner: ${owner.email}\n`);

  // 3. Create Tenant (Restaurant)
  console.log('🏪 Creating Restaurant Tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      name: "Joe's Vietnamese Diner",
      address: '227 Nguyen Van Cu, District 5, Ho Chi Minh City',
      slug: 'joes-diner',
      ownerId: owner.id,
      subscriptionTier: 'premium',
      status: 'active',
      settings: {
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        tax_rate: 0.1,
        operating_hours: {
          monday: '09:00-22:00',
          tuesday: '09:00-22:00',
          wednesday: '09:00-22:00',
          thursday: '09:00-22:00',
          friday: '09:00-23:00',
          saturday: '09:00-23:00',
          sunday: '10:00-21:00',
        },
      },
    },
  });
  console.log(`✓ Created Tenant: ${tenant.name}\n`);

  // Note: Owner's tenantId remains NULL to allow ownership of multiple tenants

  // 4. Create Staff Users
  console.log('👥 Creating Staff Users...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@joes-diner.com',
      passwordHash: await bcrypt.hash('Admin@123', 10),
      fullName: 'Sarah Johnson',
      phone: '+84901234568',
      role: 'admin',
      tenantId: tenant.id,
      emailVerified: true,
      status: 'active',
    },
  });

  const waiter1 = await prisma.user.create({
    data: {
      email: 'waiter1@joes-diner.com',
      passwordHash: await bcrypt.hash('Waiter@123', 10),
      fullName: 'Mike Chen',
      phone: '+84901234569',
      role: 'waiter',
      tenantId: tenant.id,
      emailVerified: true,
      status: 'active',
    },
  });

  const waiter2 = await prisma.user.create({
    data: {
      email: 'waiter2@joes-diner.com',
      passwordHash: await bcrypt.hash('Waiter@123', 10),
      fullName: 'Lisa Nguyen',
      phone: '+84901234570',
      role: 'waiter',
      tenantId: tenant.id,
      emailVerified: true,
      status: 'active',
    },
  });

  const kitchenStaff1 = await prisma.user.create({
    data: {
      email: 'chef1@joes-diner.com',
      passwordHash: await bcrypt.hash('Chef@123', 10),
      fullName: 'David Tran',
      phone: '+84901234571',
      role: 'kitchen_staff',
      tenantId: tenant.id,
      emailVerified: true,
      status: 'active',
    },
  });

  const kitchenStaff2 = await prisma.user.create({
    data: {
      email: 'chef2@joes-diner.com',
      passwordHash: await bcrypt.hash('Chef@123', 10),
      fullName: 'Emily Pham',
      phone: '+84901234572',
      role: 'kitchen_staff',
      tenantId: tenant.id,
      emailVerified: true,
      status: 'active',
    },
  });

  console.log('✓ Created 5 staff members\n');

  // 5. Create Customers
  console.log('👤 Creating Customers...');
  const customer1 = await prisma.user.create({
    data: {
      email: 'john.doe@example.com',
      passwordHash: await bcrypt.hash('Customer@123', 10),
      fullName: 'John Doe',
      phone: '+84901234573',
      role: 'customer',
      emailVerified: true,
      status: 'active',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'jane.smith@example.com',
      passwordHash: await bcrypt.hash('Customer@123', 10),
      fullName: 'Jane Smith',
      phone: '+84901234574',
      role: 'customer',
      emailVerified: true,
      status: 'active',
    },
  });

  console.log('✓ Created 2 customers\n');

  // 6. Create Categories
  console.log('📁 Creating Menu Categories...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Appetizers',
        description:
          'Start your meal with these delicious Vietnamese appetizers',
        displayOrder: 1,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Main Dishes',
        description: 'Our signature Vietnamese main courses',
        displayOrder: 2,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Noodles & Soup',
        description: 'Traditional Vietnamese noodle soups and dishes',
        displayOrder: 3,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Beverages',
        description: 'Refreshing drinks and traditional Vietnamese coffee',
        displayOrder: 4,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Desserts',
        description: 'Sweet treats to end your meal',
        displayOrder: 5,
        isActive: true,
      },
    }),
  ]);
  console.log(`✓ Created ${categories.length} categories\n`);

  // 7. Create Menu Items
  console.log('🍽️  Creating Menu Items...');
  const menuItems = await Promise.all([
    // Appetizers
    prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[0].id,
        name: 'Fresh Spring Rolls (Gỏi Cuốn)',
        description:
          'Rice paper rolls filled with shrimp, herbs, and vermicelli',
        basePrice: 45000,
        preparationTime: 10,
        status: 'available',
        isChefRecommendation: true,
        allergenInfo: 'Contains shellfish, peanuts',
        nutritionalInfo: { calories: 150, protein: 8, carbs: 20, fat: 5 },
        popularityScore: 95,
      },
    }),
    prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[0].id,
        name: 'Crispy Spring Rolls (Chả Giò)',
        description:
          'Deep-fried rolls with pork, vegetables, and glass noodles',
        basePrice: 50000,
        preparationTime: 15,
        status: 'available',
        allergenInfo: 'Contains pork, shellfish',
        nutritionalInfo: { calories: 280, protein: 12, carbs: 25, fat: 15 },
        popularityScore: 88,
      },
    }),
    // Main Dishes
    prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[1].id,
        name: 'Grilled Pork with Broken Rice (Cơm Tấm)',
        description:
          'Grilled marinated pork chop served with broken rice and fish sauce',
        basePrice: 75000,
        preparationTime: 20,
        status: 'available',
        isChefRecommendation: true,
        allergenInfo: 'Contains fish sauce',
        nutritionalInfo: { calories: 650, protein: 35, carbs: 70, fat: 22 },
        popularityScore: 92,
      },
    }),
    prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[1].id,
        name: 'Lemongrass Chicken (Gà Xào Sả Ớt)',
        description: 'Stir-fried chicken with lemongrass and chili',
        basePrice: 70000,
        preparationTime: 18,
        status: 'available',
        allergenInfo: 'Contains fish sauce',
        nutritionalInfo: { calories: 520, protein: 40, carbs: 35, fat: 20 },
        popularityScore: 85,
      },
    }),
    // Noodles & Soup
    prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[2].id,
        name: 'Beef Pho (Phở Bò)',
        description: 'Traditional Vietnamese beef noodle soup',
        basePrice: 65000,
        preparationTime: 15,
        status: 'available',
        isChefRecommendation: true,
        allergenInfo: 'Contains beef, fish sauce',
        nutritionalInfo: { calories: 450, protein: 25, carbs: 55, fat: 12 },
        popularityScore: 98,
      },
    }),
    prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[2].id,
        name: 'Hue Spicy Beef Noodle Soup (Bún Bò Huế)',
        description: 'Spicy beef and pork noodle soup from Hue',
        basePrice: 70000,
        preparationTime: 18,
        status: 'available',
        allergenInfo: 'Contains beef, pork, shellfish',
        nutritionalInfo: { calories: 580, protein: 30, carbs: 60, fat: 18 },
        popularityScore: 90,
      },
    }),
    // Beverages
    prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[3].id,
        name: 'Vietnamese Iced Coffee (Cà Phê Sữa Đá)',
        description: 'Strong Vietnamese coffee with condensed milk over ice',
        basePrice: 30000,
        preparationTime: 5,
        status: 'available',
        allergenInfo: 'Contains dairy',
        nutritionalInfo: { calories: 150, protein: 3, carbs: 25, fat: 5 },
        popularityScore: 87,
      },
    }),
    prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[3].id,
        name: 'Fresh Coconut Water (Nước Dừa)',
        description: 'Fresh young coconut water served in the shell',
        basePrice: 25000,
        preparationTime: 3,
        status: 'available',
        nutritionalInfo: { calories: 45, protein: 0, carbs: 9, fat: 0 },
        popularityScore: 75,
      },
    }),
    // Desserts
    prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[4].id,
        name: 'Vietnamese Sweet Soup (Chè)',
        description: 'Mixed sweet dessert with beans, jelly, and coconut milk',
        basePrice: 35000,
        preparationTime: 8,
        status: 'available',
        allergenInfo: 'Contains coconut',
        nutritionalInfo: { calories: 220, protein: 4, carbs: 45, fat: 6 },
        popularityScore: 78,
      },
    }),
    prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[4].id,
        name: 'Flan (Bánh Flan)',
        description: 'Vietnamese caramel custard',
        basePrice: 30000,
        preparationTime: 5,
        status: 'available',
        allergenInfo: 'Contains eggs, dairy',
        nutritionalInfo: { calories: 280, protein: 6, carbs: 40, fat: 10 },
        popularityScore: 82,
      },
    }),
  ]);
  console.log(`✓ Created ${menuItems.length} menu items\n`);

  // 8. Create Modifier Groups and Modifiers
  console.log('⚙️  Creating Modifier Groups...');
  const sizeGroup = await prisma.modifierGroup.create({
    data: {
      tenantId: tenant.id,
      name: 'Size',
      type: 'single_choice',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      displayOrder: 1,
    },
  });

  const sizeModifiers = await Promise.all([
    prisma.modifier.create({
      data: {
        modifierGroupId: sizeGroup.id,
        name: 'Small',
        priceAdjustment: -10000,
        isAvailable: true,
        displayOrder: 1,
      },
    }),
    prisma.modifier.create({
      data: {
        modifierGroupId: sizeGroup.id,
        name: 'Regular',
        priceAdjustment: 0,
        isAvailable: true,
        displayOrder: 2,
      },
    }),
    prisma.modifier.create({
      data: {
        modifierGroupId: sizeGroup.id,
        name: 'Large',
        priceAdjustment: 15000,
        isAvailable: true,
        displayOrder: 3,
      },
    }),
  ]);

  const extrasGroup = await prisma.modifierGroup.create({
    data: {
      tenantId: tenant.id,
      name: 'Extras',
      type: 'multiple_choice',
      isRequired: false,
      minSelections: 0,
      maxSelections: 5,
      displayOrder: 2,
    },
  });

  const extrasModifiers = await Promise.all([
    prisma.modifier.create({
      data: {
        modifierGroupId: extrasGroup.id,
        name: 'Extra Meat',
        priceAdjustment: 20000,
        isAvailable: true,
        displayOrder: 1,
      },
    }),
    prisma.modifier.create({
      data: {
        modifierGroupId: extrasGroup.id,
        name: 'Extra Vegetables',
        priceAdjustment: 10000,
        isAvailable: true,
        displayOrder: 2,
      },
    }),
    prisma.modifier.create({
      data: {
        modifierGroupId: extrasGroup.id,
        name: 'Extra Sauce',
        priceAdjustment: 5000,
        isAvailable: true,
        displayOrder: 3,
      },
    }),
  ]);

  console.log(`✓ Created 2 modifier groups with 6 modifiers\n`);

  // Link modifiers to menu items (Pho and other soup items)
  await Promise.all([
    prisma.menuItemModifierGroup.create({
      data: {
        menuItemId: menuItems[4].id, // Pho
        modifierGroupId: sizeGroup.id,
      },
    }),
    prisma.menuItemModifierGroup.create({
      data: {
        menuItemId: menuItems[4].id, // Pho
        modifierGroupId: extrasGroup.id,
      },
    }),
    prisma.menuItemModifierGroup.create({
      data: {
        menuItemId: menuItems[5].id, // Bun Bo Hue
        modifierGroupId: sizeGroup.id,
      },
    }),
    prisma.menuItemModifierGroup.create({
      data: {
        menuItemId: menuItems[5].id, // Bun Bo Hue
        modifierGroupId: extrasGroup.id,
      },
    }),
  ]);

  // 9. Create Zones
  console.log('🏢 Creating Zones...');
  const zones = await Promise.all([
    prisma.zone.create({
      data: {
        tenantId: tenant.id,
        name: 'Tầng 1',
        description: 'Main dining area on the first floor',
        displayOrder: 1,
        isActive: true,
      },
    }),
    prisma.zone.create({
      data: {
        tenantId: tenant.id,
        name: 'Tầng 2',
        description: 'Second floor dining area',
        displayOrder: 2,
        isActive: true,
      },
    }),
    prisma.zone.create({
      data: {
        tenantId: tenant.id,
        name: 'Khu VIP',
        description: 'VIP private dining area',
        displayOrder: 3,
        isActive: true,
      },
    }),
    prisma.zone.create({
      data: {
        tenantId: tenant.id,
        name: 'Khu ngoài trời',
        description: 'Outdoor seating area',
        displayOrder: 4,
        isActive: true,
      },
    }),
  ]);
  console.log(`✓ Created ${zones.length} zones\n`);

  // 10. Create Tables
  console.log('🪑 Creating Tables...');
  const tables = await Promise.all([
    // Ground Floor - Tầng 1
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: '1',
        capacity: 2,
        position: JSON.stringify({ x: 100, y: 100 }),
        zoneId: zones[0].id,
        shape: 'circle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: '2',
        capacity: 4,
        position: JSON.stringify({ x: 250, y: 100 }),
        zoneId: zones[0].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: '3',
        capacity: 4,
        position: JSON.stringify({ x: 430, y: 100 }),
        zoneId: zones[0].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: '4',
        capacity: 6,
        position: JSON.stringify({ x: 100, y: 250 }),
        zoneId: zones[0].id,
        shape: 'oval',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: '5',
        capacity: 8,
        position: JSON.stringify({ x: 300, y: 250 }),
        zoneId: zones[0].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: '6',
        capacity: 4,
        position: JSON.stringify({ x: 100, y: 400 }),
        zoneId: zones[0].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: '7',
        capacity: 2,
        position: JSON.stringify({ x: 280, y: 400 }),
        zoneId: zones[0].id,
        shape: 'circle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: '8',
        capacity: 2,
        position: JSON.stringify({ x: 420, y: 400 }),
        zoneId: zones[0].id,
        shape: 'circle',
        status: 'available',
        isActive: true,
      },
    }),

    // Second Floor - Tầng 2
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: '9',
        capacity: 6,
        position: JSON.stringify({ x: 100, y: 100 }),
        zoneId: zones[1].id,
        shape: 'oval',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: '10',
        capacity: 6,
        position: JSON.stringify({ x: 300, y: 100 }),
        zoneId: zones[1].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: '11',
        capacity: 4,
        position: JSON.stringify({ x: 100, y: 250 }),
        zoneId: zones[1].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: '12',
        capacity: 4,
        position: JSON.stringify({ x: 280, y: 250 }),
        zoneId: zones[1].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),

    // VIP Area - Khu VIP
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: 'VIP-01',
        capacity: 10,
        position: JSON.stringify({ x: 100, y: 100 }),
        zoneId: zones[2].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: 'VIP-02',
        capacity: 8,
        position: JSON.stringify({ x: 350, y: 100 }),
        zoneId: zones[2].id,
        shape: 'oval',
        status: 'available',
        isActive: true,
      },
    }),

    // Outdoor Area - Khu ngoài trời
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: 'OUT-01',
        capacity: 4,
        position: JSON.stringify({ x: 100, y: 100 }),
        zoneId: zones[3].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: 'OUT-02',
        capacity: 4,
        position: JSON.stringify({ x: 280, y: 100 }),
        zoneId: zones[3].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: 'OUT-03',
        capacity: 2,
        position: JSON.stringify({ x: 100, y: 230 }),
        zoneId: zones[3].id,
        shape: 'circle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant.id,
        tableNumber: 'OUT-04',
        capacity: 2,
        position: JSON.stringify({ x: 240, y: 230 }),
        zoneId: zones[3].id,
        shape: 'circle',
        status: 'available',
        isActive: true,
      },
    }),
  ]);
  console.log(`✓ Created ${tables.length} tables\n`);

  // 11. Create Sample Table Session and Order
  console.log('📋 Creating Sample Order...');
  const tableSession = await prisma.tableSession.create({
    data: {
      tableId: tables[1].id,
      customerId: customer1.id,
      sessionToken: 'session_token_' + Date.now(),
      startedAt: new Date(),
      status: 'active',
    },
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-' + Date.now(),
      tenantId: tenant.id,
      tableId: tables[1].id,
      tableSessionId: tableSession.id,
      customerId: customer1.id,
      waiterId: waiter1.id,
      status: 'pending',
      priority: 'normal',
      subtotal: 140000,
      taxAmount: 14000,
      discountAmount: 0,
      totalAmount: 154000,
      specialInstructions: 'No onions, please',
    },
  });

  const orderItems = await Promise.all([
    prisma.orderItem.create({
      data: {
        orderId: order.id,
        menuItemId: menuItems[4].id, // Pho
        quantity: 1,
        unitPrice: 65000,
        modifiersTotal: 0,
        subtotal: 65000,
        status: 'pending',
        estimatedPrepTime: 15,
      },
    }),
    prisma.orderItem.create({
      data: {
        orderId: order.id,
        menuItemId: menuItems[0].id, // Spring Rolls
        quantity: 1,
        unitPrice: 45000,
        modifiersTotal: 0,
        subtotal: 45000,
        status: 'pending',
        estimatedPrepTime: 10,
      },
    }),
    prisma.orderItem.create({
      data: {
        orderId: order.id,
        menuItemId: menuItems[6].id, // Coffee
        quantity: 1,
        unitPrice: 30000,
        modifiersTotal: 0,
        subtotal: 30000,
        status: 'pending',
        estimatedPrepTime: 5,
      },
    }),
  ]);

  console.log('✓ Created sample order with 3 items\n');

  // 11. Create Settings
  console.log('⚙️  Creating Settings...');
  await Promise.all([
    prisma.setting.create({
      data: {
        tenantId: tenant.id,
        key: 'payment_methods',
        value: ['zalopay', 'momo', 'vnpay', 'cash'],
        description: 'Enabled payment methods',
      },
    }),
    prisma.setting.create({
      data: {
        tenantId: tenant.id,
        key: 'order_auto_acceptance',
        value: false,
        description: 'Automatically accept orders without waiter review',
      },
    }),
    prisma.setting.create({
      data: {
        tenantId: tenant.id,
        key: 'tax_rate',
        value: 0.1,
        description: 'Tax rate for orders',
      },
    }),
  ]);
  console.log('✓ Created 3 settings\n');

  console.log('✅ Database seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - 1 Super Admin`);
  console.log(`   - 1 Restaurant Owner`);
  console.log(`   - 1 Tenant (Restaurant)`);
  console.log(`   - 5 Staff Members (1 Admin, 2 Waiters, 2 Kitchen Staff)`);
  console.log(`   - 2 Customers`);
  console.log(`   - ${categories.length} Categories`);
  console.log(`   - ${menuItems.length} Menu Items`);
  console.log(`   - 2 Modifier Groups with 6 Modifiers`);
  console.log(`   - ${tables.length} Tables`);
  console.log(`   - 1 Active Table Session`);
  console.log(`   - 1 Sample Order with 3 Items`);
  console.log(`   - 3 System Settings\n`);
  console.log('🔑 Test Credentials:');
  console.log('   Super Admin: admin@smartrestaurant.com / Admin@123');
  console.log('   Owner: owner@joes-diner.com / Owner@123');
  console.log('   Admin: admin@joes-diner.com / Admin@123');
  console.log('   Waiter: waiter1@joes-diner.com / Waiter@123');
  console.log('   Chef: chef1@joes-diner.com / Chef@123');
  console.log('   Customer: john.doe@example.com / Customer@123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
