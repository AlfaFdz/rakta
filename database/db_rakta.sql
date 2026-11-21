-- =============================================================================
-- RAKTA - Sistem Manajemen Gudang
-- Skema Database: PostgreSQL (db_rakta)
-- Lokasi: database/db_rakta.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DROP EXISTING TABLES (Pembersihan tabel agar dapat di-reimpor secara bersih)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS transaction_items CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS restock_items CASCADE;
DROP TABLE IF EXISTS restock_orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- 2. TABEL: users
-- Menyimpan seluruh akun pengguna sistem (Admin, Manager, Staff Gudang, Supplier)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'warehouse_manager', 'staff_gudang', 'supplier')),
    status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    nama_perusahaan VARCHAR(200),
    kontak VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. TABEL: categories
-- Kategori produk untuk pengelompokan barang di gudang
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) UNIQUE NOT NULL,
    deskripsi TEXT,
    gambar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. TABEL: products
-- Master barang/produk gudang beserta informasi level stok dan lokasi rak
-- -----------------------------------------------------------------------------
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(80) UNIQUE NOT NULL,
    nama VARCHAR(200) NOT NULL,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    deskripsi TEXT,
    harga_beli NUMERIC(15, 2) NOT NULL DEFAULT 0,
    harga_jual NUMERIC(15, 2) NOT NULL DEFAULT 0,
    stok_minimum INT NOT NULL DEFAULT 10 CHECK (stok_minimum >= 0),
    stok_low INT NOT NULL DEFAULT 20 CHECK (stok_low > stok_minimum),
    jumlah_stok INT NOT NULL DEFAULT 0 CHECK (jumlah_stok >= 0),
    unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
    lokasi_rak VARCHAR(50),
    gambar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. TABEL: restock_orders
-- Pengajuan pesanan pengadaan/restock ke supplier (Purchase Order / PO)
-- -----------------------------------------------------------------------------
CREATE TABLE restock_orders (
    id SERIAL PRIMARY KEY,
    nomor_po VARCHAR(100) UNIQUE NOT NULL,
    supplier_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    tanggal_order TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estimasi_tiba DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'in_transit', 'received')),
    catatan TEXT,
    catatan_status TEXT,
    rating_supplier INT CHECK (rating_supplier BETWEEN 1 AND 5),
    ulasan_supplier TEXT,
    dibuat_oleh INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. TABEL: restock_items
-- Rincian produk dan kuantitas dalam pesanan restock
-- -----------------------------------------------------------------------------
CREATE TABLE restock_items (
    id SERIAL PRIMARY KEY,
    restock_order_id INT NOT NULL REFERENCES restock_orders(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    qty INT NOT NULL CHECK (qty > 0)
);

-- -----------------------------------------------------------------------------
-- 7. TABEL: transactions
-- Catatan transaksi logistik barang masuk dan barang keluar
-- -----------------------------------------------------------------------------
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    nomor_transaksi VARCHAR(100) UNIQUE NOT NULL,
    tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('masuk', 'keluar')),
    tanggal_transaksi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    restock_order_id INT REFERENCES restock_orders(id) ON DELETE SET NULL,
    supplier_id INT REFERENCES users(id) ON DELETE SET NULL,
    tujuan_customer VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'shipped')),
    catatan TEXT,
    alasan_penolakan TEXT,
    dibuat_oleh INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    disetujui_oleh INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. TABEL: transaction_items
-- Rincian produk dan kuantitas dalam transaksi logistik
-- -----------------------------------------------------------------------------
CREATE TABLE transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    qty INT NOT NULL CHECK (qty > 0)
);

-- -----------------------------------------------------------------------------
-- 9. INDEKS OPTIMASI PENCARIAN
-- -----------------------------------------------------------------------------
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_transactions_tipe ON transactions(tipe);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_restock_orders_status ON restock_orders(status);

-- =============================================================================
-- DATA AWAL (SEEDING)
-- =============================================================================

