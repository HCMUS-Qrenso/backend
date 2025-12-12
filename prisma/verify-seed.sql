-- Quick verification queries for seeded data

-- 1. Check all users by role
SELECT role, COUNT(*) as count, string_agg(email, ', ') as emails
FROM users
GROUP BY role
ORDER BY role;

-- 2. View restaurant tenant
SELECT 
  t.name as restaurant_name,
  t.slug,
  t.subscription_tier,
  u.full_name as owner_name,
  u.email as owner_email
FROM tenants t
JOIN users u ON t.owner_id = u.id;

-- 3. Menu items by category with prices
SELECT 
  c.name as category,
  c.display_order,
  COUNT(m.id) as item_count,
  MIN(m.base_price) as min_price,
  MAX(m.base_price) as max_price,
  AVG(m.base_price)::numeric(10,2) as avg_price
FROM categories c
LEFT JOIN menu_items m ON c.id = m.category_id
GROUP BY c.id, c.name, c.display_order
ORDER BY c.display_order;

-- 4. All menu items with details
SELECT 
  c.name as category,
  m.name as item_name,
  m.base_price,
  m.preparation_time,
  m.is_chef_recommendation,
  m.status,
  m.popularity_score
FROM menu_items m
JOIN categories c ON m.category_id = c.id
ORDER BY c.display_order, m.name;

-- 5. Tables overview
SELECT 
  table_number,
  capacity,
  floor,
  shape,
  status,
  CASE WHEN qr_code_token IS NOT NULL THEN 'Yes' ELSE 'No' END as has_qr_code
FROM tables
ORDER BY table_number;

-- 6. Modifier groups and their modifiers
SELECT 
  mg.name as group_name,
  mg.type,
  mg.is_required,
  m.name as modifier_name,
  m.price_adjustment,
  m.is_available
FROM modifier_groups mg
JOIN modifiers m ON mg.id = m.modifier_group_id
ORDER BY mg.display_order, m.display_order;

-- 7. Current orders with details
SELECT 
  o.order_number,
  t.table_number,
  c.full_name as customer_name,
  w.full_name as waiter_name,
  o.status,
  o.subtotal,
  o.tax_amount,
  o.total_amount,
  o.created_at
FROM orders o
JOIN tables t ON o.table_id = t.id
LEFT JOIN users c ON o.customer_id = c.id
LEFT JOIN users w ON o.waiter_id = w.id
ORDER BY o.created_at DESC;

-- 8. Order items breakdown
SELECT 
  o.order_number,
  mi.name as item_name,
  oi.quantity,
  oi.unit_price,
  oi.subtotal,
  oi.status
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN menu_items mi ON oi.menu_item_id = mi.id
ORDER BY o.order_number, mi.name;

-- 9. Settings configured
SELECT 
  key,
  value,
  description
FROM settings
ORDER BY key;

-- 10. Quick summary statistics
SELECT 
  (SELECT COUNT(*) FROM users WHERE role = 'super_admin') as super_admins,
  (SELECT COUNT(*) FROM users WHERE role = 'owner') as owners,
  (SELECT COUNT(*) FROM users WHERE role = 'admin') as admins,
  (SELECT COUNT(*) FROM users WHERE role = 'waiter') as waiters,
  (SELECT COUNT(*) FROM users WHERE role = 'kitchen_staff') as kitchen_staff,
  (SELECT COUNT(*) FROM users WHERE role = 'customer') as customers,
  (SELECT COUNT(*) FROM tenants) as restaurants,
  (SELECT COUNT(*) FROM categories) as categories,
  (SELECT COUNT(*) FROM menu_items) as menu_items,
  (SELECT COUNT(*) FROM tables) as tables,
  (SELECT COUNT(*) FROM orders) as orders;
