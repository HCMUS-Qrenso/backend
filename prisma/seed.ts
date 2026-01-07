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
      accountType: 'staff',
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
      accountType: 'staff',
    },
  });
  console.log(`✓ Created Owner: ${owner.email}\n`);

  // 3. Create Tenant (Restaurant)
  console.log('🏪 Creating Restaurant Tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      name: "Joe's Vietnamese Diner",
      address: '227 Nguyen Van Cu, District 5, Ho Chi Minh City',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
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

  // Create Second Tenant (Restaurant)
  console.log('🏪 Creating Second Restaurant Tenant...');
  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'Pho & More Vietnamese Kitchen',
      address: '458 Le Van Sy, District 3, Ho Chi Minh City',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1224&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      slug: 'pho-and-more',
      ownerId: owner.id,
      subscriptionTier: 'business',
      status: 'active',
      settings: {
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        tax_rate: 0.08,
        operating_hours: {
          monday: '08:00-21:00',
          tuesday: '08:00-21:00',
          wednesday: '08:00-21:00',
          thursday: '08:00-21:00',
          friday: '08:00-22:00',
          saturday: '08:00-22:00',
          sunday: '08:00-21:00',
        },
      },
    },
  });
  console.log(`✓ Created Tenant: ${tenant2.name}\n`);

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
      accountType: 'staff',
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
      accountType: 'staff',
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
      accountType: 'staff',
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
      accountType: 'staff',
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
      accountType: 'staff',
    },
  });

  console.log('✓ Created 5 staff members for first tenant\n');

  // Create Staff Users for Second Tenant
  console.log('👥 Creating Staff Users for Second Tenant...');
  const admin2 = await prisma.user.create({
    data: {
      email: 'admin@pho-and-more.com',
      passwordHash: await bcrypt.hash('Admin@123', 10),
      fullName: 'Nguyen Van An',
      phone: '+84901234575',
      role: 'admin',
      tenantId: tenant2.id,
      emailVerified: true,
      status: 'active',
      accountType: 'staff',
    },
  });

  const waiter3 = await prisma.user.create({
    data: {
      email: 'waiter1@pho-and-more.com',
      passwordHash: await bcrypt.hash('Waiter@123', 10),
      fullName: 'Tran Thi Binh',
      phone: '+84901234576',
      role: 'waiter',
      tenantId: tenant2.id,
      emailVerified: true,
      status: 'active',
      accountType: 'staff',
    },
  });

  const waiter4 = await prisma.user.create({
    data: {
      email: 'waiter2@pho-and-more.com',
      passwordHash: await bcrypt.hash('Waiter@123', 10),
      fullName: 'Le Van Cuong',
      phone: '+84901234577',
      role: 'waiter',
      tenantId: tenant2.id,
      emailVerified: true,
      status: 'active',
      accountType: 'staff',
    },
  });

  const kitchenStaff3 = await prisma.user.create({
    data: {
      email: 'chef1@pho-and-more.com',
      passwordHash: await bcrypt.hash('Chef@123', 10),
      fullName: 'Pham Van Dung',
      phone: '+84901234578',
      role: 'kitchen_staff',
      tenantId: tenant2.id,
      emailVerified: true,
      status: 'active',
      accountType: 'staff',
    },
  });

  const kitchenStaff4 = await prisma.user.create({
    data: {
      email: 'chef2@pho-and-more.com',
      passwordHash: await bcrypt.hash('Chef@123', 10),
      fullName: 'Hoang Thi Huong',
      phone: '+84901234579',
      role: 'kitchen_staff',
      tenantId: tenant2.id,
      emailVerified: true,
      status: 'active',
      accountType: 'staff',
    },
  });

  console.log('✓ Created 5 staff members for second tenant\n');

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
      accountType: 'customer',
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
      accountType: 'customer',
    },
  });

  console.log('✓ Created 2 customers\n');

  // 6. Create Categories
  console.log('📁 Creating Menu Categories...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Khai Vị (Appetizers)',
        description:
          'Bắt đầu bữa ăn với những món khai vị Việt Nam hấp dẫn',
        displayOrder: 1,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Món Chính (Main Dishes)',
        description: 'Các món chính đặc trưng của Việt Nam',
        displayOrder: 2,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Mì & Phở (Noodles & Soup)',
        description: 'Các món mì và phở truyền thống Việt Nam',
        displayOrder: 3,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Đồ Uống (Beverages)',
        description: 'Đồ uống giải khát và cà phê truyền thống Việt Nam',
        displayOrder: 4,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Tráng Miệng (Desserts)',
        description: 'Món tráng miệng ngọt ngào kết thúc bữa ăn',
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
        name: 'Gỏi Cuốn (Fresh Spring Rolls)',
        description:
          'Bánh tráng cuốn tôm, rau sống và bún - Rice paper rolls with shrimp, herbs, and vermicelli',
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
        name: 'Chả Giò (Crispy Spring Rolls)',
        description:
          'Nem chiên giòn với thịt, rau và miến - Deep-fried rolls with pork, vegetables, and glass noodles',
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
        name: 'Cơm Tấm Sườn Nướng (Grilled Pork with Broken Rice)',
        description:
          'Sườn heo nướng thơm lừng ăn kèm cơm tấm - Grilled marinated pork chop with broken rice and fish sauce',
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
        name: 'Gà Xào Sả Ớt (Lemongrass Chicken)',
        description: 'Gà xào với sả và ớt thơm lừng - Stir-fried chicken with lemongrass and chili',
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
        name: 'Phở Bò (Beef Noodle Soup)',
        description: 'Phở bò truyền thống Việt Nam - Traditional Vietnamese beef noodle soup',
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
        name: 'Bún Bò Huế (Hue Spicy Beef Noodle Soup)',
        description: 'Bún bò cay đặc trưng xứ Huế - Spicy beef and pork noodle soup from Hue',
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
        name: 'Cà Phê Sữa Đá (Vietnamese Iced Coffee)',
        description: 'Cà phê phin đậm đà với sữa đặc - Strong Vietnamese coffee with condensed milk over ice',
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
        name: 'Nước Dừa Tươi (Fresh Coconut Water)',
        description: 'Nước dừa xiêm tươi mát lạnh - Fresh young coconut water served in the shell',
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
        name: 'Chè Thập Cẩm (Vietnamese Sweet Soup)',
        description: 'Chè ngọt mát với đậu, thạch và nước cốt dừa - Mixed sweet dessert with beans, jelly, and coconut milk',
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
        name: 'Bánh Flan (Vietnamese Caramel Custard)',
        description: 'Bánh flan caramen mềm mịn - Vietnamese caramel custard',
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
      name: 'Kích Cỡ (Size)',
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
        name: 'Nhỏ (Small)',
        priceAdjustment: -10000,
        isAvailable: true,
        displayOrder: 1,
      },
    }),
    prisma.modifier.create({
      data: {
        modifierGroupId: sizeGroup.id,
        name: 'Vừa (Regular)',
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
      name: 'Thêm (Extras)',
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
        name: 'Thêm Rau (Extra Vegetables)',
        priceAdjustment: 10000,
        isAvailable: true,
        displayOrder: 2,
      },
    }),
    prisma.modifier.create({
      data: {
        modifierGroupId: extrasGroup.id,
        name: 'Thêm Nước Sốt (Extra Sauce)',
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
        name: 'Tầng 1 (Ground Floor)',
        description: 'Main dining area on the first floor',
        displayOrder: 1,
        isActive: true,
      },
    }),
    prisma.zone.create({
      data: {
        tenantId: tenant.id,
        name: 'Tầng 2 (Second Floor)',
        description: 'Khu vực dùng bữa tầng 2 - Second floor dining area',
        displayOrder: 2,
        isActive: true,
      },
    }),
    prisma.zone.create({
      data: {
        tenantId: tenant.id,
        name: 'Khu VIP (VIP Area)',
        description: 'Khu vực riêng tư cao cấp - VIP private dining area',
        displayOrder: 3,
        isActive: true,
      },
    }),
    prisma.zone.create({
      data: {
        tenantId: tenant.id,
        name: 'Khu Ngoài Trời (Outdoor)',
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
        position: JSON.stringify({ x: 100, y: 100, rotation: 0 }),
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
        position: JSON.stringify({ x: 250, y: 100, rotation: 0 }),
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
        position: JSON.stringify({ x: 430, y: 100, rotation: 0 }),
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
        position: JSON.stringify({ x: 100, y: 250, rotation: 0 }),
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
        position: JSON.stringify({ x: 300, y: 250, rotation: 0 }),
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
        position: JSON.stringify({ x: 100, y: 400, rotation: 0 }),
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
        position: JSON.stringify({ x: 280, y: 400, rotation: 0 }),
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
        position: JSON.stringify({ x: 420, y: 400, rotation: 0 }),
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
        position: JSON.stringify({ x: 100, y: 100, rotation: 0 }),
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
        position: JSON.stringify({ x: 300, y: 100, rotation: 0 }),
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
        position: JSON.stringify({ x: 100, y: 250, rotation: 0 }),
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
        position: JSON.stringify({ x: 280, y: 250, rotation: 0 }),
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
        position: JSON.stringify({ x: 100, y: 100, rotation: 0 }),
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
        position: JSON.stringify({ x: 350, y: 100, rotation: 0 }),
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
        position: JSON.stringify({ x: 100, y: 100, rotation: 0 }),
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
        position: JSON.stringify({ x: 280, y: 100, rotation: 0 }),
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
        position: JSON.stringify({ x: 100, y: 230, rotation: 0 }),
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
        position: JSON.stringify({ x: 240, y: 230, rotation: 0 }),
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

  // ============================================
  // SECOND TENANT DATA
  // ============================================

  // Create Categories for Second Tenant
  console.log('📁 Creating Menu Categories for Second Tenant...');
  const categories2 = await Promise.all([
    prisma.category.create({
      data: {
        tenantId: tenant2.id,
        name: 'Món Khai Vị (Appetizers)',
        description: 'Các món khai vị truyền thống Việt Nam',
        displayOrder: 1,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant2.id,
        name: 'Phở & Bún (Noodle Soups)',
        description: 'Các món phở và bún đặc trưng Việt Nam',
        displayOrder: 2,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant2.id,
        name: 'Món Cơm (Rice Dishes)',
        description: 'Các món cơm phong phú và ngon miệng',
        displayOrder: 3,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant2.id,
        name: 'Đồ Uống (Beverages)',
        description: 'Các loại đồ uống tươi mát và cà phê Việt Nam',
        displayOrder: 4,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant2.id,
        name: 'Món Tráng Miệng (Desserts)',
        description: 'Các món tráng miệng truyền thống Việt Nam',
        displayOrder: 5,
        isActive: true,
      },
    }),
  ]);
  console.log(`✓ Created ${categories2.length} categories for second tenant\n`);

  // Create Menu Items for Second Tenant
  console.log('🍽️  Creating Menu Items for Second Tenant...');
  const menuItems2 = await Promise.all([
    // Appetizers
    prisma.menuItem.create({
      data: {
        tenantId: tenant2.id,
        categoryId: categories2[0].id,
        name: 'Gỏi Cuốn (Summer Rolls)',
        description: 'Bánh tráng cuốn tươi với tôm và rau thơm - Fresh rice paper rolls with shrimp and herbs',
        basePrice: 40000,
        preparationTime: 8,
        status: 'available',
        isChefRecommendation: true,
        allergenInfo: 'Contains shellfish',
        nutritionalInfo: { calories: 140, protein: 9, carbs: 18, fat: 4 },
        popularityScore: 92,
      },
    }),
    prisma.menuItem.create({
      data: {
        tenantId: tenant2.id,
        categoryId: categories2[0].id,
        name: 'Bánh Xèo (Vietnamese Pancake)',
        description: 'Bánh xèo giòn rụm với thịt heo và tôm - Crispy rice pancake with pork and shrimp',
        basePrice: 55000,
        preparationTime: 12,
        status: 'available',
        allergenInfo: 'Contains shellfish, pork',
        nutritionalInfo: { calories: 320, protein: 15, carbs: 28, fat: 18 },
        popularityScore: 87,
      },
    }),
    // Phở & Noodle Soups
    prisma.menuItem.create({
      data: {
        tenantId: tenant2.id,
        categoryId: categories2[1].id,
        name: 'Phở Bò (Beef Noodle Soup)',
        description: 'Phở bò truyền thống với nước dùng thơm ngon - Traditional beef noodle soup with aromatic broth',
        basePrice: 70000,
        preparationTime: 18,
        status: 'available',
        isChefRecommendation: true,
        allergenInfo: 'Contains beef',
        nutritionalInfo: { calories: 420, protein: 25, carbs: 55, fat: 12 },
        popularityScore: 98,
      },
    }),
    prisma.menuItem.create({
      data: {
        tenantId: tenant2.id,
        categoryId: categories2[1].id,
        name: 'Phở Gà (Chicken Noodle Soup)',
        description: 'Phở gà thanh đạm với rau thơm tươi - Light chicken noodle soup with fresh herbs',
        basePrice: 65000,
        preparationTime: 15,
        status: 'available',
        allergenInfo: 'Contains chicken',
        nutritionalInfo: { calories: 380, protein: 22, carbs: 52, fat: 10 },
        popularityScore: 90,
      },
    }),
    prisma.menuItem.create({
      data: {
        tenantId: tenant2.id,
        categoryId: categories2[1].id,
        name: 'Hủ Tiếu Nam Vang (Phnom Penh Noodle Soup)',
        description: 'Hủ tiếu Nam Vang đậm đà hương vị miền Nam - Southern Vietnamese noodle soup',
        basePrice: 60000,
        preparationTime: 16,
        status: 'available',
        allergenInfo: 'Contains pork, shellfish',
        nutritionalInfo: { calories: 390, protein: 20, carbs: 48, fat: 14 },
        popularityScore: 85,
      },
    }),
    // Rice Dishes
    prisma.menuItem.create({
      data: {
        tenantId: tenant2.id,
        categoryId: categories2[2].id,
        name: 'Cơm Sườn Nướng (Grilled Pork Rice)',
        description: 'Sườn heo nướng thơm phức với cơm tấm - Grilled pork chop with broken rice',
        basePrice: 70000,
        preparationTime: 18,
        status: 'available',
        allergenInfo: 'Contains pork',
        nutritionalInfo: { calories: 580, protein: 28, carbs: 65, fat: 22 },
        popularityScore: 91,
      },
    }),
    prisma.menuItem.create({
      data: {
        tenantId: tenant2.id,
        categoryId: categories2[2].id,
        name: 'Cơm Tấm Bì Chả (Broken Rice with Pork)',
        description: 'Cơm tấm với bì và chả thơm ngon - Rice with shredded pork skin and Vietnamese pork cake',
        basePrice: 65000,
        preparationTime: 20,
        status: 'available',
        allergenInfo: 'Contains pork',
        nutritionalInfo: { calories: 520, protein: 24, carbs: 60, fat: 20 },
        popularityScore: 82,
      },
    }),
    // Beverages
    prisma.menuItem.create({
      data: {
        tenantId: tenant2.id,
        categoryId: categories2[3].id,
        name: 'Cà Phê Sữa Đá (Vietnamese Iced Coffee)',
        description: 'Cà phê phin đậm đà với sữa đặc - Strong drip coffee with sweetened condensed milk',
        basePrice: 28000,
        preparationTime: 5,
        status: 'available',
        allergenInfo: 'Contains dairy',
        nutritionalInfo: { calories: 150, protein: 3, carbs: 22, fat: 5 },
        popularityScore: 95,
      },
    }),
    prisma.menuItem.create({
      data: {
        tenantId: tenant2.id,
        categoryId: categories2[3].id,
        name: 'Nước Chanh Tươi (Fresh Lime Juice)',
        description: 'Nước chanh tươi mát lạnh - Freshly squeezed lime juice',
        basePrice: 20000,
        preparationTime: 3,
        status: 'available',
        nutritionalInfo: { calories: 35, protein: 0, carbs: 10, fat: 0 },
        popularityScore: 78,
      },
    }),
    prisma.menuItem.create({
      data: {
        tenantId: tenant2.id,
        categoryId: categories2[3].id,
        name: 'Nước Mía (Sugarcane Juice)',
        description: 'Nước mía ép tươi mát lạnh - Fresh pressed sugarcane juice',
        basePrice: 22000,
        preparationTime: 4,
        status: 'available',
        nutritionalInfo: { calories: 180, protein: 0, carbs: 45, fat: 0 },
        popularityScore: 80,
      },
    }),
    // Desserts
    prisma.menuItem.create({
      data: {
        tenantId: tenant2.id,
        categoryId: categories2[4].id,
        name: 'Chè Đậu Xanh (Mung Bean Dessert)',
        description: 'Chè đậu xanh ngọt mát với nước cốt dừa - Sweet mung bean soup with coconut milk',
        basePrice: 30000,
        preparationTime: 6,
        status: 'available',
        allergenInfo: 'Contains coconut',
        nutritionalInfo: { calories: 200, protein: 5, carbs: 38, fat: 5 },
        popularityScore: 75,
      },
    }),
    prisma.menuItem.create({
      data: {
        tenantId: tenant2.id,
        categoryId: categories2[4].id,
        name: 'Rau Câu Dừa (Coconut Jelly)',
        description: 'Rau câu dừa mát lạnh thanh mát - Refreshing coconut jelly dessert',
        basePrice: 25000,
        preparationTime: 5,
        status: 'available',
        allergenInfo: 'Contains coconut',
        nutritionalInfo: { calories: 120, protein: 1, carbs: 28, fat: 2 },
        popularityScore: 72,
      },
    }),
  ]);
  console.log(`✓ Created ${menuItems2.length} menu items for second tenant\n`);

  // Create Modifier Groups and Modifiers for Second Tenant
  console.log('⚙️  Creating Modifier Groups for Second Tenant...');
  const sizeGroup2 = await prisma.modifierGroup.create({
    data: {
      tenantId: tenant2.id,
      name: 'Kích Cỡ (Size)',
      type: 'single_choice',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      displayOrder: 1,
    },
  });

  const sizeModifiers2 = await Promise.all([
    prisma.modifier.create({
      data: {
        modifierGroupId: sizeGroup2.id,
        name: 'Nhỏ (Small)',
        priceAdjustment: -8000,
        isAvailable: true,
        displayOrder: 1,
      },
    }),
    prisma.modifier.create({
      data: {
        modifierGroupId: sizeGroup2.id,
        name: 'Vừa (Regular)',
        priceAdjustment: 0,
        isAvailable: true,
        displayOrder: 2,
      },
    }),
    prisma.modifier.create({
      data: {
        modifierGroupId: sizeGroup2.id,
        name: 'Lớn (Large)',
        priceAdjustment: 12000,
        isAvailable: true,
        displayOrder: 3,
      },
    }),
  ]);

  const toppingsGroup2 = await prisma.modifierGroup.create({
    data: {
      tenantId: tenant2.id,
      name: 'Topping (Toppings)',
      type: 'multiple_choice',
      isRequired: false,
      minSelections: 0,
      maxSelections: 5,
      displayOrder: 2,
    },
  });

  const toppingsModifiers2 = await Promise.all([
    prisma.modifier.create({
      data: {
        modifierGroupId: toppingsGroup2.id,
        name: 'Thêm Thịt Bò (Extra Beef)',
        priceAdjustment: 25000,
        isAvailable: true,
        displayOrder: 1,
      },
    }),
    prisma.modifier.create({
      data: {
        modifierGroupId: toppingsGroup2.id,
        name: 'Thêm Bánh Phở (Extra Noodles)',
        priceAdjustment: 15000,
        isAvailable: true,
        displayOrder: 2,
      },
    }),
    prisma.modifier.create({
      data: {
        modifierGroupId: toppingsGroup2.id,
        name: 'Thêm Rau Thơm (Extra Herbs)',
        priceAdjustment: 8000,
        isAvailable: true,
        displayOrder: 3,
      },
    }),
  ]);

  console.log(`✓ Created 2 modifier groups with 6 modifiers for second tenant\n`);

  // Link modifiers to menu items (Phở items)
  await Promise.all([
    prisma.menuItemModifierGroup.create({
      data: {
        menuItemId: menuItems2[2].id, // Beef Phở
        modifierGroupId: sizeGroup2.id,
      },
    }),
    prisma.menuItemModifierGroup.create({
      data: {
        menuItemId: menuItems2[2].id, // Beef Phở
        modifierGroupId: toppingsGroup2.id,
      },
    }),
    prisma.menuItemModifierGroup.create({
      data: {
        menuItemId: menuItems2[3].id, // Chicken Phở
        modifierGroupId: sizeGroup2.id,
      },
    }),
    prisma.menuItemModifierGroup.create({
      data: {
        menuItemId: menuItems2[3].id, // Chicken Phở
        modifierGroupId: toppingsGroup2.id,
      },
    }),
  ]);

  // Create Zones for Second Tenant
  console.log('🏢 Creating Zones for Second Tenant...');
  const zones2 = await Promise.all([
    prisma.zone.create({
      data: {
        tenantId: tenant2.id,
        name: 'Tầng Trệt (Main Floor)',
        description: 'Khu vực dùng bữa chính - Main dining area',
        displayOrder: 1,
        isActive: true,
      },
    }),
    prisma.zone.create({
      data: {
        tenantId: tenant2.id,
        name: 'Sân Thượng (Rooftop)',
        description: 'Khu vực dùng bữa trên sân thượng với tầm nhìn thành phố - Rooftop dining area with city view',
        displayOrder: 2,
        isActive: true,
      },
    }),
    prisma.zone.create({
      data: {
        tenantId: tenant2.id,
        name: 'Phòng Riêng (Private Rooms)',
        description: 'Private dining rooms',
        displayOrder: 3,
        isActive: true,
      },
    }),
  ]);
  console.log(`✓ Created ${zones2.length} zones for second tenant\n`);

  // Create Tables for Second Tenant
  console.log('🪑 Creating Tables for Second Tenant...');
  const tables2 = await Promise.all([
    // Main Floor
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'M1',
        capacity: 2,
        position: JSON.stringify({ x: 120, y: 120, rotation: 0 }),
        zoneId: zones2[0].id,
        shape: 'circle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'M2',
        capacity: 4,
        position: JSON.stringify({ x: 270, y: 120, rotation: 0 }),
        zoneId: zones2[0].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'M3',
        capacity: 4,
        position: JSON.stringify({ x: 450, y: 120, rotation: 0 }),
        zoneId: zones2[0].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'M4',
        capacity: 6,
        position: JSON.stringify({ x: 120, y: 270, rotation: 0 }),
        zoneId: zones2[0].id,
        shape: 'oval',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'M5',
        capacity: 6,
        position: JSON.stringify({ x: 320, y: 270, rotation: 0 }),
        zoneId: zones2[0].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'M6',
        capacity: 4,
        position: JSON.stringify({ x: 120, y: 420, rotation: 0 }),
        zoneId: zones2[0].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'M7',
        capacity: 2,
        position: JSON.stringify({ x: 300, y: 420, rotation: 0 }),
        zoneId: zones2[0].id,
        shape: 'circle',
        status: 'available',
        isActive: true,
      },
    }),

    // Rooftop
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'R1',
        capacity: 4,
        position: JSON.stringify({ x: 120, y: 120, rotation: 0 }),
        zoneId: zones2[1].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'R2',
        capacity: 4,
        position: JSON.stringify({ x: 300, y: 120, rotation: 0 }),
        zoneId: zones2[1].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'R3',
        capacity: 6,
        position: JSON.stringify({ x: 120, y: 270, rotation: 0 }),
        zoneId: zones2[1].id,
        shape: 'oval',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'R4',
        capacity: 8,
        position: JSON.stringify({ x: 320, y: 270, rotation: 0 }),
        zoneId: zones2[1].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),

    // Private Rooms
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'P1',
        capacity: 10,
        position: JSON.stringify({ x: 120, y: 120, rotation: 0 }),
        zoneId: zones2[2].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'P2',
        capacity: 8,
        position: JSON.stringify({ x: 370, y: 120, rotation: 0 }),
        zoneId: zones2[2].id,
        shape: 'oval',
        status: 'available',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        tenantId: tenant2.id,
        tableNumber: 'P3',
        capacity: 12,
        position: JSON.stringify({ x: 120, y: 300, rotation: 0 }),
        zoneId: zones2[2].id,
        shape: 'rectangle',
        status: 'available',
        isActive: true,
      },
    }),
  ]);
  console.log(`✓ Created ${tables2.length} tables for second tenant\n`);

  // Create Sample Table Session and Order for Second Tenant
  console.log('📋 Creating Sample Order for Second Tenant...');
  const tableSession2 = await prisma.tableSession.create({
    data: {
      tableId: tables2[1].id, // Table M2
      customerId: customer2.id,
      sessionToken: 'session_token_2_' + Date.now(),
      startedAt: new Date(),
      status: 'active',
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2-' + Date.now(),
      tenantId: tenant2.id,
      tableId: tables2[1].id,
      tableSessionId: tableSession2.id,
      customerId: customer2.id,
      waiterId: waiter3.id,
      status: 'pending',
      priority: 'normal',
      subtotal: 158000,
      taxAmount: 12640,
      discountAmount: 0,
      totalAmount: 170640,
      specialInstructions: 'Extra herbs, please',
    },
  });

  const orderItems2 = await Promise.all([
    prisma.orderItem.create({
      data: {
        orderId: order2.id,
        menuItemId: menuItems2[2].id, // Phở Bò
        quantity: 1,
        unitPrice: 70000,
        modifiersTotal: 0,
        subtotal: 70000,
        status: 'pending',
        estimatedPrepTime: 18,
      },
    }),
    prisma.orderItem.create({
      data: {
        orderId: order2.id,
        menuItemId: menuItems2[0].id, // Gỏi Cuốn
        quantity: 1,
        unitPrice: 40000,
        modifiersTotal: 0,
        subtotal: 40000,
        status: 'pending',
        estimatedPrepTime: 8,
      },
    }),
    prisma.orderItem.create({
      data: {
        orderId: order2.id,
        menuItemId: menuItems2[7].id, // Cà Phê Sữa Đá
        quantity: 2,
        unitPrice: 28000,
        modifiersTotal: 0,
        subtotal: 56000,
        status: 'pending',
        estimatedPrepTime: 5,
      },
    }),
  ]);

  console.log('✓ Created sample order with 3 items for second tenant\n');

  // Create Settings for Second Tenant
  console.log('⚙️  Creating Settings for Second Tenant...');
  await Promise.all([
    prisma.setting.create({
      data: {
        tenantId: tenant2.id,
        key: 'payment_methods',
        value: ['momo', 'vnpay', 'cash', 'card'],
        description: 'Enabled payment methods',
      },
    }),
    prisma.setting.create({
      data: {
        tenantId: tenant2.id,
        key: 'order_auto_acceptance',
        value: true,
        description: 'Automatically accept orders without waiter review',
      },
    }),
    prisma.setting.create({
      data: {
        tenantId: tenant2.id,
        key: 'tax_rate',
        value: 0.08,
        description: 'Tax rate for orders',
      },
    }),
  ]);
  console.log('✓ Created 3 settings for second tenant\n');

  console.log('✅ Database seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - 1 Super Admin`);
  console.log(`   - 1 Restaurant Owner`);
  console.log(`   - 2 Tenants (Restaurants)`);
  console.log(`   - 10 Staff Members Total (2 Admins, 4 Waiters, 4 Kitchen Staff)`);
  console.log(`   - 2 Customers`);
  console.log(`\n   Tenant 1 - Joe's Vietnamese Diner:`);
  console.log(`     - 5 Staff Members (1 Admin, 2 Waiters, 2 Kitchen Staff)`);
  console.log(`     - ${categories.length} Categories`);
  console.log(`     - ${menuItems.length} Menu Items`);
  console.log(`     - 2 Modifier Groups with 6 Modifiers`);
  console.log(`     - ${zones.length} Zones`);
  console.log(`     - ${tables.length} Tables`);
  console.log(`     - 1 Active Table Session with Sample Order`);
  console.log(`     - 3 System Settings`);
  console.log(`\n   Tenant 2 - Pho & More Vietnamese Kitchen:`);
  console.log(`     - 5 Staff Members (1 Admin, 2 Waiters, 2 Kitchen Staff)`);
  console.log(`     - ${categories2.length} Categories`);
  console.log(`     - ${menuItems2.length} Menu Items`);
  console.log(`     - 2 Modifier Groups with 6 Modifiers`);
  console.log(`     - ${zones2.length} Zones`);
  console.log(`     - ${tables2.length} Tables`);
  console.log(`     - 1 Active Table Session with Sample Order`);
  console.log(`     - 3 System Settings\n`);
  console.log('🔑 Test Credentials:');
  console.log('   Super Admin: admin@smartrestaurant.com / Admin@123');
  console.log('   Owner: owner@joes-diner.com / Owner@123');
  console.log('\n   Tenant 1 Staff:');
  console.log('   - Admin: admin@joes-diner.com / Admin@123');
  console.log('   - Waiter: waiter1@joes-diner.com / Waiter@123');
  console.log('   - Chef: chef1@joes-diner.com / Chef@123');
  console.log('\n   Tenant 2 Staff:');
  console.log('   - Admin: admin@pho-and-more.com / Admin@123');
  console.log('   - Waiter: waiter1@pho-and-more.com / Waiter@123');
  console.log('   - Chef: chef1@pho-and-more.com / Chef@123');
  console.log('\n   Customers:');
  console.log('   - Customer 1: john.doe@example.com / Customer@123');
  console.log('   - Customer 2: jane.smith@example.com / Customer@123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