-- Akun Default (Password: password123 di-hash menggunakan bcryptjs)
-- Hash: $2b$10$oQe783ltFIOKhHCp/LyWp.UwLtehrGQL5NDqlUdnBlB.M.jc.AC.S
INSERT INTO users (nama, email, password_hash, role, status, nama_perusahaan, kontak) VALUES
('Administrator Gudang', 'admin@rakta.id', '$2b$10$oQe783ltFIOKhHCp/LyWp.UwLtehrGQL5NDqlUdnBlB.M.jc.AC.S', 'admin', 'approved', 'PT Rakta Logistik Utama', '081234567890'),
('Budi Santoso', 'manager@rakta.id', '$2b$10$oQe783ltFIOKhHCp/LyWp.UwLtehrGQL5NDqlUdnBlB.M.jc.AC.S', 'warehouse_manager', 'approved', 'PT Rakta Logistik Utama', '081234567891'),
('Ahmad Fauzi', 'staff@rakta.id', '$2b$10$oQe783ltFIOKhHCp/LyWp.UwLtehrGQL5NDqlUdnBlB.M.jc.AC.S', 'staff_gudang', 'approved', 'PT Rakta Logistik Utama', '081234567892');

-- Data Kategori Contoh
INSERT INTO categories (nama, deskripsi, gambar_url) VALUES
('Elektronik & Perangkat', 'Perangkat pemindai, timbangan digital, sensor, dan aksesoris elektronik pergudangan.', '/images/categories/electronics.png'),
('Perkakas & Alat Kerja', 'Peralatan mekanik, obeng, kunci pas, tangga lipat, dan perkakas teknis.', '/images/categories/tools.png'),
('Material & Kemasan', 'Kardus packing berbagai ukuran, bubble wrap, lakban industri, dan plastik wrapping.', '/images/categories/packaging.png');

-- Data Produk Contoh dengan Variasi Level Stok:
-- 1. Barcode Scanner: Stok Aman (jumlah_stok 65 > stok_low 20)
-- 2. Kotak Kardus A3: Stok Menipis/Low (jumlah_stok 22 <= stok_low 35 dan > stok_min 15)
-- 3. Lakban Coklat 2 Inch: Stok Kritis/Dibawah Min (jumlah_stok 8 <= stok_min 20)
-- 4. Obeng Set Presisi: Stok Kosong/Out of Stock (jumlah_stok 0)
INSERT INTO products (sku, nama, category_id, deskripsi, harga_beli, harga_jual, stok_minimum, stok_low, jumlah_stok, unit, lokasi_rak, gambar_url) VALUES
('ELK-SCN-001', 'Barcode Scanner 2D Wireless Portable', 1, 'Pemindai barcode 1D dan 2D QR Code nirkabel dengan koneksi Bluetooth & USB dongle 2.4GHz.', 350000.00, 450000.00, 10, 20, 65, 'unit', 'A-01-02', '/images/products/scanner.png'),
('PKG-KRD-002', 'Kotak Kardus Packing Double Wall A3', 3, 'Kardus gelombang tebal ukuran A3 (45 x 30 x 30 cm) untuk pengemasan barang berat.', 4500.00, 7500.00, 15, 35, 22, 'pcs', 'C-03-01', '/images/products/box-a3.png'),
('PKG-LKB-003', 'Lakban Coklat Heavy Duty 2 Inch 100 Yard', 3, 'Pita perekat OPP coklat daya rekat tinggi untuk segel kardus kemasan pengiriman.', 12000.00, 18000.00, 20, 40, 8, 'roll', 'C-02-04', '/images/products/tape.png'),
('TLS-OBG-004', 'Obeng Set Presisi 32-in-1 Magnetik Multi-fungsi', 2, 'Satu set obeng teknisi lengkap berbagai jenis mata obeng untuk reparasi alat elektronik.', 65000.00, 95000.00, 5, 15, 0, 'set', 'B-01-01', '/images/products/screwdrivers.png');