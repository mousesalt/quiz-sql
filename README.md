# Kuis If-Else + SQL — Google Sheets

Website kuis 20 soal Informatika (If-Else, interaksi tombol, dan dasar SQL) di-host di GitHub Pages, dengan penyimpanan nilai pada Google Sheets melalui Google Apps Script. Project ini tidak membutuhkan Supabase.

## Pasang backend

Ikuti langkah lengkap di [`README_GOOGLE_SHEETS.md`](README_GOOGLE_SHEETS.md): buat Apps Script, jalankan `setupQuizSpreadsheet()`, deploy sebagai Web App, lalu salin URL `/exec` ke `assets/js/config.js`.

## Fitur

- Login identitas berupa nama dan kelas.
- 20 soal pilihan ganda.
- Semua soal harus dijawab sebelum pengiriman.
- Nilai dihitung di Apps Script, bukan di browser siswa.
- Hasil disimpan ke tab `Nilai`.
- Kunci jawaban tidak dikirim oleh endpoint baca soal.

## Berkas utama

- `index.html` — halaman kuis.
- `login.html` — identitas siswa.
- `assets/css/style.css` — tampilan website (dipertahankan dari versi awal).
- `assets/js/config.js` — URL deployment Apps Script.
- `assets/js/quiz.js` — pembacaan soal dan pengiriman jawaban.
- `assets/js/login.js` — pengelolaan sesi identitas di browser.
- `google-apps-script/Code.gs` — backend yang dipasang pada proyek Google Apps Script.

**Catatan:** login nama/kelas bukan autentikasi. Untuk ujian resmi, pertimbangkan autentikasi siswa serta pembatasan percobaan.
