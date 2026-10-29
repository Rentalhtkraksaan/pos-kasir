# POS Kasir Architecture Suite & Reseller License Engine

> **Sistem Aplikasi Kasir POS Komersial Multi-Tier (100% Offline-First & Cloud Mesh) dengan Proteksi Lisensi Kriptografi Anti-Tamper & Area Mitra Reseller.**

[![License](https://img.shields.io/badge/License-Commercial%20Proprietary-blue.svg)](#)
[![Web Crypto API](https://img.shields.io/badge/Security-Web%20Crypto%20API-emerald.svg)](#)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20Vanilla%20JS-indigo.svg)](#)

---

## 🌟 Ringkasan Ekosistem

Repositori ini berisi solusi lengkap aplikasi kasir dari skala UMKM mikro hingga korporasi franchise multi-cabang, yang dibagi menjadi 3 tingkatan (*tiers*) komersial serta 1 modul inti (*core security*) pelindung pembajakan:

| Modul / Tingkatan | Nilai Retail | Tema Visual & Target Bisnis | Fitur Unggulan |
| :--- | :--- | :--- | :--- |
| **Landing Page & Reseller Hub** | - | Obsidian Dark `#070A12` | Landing page komersial, live interactive sandbox demo, WhatsApp direct order, manajemen dompet reseller diskon 50%, generator serial key, & 17 unit tests. |
| **Tier 1: Starter Core** | **Rp 100.000** | Light Minimalist `#F8FAFC`<br>*(Toko Kelontong, Kios, Laundry)* | 100% Offline-first, Product CRUD, Quick stock adjuster (`+`/`-`), instant checkout, diskon & pajak (PB1/PPN), cetak thermal 58mm, laba kotor harian & export CSV. |
| **Tier 2: Business Studio** | **Rp 450.000** | Modern Slate Duo `#1E293B`<br>*(Cafe, Restoran, Barbershop)* | Dual-role PIN (Owner `8888` vs Kasir), denah meja dine-in 1-12, split bill otomatis, varian & modifiers dinamis, audit rekonsiliasi kasir (deteksi fraud selisih laci), dual slip 58mm/80mm (pelanggan & tiket dapur), backup JSON terenkripsi. |
| **Tier 3: Autonomous Mesh** | **Rp 1.800.000** | Cybernetic Glass `#090D16`<br>*(Franchise, Resto Besar, Cloud OS)* | Multi-cabang & gudang routing, BOM resep bahan baku gram/ml desimal, Dynamic QRIS payment gateway simulation (auto-settlement webhook), KDS Dapur live bridge + priority bump, WhatsApp e-receipt dispatch, Executive BI waterfall & AI depletion alert, audit trail SHA-256. |

---

## 🛡️ Arsitektur Keamanan & Lisensi Reseller (Prompt 0)

Sistem ini dilindungi oleh modul kriptografi independen tanpa ketergantungan server luar (`js/license-core.js`):
1. **Hardware Node Lock (SHA-256)**: Mengikat lisensi ke sidik jari hardware (User-Agent, Canvas 2D render hash, Audio Context frequency dynamics, Screen Depth). Format Machine-ID: `MACH-XXXX-XXXX-XXXX-XXXX`.
2. **Offline HMAC-SHA256 Verification**: Format Serial Key: `POS-[TIER]-[EXPIRE_TIMESTAMP]-[RANDOM_SALT]-[SIGNATURE]`. Validasi dilakukan secara *constant-time comparison* tanpa risiko pembobolan keygen palsu.
3. **Enkripsi AES-GCM 256-Bit**: Seluruh data transaksi dan omzet dienkripsi dengan PBKDF2 salt dan IV 96-bit standar militer.
4. **Monotonic Clock Rollback Guard**: Mendeteksi jika jam sistem dimundurkan untuk memperpanjang lisensi atau memalsukan audit.
5. **Reseller Quota & Wallet Engine**: Reseller mendapatkan diskon grosir 50% dari harga retail dan dapat menerbitkan serial key berlisensi resmi langsung dari panel.

---

## 🚀 Struktur Direktori

```
d:/laragon/www/kasir/
├── index.html                   # Landing page komersial, live sandbox demo, & hub reseller
├── js/
│   └── license-core.js          # Core Security & Reseller License Engine (Web Crypto API)
├── test/
│   └── unit-tests.js            # Automated Unit Test Suite (17 Pengujian Lulus)
├── tier1/
│   └── index.html               # POS Tier 1 — Starter Core (Light Minimalist)
├── tier2/
│   └── index.html               # POS Tier 2 — Business Studio (Hybrid Slate Duo)
├── tier3/
│   └── index.html               # POS Tier 3 — Autonomous Mesh (Executive Cyber-Glass)
├── server.js                    # Local static development server
└── .gitignore                   # Git ignore file
```

---

## 💻 Cara Menjalankan

### 1. Menjalankan Server Lokal (Node.js)
```bash
node server.js
```
Buka browser di `http://localhost:3000/`.

### 2. Menggunakan Laragon / Apache
Cukup letakkan folder ini di `d:\laragon\www\kasir`, lalu buka `http://localhost/kasir/` di browser Anda.

### 3. Menjalankan 17 Pengujian Kriptografi Otomatis
```bash
node test/unit-tests.js
```
Atau klik tombol **"Jalankan Unit Tests"** langsung di dalam browser pada Landing Page.

---

## 📄 Lisensi
Hak Cipta (c) 2026 Rentalhtkraksaan. Seluruh Hak Cipta Dilindungi Undang-Undang.
