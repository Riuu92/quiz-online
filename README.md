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
