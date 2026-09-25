-- Non-destructive application schema. Demo data is seeded separately with hashed passwords.

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

CREATE OR REPLACE FUNCTION update_product_review_id()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products SET review_id = NEW.id WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_product_review_id ON reviews;
CREATE TRIGGER trg_update_product_review_id
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_review_id();

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

-- 4. FOREIGN KEY & DATA CONSTRAINTS

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

-- Audit seller approval status changes.
CREATE TABLE IF NOT EXISTS seller_status_audit (
    audit_id SERIAL PRIMARY KEY,
    seller_id VARCHAR(64) NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    old_status VARCHAR(32),
    new_status VARCHAR(32),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION log_seller_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO seller_status_audit (seller_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_seller_status_change ON sellers;
CREATE TRIGGER trigger_seller_status_change
AFTER UPDATE ON sellers
FOR EACH ROW
EXECUTE FUNCTION log_seller_status_change();

-- Audit order status changes.
CREATE TABLE IF NOT EXISTS order_status_audit (
    audit_id SERIAL PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status VARCHAR(32),
    new_status VARCHAR(32),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_audit (order_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_status_change ON orders;
CREATE TRIGGER trigger_order_status_change
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION log_order_status_change();

-- Prevent cart quantities from exceeding current product stock.
CREATE OR REPLACE FUNCTION check_cart_stock()
RETURNS TRIGGER AS $$
DECLARE
    available_stock INTEGER;
BEGIN
    SELECT stock INTO available_stock FROM products WHERE id = NEW.product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory Error: Product % does not exist.', NEW.product_id;
    END IF;

    IF NEW.quantity IS NULL OR NEW.quantity > COALESCE(available_stock, 0) THEN
        RAISE EXCEPTION 'Inventory Error: Cannot add % units. Only % units available.', NEW.quantity, COALESCE(available_stock, 0);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_cart_stock ON cart;
CREATE TRIGGER trigger_check_cart_stock
BEFORE INSERT OR UPDATE ON cart
FOR EACH ROW
EXECUTE FUNCTION check_cart_stock();

-- Reject products owned by sellers who are not approved.
CREATE OR REPLACE FUNCTION enforce_seller_status_on_product()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_status VARCHAR(32);
BEGIN
    SELECT status INTO v_seller_status FROM sellers WHERE id = NEW.seller_id;

    IF v_seller_status IS NULL OR v_seller_status IN ('suspended', 'rejected') THEN
        RAISE EXCEPTION 'Data Validation Failed: Cannot insert or update product. Seller % is currently %.', NEW.seller_id, v_seller_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_product_seller ON products;
DROP FUNCTION IF EXISTS validate_product_seller();
DROP TRIGGER IF EXISTS trigger_enforce_seller_status ON products;
CREATE TRIGGER trigger_enforce_seller_status
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION enforce_seller_status_on_product();

CREATE OR REPLACE FUNCTION get_customer_lifetime_value(p_customer_id VARCHAR)
RETURNS NUMERIC AS $$
DECLARE
    total_spent NUMERIC;
BEGIN
    SELECT COALESCE(SUM(subtotal + shipping_fee), 0.00)
    INTO total_spent
    FROM orders
    WHERE customer_id = p_customer_id
      AND status = 'delivered';

    RETURN total_spent;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_seller_average_rating(p_seller_id VARCHAR)
RETURNS NUMERIC AS $$
DECLARE
    avg_rating NUMERIC(3, 2);
BEGIN
    SELECT COALESCE(AVG(r.rating), 0.00)
    INTO avg_rating
    FROM reviews r
    JOIN products p ON r.product_id = p.id
    WHERE p.seller_id = p_seller_id;

    RETURN avg_rating;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_cart_subtotal(p_customer_id VARCHAR)
RETURNS NUMERIC AS $$
DECLARE
    cart_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(c.quantity * p.price), 0.00)
    INTO cart_total
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.customer_id = p_customer_id;

    RETURN cart_total;
END;
$$ LANGUAGE plpgsql;
