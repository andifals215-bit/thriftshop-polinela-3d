# Thriftshop Polinela 3D - Web Application

A premium, modern dark-themed web application for **Thriftshop Polinela** featuring interactive 3D elements, user order flow via WhatsApp, and an admin catalog dashboard integrated with **SQL Server**.

## Fitur Utama

- **Aesthetics Premium:** Background hitam legam, aksen neon (ungu & cyan), efek blur kaca (*glassmorphism*), dan animasi mikro yang sangat halus.
- **Visualisasi 3D Interaktif:** Model 3D pakaian (T-Shirt & Hanger) yang berputar otomatis dan dapat diputar menggunakan *mouse drag* atau *touch swipe*.
- **Pemesanan Mudah via WhatsApp:** Keranjang belanja (cart) interaktif yang merangkum pesanan, mencatat alamat pengiriman, dan mengarahkan langsung ke WhatsApp Admin (`085783252484`) saat checkout.
- **Dashboard Admin:**
  - Login khusus admin dengan keamanan JWT.
  - CRUD Lengkap (Tambah, Edit, Hapus) produk.
  - Statistik data (Total produk, stok, kategori).
  - Status koneksi Database (Koneksi SQL Server vs. Failover Lokal).
- **Graceful Failover Database:** Jika SQL Server belum dikonfigurasi atau sedang mati, backend otomatis mendeteksi kegagalan koneksi dan beralih ke penyimpanan lokal (`data.json`) sehingga aplikasi tetap 100% berfungsi tanpa eror crash!

## Arsitektur & Teknologi

*   **Frontend:** React (Vite), Three.js (3D engine), Lucide Icons, Canvas Confetti.
*   **Backend:** Node.js, Express, JSON Web Token (JWT), Bcrypt.js.
*   **Database:** Microsoft SQL Server (menggunakan driver `mssql`).

---

## Panduan Instalasi & Pengaturan

### 1. Prasyarat
*   Sudah menginstal **Node.js** (v18 ke atas disarankan).
*   Sudah menginstal **Microsoft SQL Server** (lokal atau cloud).

### 2. Pengaturan Database SQL Server
1.  Buka **SQL Server Management Studio (SSMS)** atau DBMS SQL Server pilihan Anda.
2.  Buat database baru bernama `ThriftshopPolinelaDB` (atau nama lain):
    ```sql
    CREATE DATABASE ThriftshopPolinelaDB;
    ```
3.  Jalankan kueri SQL yang ada di file [backend/schema.sql](file:///c:/Users/Hype/Downloads/PROJEK/backend/schema.sql) untuk membuat tabel `Products` & `Admins` sekaligus mengisi data bawaan.
    *(Catatan: Jika koneksi sukses pertama kali, backend Express juga dirancang untuk membuat tabel ini secara otomatis).*

### 3. Konfigurasi Environment Variables
1.  Buka file [backend/.env](file:///c:/Users/Hype/Downloads/PROJEK/backend/.env).
2.  Sesuaikan kredensial SQL Server Anda:
    ```env
    PORT=5000
    JWT_SECRET=supersecretkeythriftshoppolinela3d2026

    # Konfigurasi SQL Server Anda
    DB_USER=sa
    DB_PASSWORD=password_sql_server_anda
    DB_SERVER=localhost
    DB_NAME=ThriftshopPolinelaDB
    DB_PORT=1433
    DB_TRUST_SERVER_CERTIFICATE=true
    ```

### 4. Instalasi Dependensi
Jalankan perintah ini di root folder `PROJEK` untuk menginstal seluruh dependensi backend, frontend, dan root secara otomatis:
```bash
npm run install:all
```

---

## Cara Menjalankan Aplikasi

Jalankan perintah berikut di root folder `PROJEK` untuk mengaktifkan server backend dan frontend React secara bersamaan:
```bash
npm run dev
```

*   **Aplikasi Client (Toko):** Buka [http://localhost:3000](http://localhost:3000) di browser Anda.
*   **Dashboard Admin:** Buka menu **Login Admin** di pojok kanan atas.
    *   **Username:** `admin`
    *   **Password:** `admin123`

---

## Kontak Integrasi WhatsApp
Seluruh tautan pemesanan checkout dan navigasi bantuan langsung terhubung dengan nomor WhatsApp pemilik toko: **0857-8325-2484** (`6285783252484`).
