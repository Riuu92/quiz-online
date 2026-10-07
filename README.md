# ⚡ QuizLive - Platform Kuis Real-Time Interaktif

Aplikasi website kuis interaktif real-time berbasis **Node.js, Express, dan Socket.io**.

## ✨ Fitur Utama

1. **Masuk Tanpa Email (Nama Bebas + Avatar)**:
   - Pengguna bebas memasukkan nama panggilan apa saja dan memilih avatar karakter.
   - Tidak perlu registrasi email atau password.
2. **Lihat Siapa yang Sedang Online (Live Sync)**:
   - Ada indikator status online di navbar (`🟢 X Online`) dan tab **Teman Online**.
   - Ketika ada orang yang masuk atau keluar, daftar online langsung ter-update secara real-time via WebSocket.
3. **Pembuat Kuis Bebas**:
   - Pengguna bisa membuat kuis dengan judul, deskripsi, dan durasi per pertanyaan (15s, 20s, 30s, atau tanpa batas).
   - Bebas menambah pertanyaan dan opsi jawaban (A, B, C, D, ...).
   - Menentukan kunci jawaban yang benar dengan mudah.
4. **Proteksi Pembuat Kuis (Tidak Bisa Main Sendiri)**:
   - 🔒 **Aturan Khusus**: Pembuat kuis tidak dapat memainkan kuis buatannya sendiri.
   - Jika pembuat kuis membuka tautan kuisnya, sistem otomatis menampilkan **Dashboard Pembuat / Statistik Live** (melihat daftar teman yang sudah bermain, nilai mereka, dan durasi pengerjaan).
   - Di sisi server, terdapat validasi keamanan (HTTP 403) yang menolak submit jawaban dari pembuat kuis.
5. **Akses Kuis Khusus Lewat Link**:
   - Hanya orang yang memiliki tautan (`?quiz=ID_KUIS`) yang bisa memainkan kuis tersebut.
   - Tersedia tombol sekali klik **"Salin Link"** dan **"Kirim ke WhatsApp"**.
6. **Pengalaman Bermain Gamified**:
   - Penghitung waktu mundur (countdown timer) interaktif dengan efek suara detak jam saat waktu hampir habis.
   - Efek suara sintetis (Web Audio API) untuk pilihan, suara benar/salah, dan instrumen kemenangan (fanfare).
   - Efek ledakan confetti saat kuis selesai.
   - Pembahasan soal dan papan peringkat (Leaderboard).

---

## 🚀 Cara Menjalankan

### 1. Jalankan di Komputer Lokal
Di terminal PowerShell / Command Prompt:
```bash
cd "c:\Users\ndekk\Documents\quiz-online"
npm start
```
Buka di browser:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### 2. Main Bareng Teman di Satu Jaringan Wi-Fi / Hotspot
1. Cari alamat IP lokal komputermu di CMD / PowerShell:
   ```powershell
   ipconfig
   ```
   *(Cari IPv4 Address, contohnya `192.168.1.15`)*
2. Teman di HP atau laptop lain yang terhubung ke Wi-Fi / Hotspot yang sama tinggal buka:
   👉 `http://192.168.1.15:3000`
3. Begitu mereka masuk, kamu akan langsung melihat nama mereka muncul di daftar **Teman Online**!

---

### 3. Deploy ke Internet (Online Penuh)
Aplikasi ini sudah siap di-deploy gratis ke layanan hosting seperti:
- **Render.com** (Pilih New Web Service -> Hubungkan ke GitHub -> Build Command: `npm install` -> Start Command: `node server.js`)
- **Railway.app**
- Atau menggunakan tunneling sementara seperti **Cloudflare Tunnel / ngrok**:
  ```bash
  npx ngrok http 3000
  ```
