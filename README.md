# Kuis If-Else + SQL — 20 Soal

Paket ini memakai GitHub Pages untuk hosting dan Supabase PostgreSQL untuk menyimpan soal, memeriksa jawaban, menghitung nilai, serta menyimpan hasil siswa.

## Isi folder
- `index.html` — halaman kuis
- `assets/css/style.css` — tampilan
- `assets/js/config.js` — konfigurasi Supabase
- `assets/js/quiz.js` — memuat soal dari SQL dan mengirim jawaban ke fungsi RPC
- `supabase/schema.sql` — setup project baru: tabel, view, fungsi penilaian, 20 soal
- `supabase/upgrade_10_to_20.sql` — migrasi dari versi lama 10 soal ke 20 soal

## Jika project Supabase belum memiliki database kuis
1. Buka Supabase → SQL Editor → New query.
2. Jalankan seluruh `supabase/schema.sql`.
3. Isi `assets/js/config.js` dengan Project URL dan publishable/anon key.
4. Unggah semua file ke repository GitHub dan aktifkan Settings → Pages (branch `main`, folder root).

## Jika sudah memakai versi kuis 10 soal
1. Backup data terlebih dahulu.
2. Jalankan `supabase/upgrade_10_to_20.sql` di SQL Editor. Script migrasi tidak menghapus hasil nilai lama, tetapi constraint baru mengharuskan pengiriman baru berisi 20 soal.
3. Pastikan 20 soal tampil pada website.
4. Deploy versi file website terbaru ke GitHub Pages.

## Nilai siswa
Guru membuka Supabase → Table Editor → `quiz_results`. Setiap soal bernilai 5 poin; nilai dihitung oleh SQL. Browser tidak menerima kunci jawaban.

## Keamanan
Jangan pernah memasukkan service_role key ke file frontend. Key publik hanya digunakan bersama RLS dan RPC. Fungsi publik masih dapat dipanggil oleh pengunjung, jadi untuk ujian resmi tambahkan autentikasi siswa dan/atau pembatasan percobaan.


## Alur login yang ditambahkan
- Saat website dibuka, siswa masuk melalui `login.html` dan mengisi nama serta kelas.
- Tombol **Mulai Kuis** mengarahkan siswa ke `index.html`.
- Jika halaman kuis dibuka tanpa sesi login, siswa diarahkan kembali ke `login.html`.
- Setelah jawaban berhasil dikirim dan nilai tersimpan, siswa diarahkan kembali ke halaman login.
- Login ini hanya mengumpulkan nama dan kelas, bukan autentikasi akun/password. Nilai tetap dihitung dan disimpan oleh fungsi SQL Supabase.
