# M3 Chicken POS

Aplikasi kasir offline-first untuk M3 Chicken (OKU Timur, Sumatera Selatan).

## Prasyarat

- **Node.js 18+** — [https://nodejs.org](https://nodejs.org)
- Windows (untuk mode desktop portable)

## Instalasi (sekali)

Buka terminal di folder `aplikasi toko`, lalu jalankan:

```bash
npm run install:backend
```

Perintah ini menginstall dependensi backend (Express + SQLite). Cukup dijalankan sekali.

> Jika server gagal start dengan error `NODE_MODULE_VERSION`, jalankan:
> `npm rebuild better-sqlite3 --prefix backend`

## Menjalankan Aplikasi

### Opsi 1 — Browser (disarankan untuk development)

Double-click **`start-web.bat`** atau:

```bash
npm start
```

Buka [http://localhost:3000](http://localhost:3000) jika browser tidak terbuka otomatis.

### Opsi 2 — Desktop (Neutralino)

Double-click **`start-pos.bat`**

Aplikasi desktop portable ada di folder `PORTABLE_APP/`. Backend API otomatis dinyalakan di port 3000.

## Akun Login Default

| Role  | Username | Password  |
|-------|----------|-----------|
| Owner | admin    | admin123  |
| Kasir | kasir    | kasir123  |

## Struktur Project

```
aplikasi toko/
├── index.html          # Shell aplikasi (Alpine.js)
├── assets/             # Bootstrap & styles
├── modules/            # Modul fitur (POS, menu, ledger, dll.)
├── lib/                # Library vendor (Alpine, Dexie, Tailwind CDN)
├── db/                 # Schema & seed IndexedDB
├── backend/            # API autentikasi + server web
│   ├── server.js
│   └── data/           # Database SQLite (auto-created)
├── PORTABLE_APP/       # Executable desktop Windows
└── start-web.bat       # Launcher mode browser
```

## Mode Autentikasi

- **Online**: Backend berjalan → login via database server (SQLite/MySQL)
- **Offline**: Backend tidak tersedia → login via IndexedDB lokal

## Pilihan Database (SQLite / MySQL)

Backend mendukung dua driver yang dipilih lewat variabel `DB_DRIVER` di file `.env`
(salin dari `backend/.env.example`):

| `DB_DRIVER` | Dipakai untuk | Catatan |
|-------------|---------------|---------|
| `sqlite` (default) | Lokal, desktop portable, development | File `backend/data/m3chicken.db`, tanpa konfigurasi tambahan |
| `mysql` | Server/Hostinger (produksi) | Butuh `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` |

Schema tabel dibuat otomatis saat server pertama kali dijalankan pada kedua driver.

### Menjalankan dengan MySQL secara lokal (opsional)

```bash
# backend/.env
DB_DRIVER=mysql
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=secret
MYSQL_DATABASE=m3chicken
```

## Backup Database ke Device

Login sebagai **owner** → buka **Pengaturan** → bagian **Backup Database ke Device**:

- **Backup .sql** — dump data dalam format SQL (`INSERT`), bisa di-restore ke MySQL via phpMyAdmin.
- **Backup .json** — arsip seluruh data dalam JSON.

File diunduh langsung ke perangkat. Endpoint backup hanya dapat diakses oleh owner
yang sedang login ke server (mode online).

> Restore `.sql` ke MySQL: jalankan aplikasi sekali agar tabel terbentuk, lalu
> import file `.sql` melalui phpMyAdmin (menu *Import*).

## Deploy ke Hostinger (domain ibusri.store)

Panduan untuk paket **Cloud/Business/Premium dengan fitur "Setup Node.js App"**.

### 1. Siapkan database MySQL
1. hPanel → **Databases → MySQL Databases**.
2. Buat database baru (mis. `u123456789_m3chicken`) + user + password.
3. Catat nilai host (umumnya `localhost`), nama database, user, dan password.

### 2. Upload aplikasi
1. Upload isi folder `aplikasi toko/` ke folder aplikasi (mis. `~/domains/ibusri.store/app`)
   via **File Manager** atau Git. Jangan ikut sertakan `node_modules/` dan `backend/data/`.

### 3. Setup Node.js App
1. hPanel → **Advanced → Setup Node.js App → Create Application**.
2. **Application root**: folder tempat upload (mis. `domains/ibusri.store/app`).
3. **Application startup file**: `backend/server.js`.
4. **Application URL**: `ibusri.store`.

### 4. Konfigurasi Environment Variables
Tambahkan di panel Node.js App (atau buat `backend/.env`):

```
DB_DRIVER=mysql
MYSQL_HOST=localhost
MYSQL_USER=u123456789_kasir
MYSQL_PASSWORD=password_anda
MYSQL_DATABASE=u123456789_m3chicken
```

> `PORT` diatur otomatis oleh Hostinger — jangan di-hardcode.

### 5. Install dependency & jalankan
1. Di panel Node.js App klik **Run NPM Install** (otomatis `npm install`).
   `better-sqlite3` bersifat opsional sehingga aman bila gagal di-compile saat memakai MySQL.
2. Klik **Restart/Start Application**.
3. Buka `https://ibusri.store` → login `admin` / `admin123`.

### 6. Domain & SSL
- Arahkan domain `ibusri.store` ke aplikasi (hPanel → Domains).
- Aktifkan **SSL gratis** (hPanel → SSL) agar berjalan via HTTPS.

> Frontend otomatis memakai origin yang sama (`window.location.origin`),
> jadi tidak perlu mengubah URL API setelah deploy.

> Setelah login, segera ganti password default akun owner & kasir.

## Build Desktop Ulang

Konfigurasi Neutralino ada di `desktop-build/neutralino.config.json`. Butuh [Neutralino CLI](https://neutralino.js.org/) untuk rebuild executable.
