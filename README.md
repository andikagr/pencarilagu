# 🎵 PENCARI LAGU (Personal Music Player)

**PENCARI LAGU** adalah aplikasi web streaming musik pribadi yang memungkinkan Anda mencari, mendengarkan, dan mengelola lagu favorit Anda dengan antarmuka yang modern dan responsif. Aplikasi ini dirancang untuk memberikan pengalaman mendengarkan musik yang mulus, mirip dengan aplikasi streaming populer, namun dengan sentuhan personal.

## ✨ Fitur Utama

*   **Pencarian Lagu Canggih**: Cari lagu, artis, atau podcast favorit Anda dengan mudah menggunakan integrasi API eksternal.
*   **Pemutar Musik Interaktif**:
    *   **Mini Player**: Kontrol musik dasar yang selalu terlihat di bagian bawah layar.
    *   **Full Player**: Tampilan layar penuh dengan cover art, kontrol lengkap (play/pause, skip, seek), dan informasi lagu.
*   **Manajemen Library & Playlist**:
    *   Buat playlist pribadi Anda sendiri.
    *   Tambahkan lagu ke playlist favorit.
    *   Kustomisasi cover playlist dengan gambar pilihan Anda.
*   **Desain Responsif & Modern**: Tampilan antarmuka yang elegan (Dark Mode), ramah pengguna (Mobile-First), dan animasi transisi yang halus.
*   **Streaming Lancar**: Mendukung streaming audio langsung tanpa perlu mengunduh file secara manual.

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun menggunakan teknologi web modern:

*   **Frontend**:
    *   HTML5 & CSS3 (Warna kustom, Flexbox/Grid)
    *   Vanilla JavaScript (DOM Manipulation, Fetching Data)
    *   FontAwesome (Ikon antarmuka)
*   **Backend**:
    *   [Node.js](https://nodejs.org/)
    *   [Express.js](https://expressjs.com/) - Framework web server.
    *   [Axios](https://axios-http.com/) - HTTP Client untuk request ke API pihak ketiga.
*   **Deployment**:
    *   Konfigurasi siap untuk [Vercel](https://vercel.com/).

## 🚀 Cara Menjalankan Project

Ikuti langkah-langkah di bawah ini untuk menjalankan aplikasi di komputer lokal Anda:

### Prasyarat
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) di komputer Anda.

### Instalasi

1.  **Clone repositori ini** (atau download file project):
    ```bash
    git clone https://github.com/username-anda/pencarilagu.git
    cd pencarilagu
    ```

2.  **Install dependencies**:
    Jalankan perintah berikut di terminal untuk menginstal paket-paket yang diperlukan:
    ```bash
    npm install
    ```

3.  **Jalankan Server**:
    Mulai server lokal dengan perintah:
    ```bash
    npm start
    ```

4.  **Buka Aplikasi**:
    Buka browser Anda dan kunjungi alamat:
    ```
    http://localhost:3002
    ```
    (Port standar adalah 3002, Anda bisa mengubahnya di `.env` atau `server.js` jika diperlukan).

## 📂 Struktur Folder

```
pencarilagu/
├── api/             # Logika Backend (Proxy ke API eksternal)
│   └── index.js
├── public/          # File Statis Frontend
│   ├── index.html   # Halaman utama
│   ├── style.css    # Stylesheet
│   └── script.js    # Logika Frontend
├── server.js        # Entry point server Express
├── package.json     # Daftar dependensi dan skrip
└── vercel.json      # Konfigurasi deployment Vercel
```

## 📝 Catatan Penting

*   Aplikasi ini menggunakan layanan pihak ketiga untuk metadata dan streaming lagu. Pastikan koneksi internet Anda stabil.
*   Header khusus digunakan pada backend proxy untuk memastikan komunikasi dengan API berjalan lancar.

## 👨‍💻 Kredit

Dikembangkan oleh **TENJER FORUM**.
Dibuat dengan ❤️ untuk pecinta musik.
