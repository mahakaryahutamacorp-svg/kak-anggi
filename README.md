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

- **Online**: Backend berjalan → login via SQLite server
- **Offline**: Backend tidak tersedia → login via IndexedDB lokal

## Build Desktop Ulang

Konfigurasi Neutralino ada di `desktop-build/neutralino.config.json`. Butuh [Neutralino CLI](https://neutralino.js.org/) untuk rebuild executable.
