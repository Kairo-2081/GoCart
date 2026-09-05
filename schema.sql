-- 1. DROP EXISTING TABLES 
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS sellers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- USERS TABLE (Global Authentication & Identity)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'customer', -- 'customer', 'seller', 'admin'
    entity_id VARCHAR(64),                        -- Links to customers.id, sellers.id, or admins.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    number VARCHAR(50),
    address_house_name VARCHAR(255),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_postal_code VARCHAR(50),
    address_additional_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SELLERS / VENDORS TABLE
CREATE TABLE IF NOT EXISTS sellers (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    number VARCHAR(50),
    logo TEXT,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'approved', -- 'pending', 'approved', 'rejected', 'suspended'
    address_house_name VARCHAR(255),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_postal_code VARCHAR(50),
    address_additional_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    number VARCHAR(50),
    address_house_name VARCHAR(255),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_postal_code VARCHAR(50),
    address_additional_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image TEXT,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    voucher VARCHAR(50) DEFAULT '',
    stock INTEGER NOT NULL DEFAULT 0,
    product_status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'deactivated'
    category_id VARCHAR(64) NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    seller_id VARCHAR(64) NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    review_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CART ITEMS TABLE
CREATE TABLE IF NOT EXISTS cart (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    tracking_id VARCHAR(100),
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    items_json TEXT NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'placed', -- 'placed', 'processing', 'shipped', 'delivered', 'cancelled'
    shipping_address_json TEXT,
    billing_address_json TEXT,
    additional_info TEXT,
    order_placed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PRODUCT REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    review_text TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES FOR PERFORMANCE OPTIMIZATION
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(product_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_cart_customer ON cart(customer_id);

-- 4. INITIAL SEED DATA

-- Categories
INSERT INTO categories (id, name) VALUES
('CAT-1', 'Electronics & Gadgets'),
('CAT-2', 'Home & Living'),
('CAT-3', 'Fashion & Apparel'),
('CAT-4', 'Books & Stationery')
ON CONFLICT (id) DO NOTHING;

-- Admin
INSERT INTO admins (id, username, name, email, password, number, address_house_name, address_street, address_city, address_postal_code, address_additional_info) VALUES
('ADM-1', 'admin', 'Fahim Shahriar (Admin)', 'admin@gocart.com', 'admin123', '+88017555-01949', 'HQ Tower Floor 15', '1 Marketplace Way', 'Dhaka', '9513', 'GoCart Operations Center')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, username, password, email, role, entity_id, created_at) VALUES
('USR-ADM-1', 'admin', 'admin123', 'admin@marketplace.com', 'admin', 'ADM-1', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Sellers
INSERT INTO sellers (id, username, name, email, password, number, logo, description, status, address_house_name, address_street, address_city, address_postal_code, address_additional_info, created_at) VALUES
('SEL-1', 'startech', 'Star Tech Solutions', 'contact@startech.io', 'seller123', '+8801790-124345', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80', 'Pioneering cutting-edge audio, wearables, and personal computing hardware with premium warranties.', 'approved', 'Suite 400', '88 Green Way', 'Dhaka', '7871', 'Building B,  Dock 2', '2026-01-15 08:00:00+00'),
('SEL-2', 'artisanhome', 'Artisan Home Krafts', 'hello@artisanhome.com', 'seller123', '+8801891-124345', 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200&auto=format&fit=crop&q=80', 'Handcrafted ceramic stoneware, organic textiles, and sustainable home decor for modern spaces.', 'approved', 'Studio 12', '42 Craftsman Bhaban', 'Bhola', '9701', 'West Entrance', '2026-02-20 10:30:00+00'),
('SEL-3', 'urbanthread', 'Urban Thread Studio', 'info@urbanthread.co', 'seller123', '+8801841-124345', 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=200&auto=format&fit=crop&q=80', 'Ethically manufactured organic apparel designed for urban active lifestyles.', 'pending', 'Loft 3A', '105 Sarobar', 'Dhaka', '7201', ' Elevator access', '2026-08-01 14:20:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, username, password, email, role, entity_id, created_at) VALUES
('USR-SEL-1', 'startech', 'seller123', 'contact@startech.io', 'seller', 'SEL-1', CURRENT_TIMESTAMP),
('USR-SEL-2', 'artisanhome', 'seller123', 'hello@artisanhome.com', 'seller', 'SEL-2', CURRENT_TIMESTAMP),
('USR-SEL-3', 'urbanthread', 'seller123', 'info@urbanthread.co', 'seller', 'SEL-3', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Customers
INSERT INTO customers (id, username, name, email, password, number, address_house_name, address_street, address_city, address_postal_code, address_additional_info) VALUES
('CUST-1', 'kairo', 'Kairo', 'kairo21@gmail.com', 'password123', '+8801756-840340', 'Apt 4B', '742 Evergreen Terrace', 'Barishal', '9777', 'Leave package at front porch'),
('CUST-2', 'abir', 'Ahmad Taquie Abir', 'abir@gmail.com', 'password123', '+8801576-455432', 'Unit 12', '123 Maple Street', 'Bogra', '8101', 'Ring doorbell on arrival'),
('CUST-3', 'mayel', 'Raian Rashid Mayel', 'raianrashidmayel@gmail.com', 'password123', '+8801734-674789', 'Suite 300', '456 Bak Avenue', 'Bhola', '4107', 'Call upon arrival')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, username, password, email, role, entity_id, created_at) VALUES
('USR-CUST-1', 'kairo', 'password123', 'kairo21@gmail.com', 'customer', 'CUST-1', CURRENT_TIMESTAMP),
('USR-CUST-2', 'abir', 'password123', 'abir@gmail.com', 'customer', 'CUST-2', CURRENT_TIMESTAMP),
('USR-CUST-3', 'mayel', 'password123', 'raianrashidmayel@gmail.com', 'customer', 'CUST-3', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO products (id, name, image, description, price, voucher, stock, product_status, category_id, seller_id, review_id, created_at) VALUES
('PROD-1', 'Wireless Noise-Canceling Headphones', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80', 'High-fidelity audio with active noise cancellation, custom EQ mode, and up to 40 hours of continuous battery playback.', 99.99, 'SAVE20', 25, 'active', 'CAT-1', 'SEL-1', 'REV-1', CURRENT_TIMESTAMP),
('PROD-2', 'Smart Watch Pro Series 8', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80', 'Advanced health metrics tracker featuring ECG sensor, crystal-clear AMOLED display, built-in GPS, and 50m water resistance.', 299.00, 'TECH10', 14, 'active', 'CAT-1', 'SEL-1', 'REV-4', CURRENT_TIMESTAMP),
('PROD-3', 'Ergonomic Mechanical Keyboard', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80', 'Customizable hot-swappable mechanical keyboard with silent tactile switches, per-key RGB backlighting, and solid aluminum casing.', 129.50, '', 8, 'active', 'CAT-1', 'SEL-1', NULL, CURRENT_TIMESTAMP),
('PROD-4', 'Minimalist Ceramic Coffee Dripper & Pot', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80', 'Artisanal heat-resistant matte ceramic pour-over coffee set crafted for optimal extraction and sleek countertop aesthetic.', 45.00, 'BREW15', 30, 'active', 'CAT-2', 'SEL-2', 'REV-3', CURRENT_TIMESTAMP),
('PROD-5', 'Nordic Linen Throw Blanket', 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=80', '100% organic French flax linen throw blanket pre-washed for effortless softness and breathable year-round comfort.', 68.00, '', 18, 'active', 'CAT-2', 'SEL-2', NULL, CURRENT_TIMESTAMP),
('PROD-6', 'Organic Heavyweight Fleece Hoodie', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80', 'Ultra-soft 450gsm organic cotton fleece hoodie with double-lined hood and reinforced drop-shoulder design.', 55.00, 'NEW20', 40, 'active', 'CAT-3', 'SEL-3', NULL, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Reviews
INSERT INTO reviews (id, product_id, customer_id, customer_name, review_text, rating, created_at) VALUES
('REV-1', 'PROD-1', 'CUST-1', 'Kairo', 'Outstanding noise cancellation! I wore these on a 10-hour flight and forgot I was on a plane. Battery life easily exceeded expectations.', 5, '2026-07-28 14:32:00+00'),
('REV-2', 'PROD-1', 'CUST-2', 'Ahmad Taquie Abir', 'Crisp high frequencies and smooth bass response. The ear cups fit tightly without pressing too hard on glasses.', 4, '2026-07-30 09:15:00+00'),
('REV-3', 'PROD-4', 'CUST-3', 'Raian Rashid Mayel', 'Gorgeous ceramic texture and brews a clean, aromatic cup of coffee every morning. Packaging was eco-friendly and sturdy.', 5, '2026-07-31 18:40:00+00'),
('REV-4', 'PROD-2', 'CUST-1', 'Kairo', 'The health sensor accuracy and vibrant screen make this worth every penny. Syncs seamlessly with all my fitness apps!', 5, '2026-08-01 11:20:00+00')
ON CONFLICT (id) DO NOTHING;

-- Orders
INSERT INTO orders (id, tracking_id, customer_id, items_json, subtotal, shipping_fee, status, shipping_address_json, billing_address_json, additional_info, order_placed_at) VALUES
('ORD-1', 'TRK-9842-1049', 'CUST-1', '[{"Product_ID":"PROD-1","Name":"Wireless Noise-Canceling Headphones","Price":199.99,"Quantity":1,"Image":"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80","Seller_ID":"SEL-1"}]', 199.99, 5.00, 'delivered', '{"Street":"742 Evergreen Terrace","House_Name":"Apt 4B","City":"Barishal","Postal_Code":"9777","Additional_Info":"Leave package at front porch"}', '{"Street":"742 Evergreen Terrace","House_Name":"Apt 4B","City":"Barishal","Postal_Code":"9777"}', 'Standard delivery via Express Freight.', '2026-07-28 14:30:00+00'),
('ORD-2', 'TRK-7410-5829', 'CUST-2', '[{"Product_ID":"PROD-4","Name":"Minimalist Ceramic Coffee Dripper & Pot","Price":45.00,"Quantity":2,"Image":"https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80","Seller_ID":"SEL-2"}]', 90.00, 5.00, 'shipped', '{"Street":"123 Maple Street","House_Name":"Unit 12","City":"Bogra","Postal_Code":"8101","Additional_Info":"Ring doorbell on arrival"}', '{"Street":"123 Maple Street","House_Name":"Unit 12","City":"Bogra","Postal_Code":"8101"}', 'Fragile ceramic item handle with care.', '2026-07-31 10:15:00+00')
ON CONFLICT (id) DO NOTHING;

-- 5. FOREIGN KEY & DATA CONSTRAINTS

-- USERS TABLE CONSTRAINTS
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_role,
    ADD CONSTRAINT chk_users_role CHECK (role IN ('customer', 'seller', 'admin'));

-- SELLERS TABLE CONSTRAINTS
ALTER TABLE sellers
    DROP CONSTRAINT IF EXISTS chk_sellers_status,
    ADD CONSTRAINT chk_sellers_status CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

-- PRODUCTS TABLE CONSTRAINTS
ALTER TABLE products
    DROP CONSTRAINT IF EXISTS chk_products_price,
    DROP CONSTRAINT IF EXISTS chk_products_stock,
    DROP CONSTRAINT IF EXISTS chk_products_status,
    DROP CONSTRAINT IF EXISTS fk_products_review,
    ADD CONSTRAINT chk_products_price CHECK (price >= 0),
    ADD CONSTRAINT chk_products_stock CHECK (stock >= 0),
    ADD CONSTRAINT chk_products_status CHECK (product_status IN ('active', 'inactive', 'deactivated')),
    ADD CONSTRAINT fk_products_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE SET NULL;

-- CART TABLE CONSTRAINTS
ALTER TABLE cart
    DROP CONSTRAINT IF EXISTS chk_cart_quantity,
    DROP CONSTRAINT IF EXISTS uq_cart_customer_product,
    ADD CONSTRAINT chk_cart_quantity CHECK (quantity > 0),
    ADD CONSTRAINT uq_cart_customer_product UNIQUE (customer_id, product_id);

-- ORDERS TABLE CONSTRAINTS
ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS chk_orders_subtotal,
    DROP CONSTRAINT IF EXISTS chk_orders_shipping_fee,
    DROP CONSTRAINT IF EXISTS chk_orders_status,
    ADD CONSTRAINT chk_orders_subtotal CHECK (subtotal >= 0),
    ADD CONSTRAINT chk_orders_shipping_fee CHECK (shipping_fee >= 0),
    ADD CONSTRAINT chk_orders_status CHECK (status IN ('placed', 'processing', 'shipped', 'delivered', 'cancelled'));

-- REVIEWS TABLE CONSTRAINTS
ALTER TABLE reviews
    DROP CONSTRAINT IF EXISTS chk_reviews_rating,
    ADD CONSTRAINT chk_reviews_rating CHECK (rating >= 1 AND rating <= 5);
