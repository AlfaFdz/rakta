<img src="public/logo.svg" alt="Logo RAKTA" width="65" height="65" align="left" />

# RAKTA — Warehouse Management System

<br clear="left"/>

RAKTA adalah aplikasi sistem manajemen gudang (Warehouse Management System) berbasis web yang dirancang untuk mengelola inventaris produk, alur pengadaan barang (Purchase Order / Restock), mutasi barang masuk dan keluar, serta kemitraan supplier. Sistem ini dibangun dengan Next.js App Router, database PostgreSQL murni menggunakan koneksi pool `pg` (tanpa ORM), dan Tailwind CSS.

---

## Daftar Isi
1. [Fitur Utama dan Peran Pengguna](#fitur-utama-dan-peran-pengguna)
2. [Alur Operasional Barang](#alur-operasional-barang)
3. [Aturan Bisnis dan Validasi Sistem](#aturan-bisnis-dan-validasi-sistem)
4. [Teknologi yang Digunakan](#teknologi-yang-digunakan)
5. [Struktur Direktori Proyek](#struktur-direktori-proyek)
6. [Prasyarat Sistem](#prasyarat-sistem)
7. [Panduan Instalasi dan Setup Lokal](#panduan-instalasi-dan-setup-lokal)
8. [Tabel Akun Pengujian](#tabel-akun-pengujian)

---

## Fitur Utama dan Peran Pengguna

Sistem membagi hak akses ke dalam 4 peran dengan tanggung jawab operasional terpisah:

### 1. Administrator
- Akun dibuat dari data awal skema database (tidak tersedia registrasi publik).
- Memiliki hak akses penuh (CRUD) untuk Master Produk dan Master Kategori.
- Menyetujui (`Approved`) atau menolak (`Rejected` disertai alasan wajib) pendaftaran akun Mitra Supplier baru.
- Memantau metrik operasional gudang, total valuasi nilai inventori, dan log mutasi transaksi.

### 2. Warehouse Manager
- Akun dibuat dari data awal skema database (tidak tersedia registrasi publik).
- Memiliki hak akses penuh (CRUD) untuk Master Produk dan Master Kategori.
- Membuat pengajuan Restock Order (Purchase Order / PO) ke Mitra Supplier terdaftar.
- Memantau status pengiriman barang dari supplier.
- Menandai kedatangan barang untuk pemeriksaan fisik (`Inspecting`) dan meninjau laporan hasil cek fisik.
- Memberikan persetujuan (`Approved`) atau penolakan (`Rejected` disertai alasan wajib) pada formulir transaksi barang masuk dan barang keluar.
- Mengajukan klaim refund atau retur kepada Supplier apabila barang ditolak karena cacat fisik atau tidak sesuai spesifikasi.
- Memberikan penilaian performa bintang 1 sampai 5 kepada Supplier setelah pesanan selesai diterima.

### 3. Staff Gudang
- Akun dibuat dari data awal skema database (tidak tersedia registrasi publik).
- Melakukan pemeriksaan fisik (jumlah dan kondisi kemasan) saat barang restock tiba di gudang.
- Menginput dokumen transaksi barang masuk (Incoming Transaction) berdasarkan nomor PO yang berstatus `Inspecting`.
- Mengajukan dokumen transaksi barang keluar (Outgoing Transaction) ke customer atau tujuan distribusi.
- Mengubah rincian transaksi keluar atau membatalkannya selama dokumen masih berstatus `Pending`.
- Mengambil barang dari rak dan melakukan pengemasan (packing) untuk transaksi keluar yang telah disetujui (`Approved`).
- Menyelesaikan pengiriman barang dengan menekan tombol Kirim Barang (`Shipped`), yang secara langsung memotong stok fisik gudang.
- Melakukan penyesuaian stok fisik berkala (Stock Opname) pada katalog produk.

### 4. Mitra Supplier
- Mendaftar secara mandiri melalui formulir registrasi web dengan status awal `Pending` (menunggu persetujuan Administrator).
- Melihat daftar Purchase Order resmi yang diajukan oleh Warehouse Manager.
- Mengonfirmasi (`Confirmed`) pesanan jika menyanggupi pengadaan, atau menolak (`Rejected` disertai alasan wajib) jika kapasitas tidak tersedia.
- Mengubah status PO menjadi `In Transit` saat barang mulai diberangkatkan dari fasilitas supplier menuju gudang.
- Menginput nomor resi, catatan ekspedisi, dan menyerahkan dokumen bukti foto pengiriman/kedatangan.
- Memantau riwayat transaksi dan evaluasi rating pengiriman dari pihak gudang.

---

## Alur Operasional Barang

### 1. Alur Pengadaan Barang Masuk (Restock Order & Incoming Transaction)

Alur barang masuk menghubungkan modul Restock PO dengan Transaksi Masuk melalui tahapan berikut:

```
[PO: Pending]
      │
      ├─► (Supplier Menolak) ──► [PO: Rejected + Alasan] (Alur PO Berhenti)
      │
      └─► (Supplier Konfirmasi) ──► [PO: Confirmed]
                                           │
                                           ▼ (Supplier Kirim + Input Resi & Foto)
                                    [PO: In Transit]
                                           │
                                           ▼ (Manager Konfirmasi Tiba di Gudang)
                                    [PO: Inspecting]
                                           │
             ┌─────────────────────────────┴─────────────────────────────┐
             ▼                                                           ▼
   [Skenario 1: Fisik Sesuai]                                   [Skenario 2: Rusak / Cacat]
Staff input Transaksi Masuk (Pending)                        Staff catat laporan ketidaksesuaian
             │                                                           │
             ▼ (Manager Approve)                                         ▼ (Manager Reject)
     Transaksi: Approved                                         Transaksi: Rejected
     PO Status: Received                                         PO Status: Returned + Alasan
     Stok Produk: Bertambah (+)                                  Stok Produk: Tetap (Tidak Berubah)
                                                                 Manager ajukan Klaim Refund ke Supplier
```

Ketentuan Validasi Barang Masuk:
- Satu Nomor PO hanya dapat digunakan oleh satu dokumen Transaksi Masuk yang aktif (tidak berstatus `Rejected`).
- Kuantitas dan rincian produk pada Transaksi Masuk terisi otomatis sesuai kontrak pesanan PO.
- Penambahan stok fisik gudang dieksekusi secara atomik (`stock = stock + qty`) tepat saat Manager menyetujui (`Approved`) transaksi masuk.

### 2. Alur Pengeluaran Barang (Outgoing Transaction)

Alur barang keluar dirancang ringkas dengan eksekusi mutasi langsung saat barang meninggalkan area gudang:

```
[Staff Ajukan Transaksi: Pending]
(Validasi: Kuantitas <= Stok Fisik Riil)
(Staff dapat mengedit / membatalkan transaksi selama Pending)
      │
      ├─► (Manager Tolak) ──► [Status: Rejected + Alasan] (Stok Tetap)
      │
      └─► (Manager Setujui) ──► [Status: Approved]
                                (Stok belum berkurang, barang masuk tahap packing rak)
                                       │
                                       ▼ (Staff Selesai Packing & Serahkan Barang)
                                [Status: Shipped]
                                (Stok otomatis berkurang secara atomik)
```

---

## Aturan Bisnis dan Validasi Sistem

### 1. Perubahan Stok Fisik (Aturan Atomik)
- Stok Bertambah (`+`): Hanya dieksekusi sistem ketika dokumen Transaksi Masuk diubah statusnya menjadi `Approved` oleh Warehouse Manager.
- Stok Berkurang (`-`): Hanya dieksekusi sistem ketika dokumen Transaksi Keluar dieksekusi ke status `Shipped` oleh Staff Gudang.
- Seluruh mutasi stok berjalan dalam blok transaksi SQL (`BEGIN ... COMMIT`) dengan proteksi row-level lock (`FOR UPDATE`) untuk mencegah kondisi balapan (race condition).

### 2. Validasi Master Produk dan Kategori
- Kode SKU produk dan Nama Kategori wajib bersifat unik (case-insensitive).
- Saat mengubah data produk, seluruh kolom spesifikasi dapat disunting kecuali kode SKU (SKU bersifat terkunci permanen).
- Master Kategori hanya dapat dihapus apabila tidak memiliki produk yang terhubung di dalamnya.
- Menghapus produk yang masih memiliki sisa stok fisik akan memunculkan dialog peringatan khusus kepada pengguna. Produk yang sudah memiliki riwayat mutasi transaksi terkunci dari penghapusan demi menjaga integritas audit logistik.

### 3. Klasifikasi Level Stok Otomatis (Badge Warna)
Sistem menghitung status stok produk secara otomatis berdasarkan 4 level:
- `Out of Stock` (Abu-abu): Jumlah stok = 0
- `Severe` (Merah): 0 < Jumlah stok <= Stok Minimum
- `Low` (Kuning): Stok Minimum < Jumlah stok <= Stok Low (dengan validasi form `Stok Low > Stok Minimum`)
- `Normal` (Hijau): Jumlah stok > Stok Low

### 4. Kewajiban Catatan Penolakan
Setiap tindakan pembatalan atau penolakan status pada akun pengguna Supplier, pesanan restock (PO), dokumen transaksi masuk, maupun transaksi keluar wajib menyertakan teks alasan penolakan.

---

## Teknologi yang Digunakan

- Framework Inti: Next.js 16.4.6 (App Router)
- Library UI: React 19.3.0
- Desain Antarmuka: Tailwind CSS 4.3.3
- Database: PostgreSQL (Koneksi pool native via paket `pg` 8.23.1, tanpa ORM)
- Autentikasi: JSON Web Token via `jose` 6.2.18 (disimpan pada Cookie HTTP-Only)
- Enkripsi Kata Sandi: `bcryptjs` 3.0.3
- Paket Ikon: `lucide-react` 1.77.0
- Generator Kode QR: `qrcode` 1.5.4

---

## Struktur Direktori Proyek

```
rakta/
├── database/
│   └── db_rakta.sql               # Skema tabel DDL, relasi foreign key, dan data seed awal
├── public/
│   ├── logo.svg                   # Master vektor logo RAKTA
│   └── uploads/arrivals/          # Direktori penyimpanan bukti foto kedatangan barang
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/             # Halaman autentikasi masuk
│   │   │   ├── register/          # Formulir pendaftaran mitra supplier baru
│   │   │   └── pending/           # Halaman informasi akun supplier menunggu verifikasi
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/         # Dasbor analitik spesifik per peran (Admin, Manager, Staff, Supplier)
│   │   │   ├── products/          # Manajemen master produk, kontrol level stok, dan detail QR SKU
│   │   │   ├── categories/        # Manajemen kategori produk master
│   │   │   ├── transactions/      # Pengelolaan transaksi masuk dan pengeluaran barang keluar
│   │   │   ├── restock/           # Pengadaan purchase order, tracking resi, dan klaim refund
│   │   │   ├── suppliers/         # Panel verifikasi pendaftaran akun supplier (Khusus Admin)
│   │   │   └── users/             # Manajemen seluruh pengguna sistem (Khusus Admin)
│   │   ├── actions/               # Server Actions Next.js (auth, products, categories, restock, trx, users)
│   │   ├── globals.css            # Desain token tema rakta-* dan definisi tipografi
│   │   └── layout.js              # Layout root aplikasi dengan Plus Jakarta Sans & JetBrains Mono
│   ├── components/
│   │   ├── categories/            # Komponen antarmuka kategori
│   │   ├── products/              # Komponen tabel produk, modal input, dan kartu QR
│   │   ├── restock/               # Komponen alur PO, pengiriman supplier, dan klaim retur
│   │   ├── suppliers/             # Komponen tabel verifikasi supplier
│   │   ├── transactions/          # Komponen mutasi barang masuk dan pengeluaran keluar
│   │   ├── ui/                    # Komponen atomik: Button, Card, Input, StockBadge, ConfirmModal
│   │   └── Navbar.jsx             # Top Navbar terstruktur per peran pengguna
│   └── lib/
│       ├── auth.js                # Helper JWT session, enkripsi kata sandi, dan proteksi sesi
│       ├── db.js                  # Inisialisasi pool koneksi database PostgreSQL
│       ├── exportCsv.js           # Utilitas ekspor data laporan ke format CSV
│       └── format.js              # Pemformat mata uang Rupiah, tanggal lokal, dan hitung status stok
├── package.json
└── README.md
```

---

## Prasyarat Sistem

Sebelum menjalankan proyek, pastikan perangkat Anda telah terpasang:
- Node.js versi 18.18.0 atau versi 20+ LTS
- npm (Node Package Manager) bawaan Node.js
- PostgreSQL versi 14 atau lebih baru yang berjalan aktif pada port default 5432
- Database client (psql CLI, pgAdmin 4, atau DBeaver)

---

## Panduan Instalasi dan Setup Lokal

### 1. Mengunduh Dependensi
Buka terminal pada direktori root proyek `rakta`, lalu pasang dependensi:
```bash
npm install
```

### 2. Konfigurasi Variabel Lingkungan
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Buka file `.env.local` dan sesuaikan koneksi database PostgreSQL lokal Anda:
```env
DATABASE_URL=postgresql://postgres:password_lokal_anda@localhost:5432/db_rakta
JWT_SECRET=kunci_rahasia_rakta_jwt_2026
```

### 3. Pembuatan Database dan Impor Skema
Pastikan layanan PostgreSQL sedang berjalan. Buat database bernama `db_rakta` lalu impor skema dari `database/db_rakta.sql`.

#### Menggunakan Terminal (psql):
```bash
createdb -U postgres db_rakta
psql -U postgres -d db_rakta -f database/db_rakta.sql
```

#### Menggunakan pgAdmin 4:
1. Buat database baru bernama `db_rakta`.
2. Klik kanan pada database `db_rakta`, lalu pilih **Query Tool**.
3. Buka file `database/db_rakta.sql`, lalu jalankan query (tekan tombol **Execute** atau F5).

### 4. Menjalankan Server Aplikasi
Jalankan server Next.js pada mode pengembangan:
```bash
npm run dev
```

Buka peramban web dan akses:
```
http://localhost:3000
```

---

## Tabel Akun Pengujian

Database telah dilengkapi data awal pengguna untuk pengujian alur operasional:

| Peran | Alamat Email | Kata Sandi | Nama Pengguna | Tanggung Jawab Operasional |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin@rakta.id` | `password123` | Alfaridzi | Master produk, kategori, kelola akun, verifikasi supplier |
| **Warehouse Manager** | `manager@rakta.id` | `password123` | Regi Maulana | Master katalog, terbitkan PO restock, approval mutasi, klaim refund |
| **Staff Gudang** | `staff@rakta.id` | `password123` | Ilham Kurniawan | Cek fisik barang, input barang masuk PO, ajukan barang keluar, packing & shipped |

Untuk menguji peran **Mitra Supplier**:
1. Buka halaman `/register` dan isi formulir pendaftaran mitra perusahaan baru.
2. Akun baru akan masuk ke antrean status `Pending`.
3. Masuk menggunakan akun **Administrator** (`admin@rakta.id`), buka menu **Verifikasi Supplier** (`/suppliers`), lalu klik **Setujui Akun**.
4. Akun supplier kini aktif dan dapat digunakan untuk memproses pesanan restock pada modul `/restock`.


## Pengembang

- **Nama:** Ilmi Ahmad Alfaridzi
- **NIM:** H071251052
- **Program Studi:** Sistem Informasi
- **Institusi:** Universitas Hasanuddin
- **GitHub:** [@AlfaFdz](https://github.com/AlfaFdz)
