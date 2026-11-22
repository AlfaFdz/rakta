# RAKTA: Sistem Manajemen Gudang

RAKTA adalah aplikasi manajemen gudang untuk mencatat inventaris stok, mutasi barang masuk dan keluar, pengadaan restock ke supplier, serta verifikasi mitra supplier. Aplikasi ini dibangun menggunakan Next.js (App Router), PostgreSQL tanpa ORM (koneksi pool via paket `pg`), dan Tailwind CSS.

## Prasyarat Sistem

Sebelum memulai instalasi, pastikan sistem komputer Anda telah terpasang:
- Node.js (versi 18.18+ atau 20+ LTS)
- npm (bawaan dari Node.js)
- PostgreSQL (versi 14+) yang berjalan di port default 5432
- Klien PostgreSQL (`psql` CLI atau GUI seperti pgAdmin / DBeaver)

## Langkah Instalasi dan Setup Lokal

### 1. Instalasi Dependensi
Buka terminal pada direktori proyek, lalu pasang dependensi:
```bash
npm install
```

### 2. Konfigurasi File Lingkungan
Salin file template `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Buka `.env.local` pada text editor dan sesuaikan kredensial PostgreSQL lokal Anda:
```env
DATABASE_URL=postgresql://postgres:password_anda@localhost:5432/db_rakta
JWT_SECRET=rahasia_rakta_2026
```

### 3. Pembuatan Database dan Impor Skema Awal
Pastikan layanan PostgreSQL sedang berjalan. Buat database bernama `db_rakta` dan impor skema awal dari `database/db_rakta.sql`.

#### Opsi A: Menggunakan Terminal (psql)
```bash
createdb -U postgres db_rakta
psql -U postgres -d db_rakta -f database/db_rakta.sql
```

#### Opsi B: Menggunakan pgAdmin 4
1. Buka pgAdmin 4 dan buat database baru dengan nama `db_rakta`.
2. Klik kanan pada database `db_rakta`, lalu buka **Query Tool**.
3. Buka atau salin isi file `database/db_rakta.sql` ke dalam Query Tool.
4. Jalankan skrip query (tekan tombol **Execute** atau F5).

### 4. Menjalankan Server Pengembangan
Jalankan server aplikasi Next.js dalam mode pengembangan:
```bash
npm run dev
```

Akses aplikasi melalui peramban web di:
```
http://localhost:3000
```

## Tabel Akun Demo Bawaan

Database telah dilengkapi akun bawaan untuk pengujian alur kerja multi-peran:

| Peran | Email | Password | Nama Pengguna | Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| Administrator | `admin@rakta.id` | `password123` | Alfaridzi | Master produk, kategori, verifikasi supplier |
| Warehouse Manager | `manager@rakta.id` | `password123` | Regi Maulana | Pengajuan restock (PO), pemantauan stok, transaksi |
| Staff Gudang | `staff@rakta.id` | `password123` | Ilham Kurniawan | Stock opname rak, penerimaan barang PO, mutasi gudang |

Untuk menguji peran **Supplier**, daftarkan akun baru melalui halaman registrasi (`/register`). Setelah itu, masuk menggunakan akun **Administrator** untuk menyetujui akun supplier tersebut pada menu **Verifikasi Supplier** (`/suppliers`).
