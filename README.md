# Kuis If-Else + SQL — Google Sheets

Aplikasi kuis Informatika berisi 20 soal pilihan ganda tentang percabangan JavaScript (`if-else`), interaksi tombol, dan dasar SQL. Frontend di-host melalui GitHub Pages, sedangkan bank soal, penilaian, dan penyimpanan nilai menggunakan Google Sheets yang diakses melalui Google Apps Script.

**Aplikasi:** https://mousesalt.github.io/quiz-sql/login.html  
**Repository:** https://github.com/mousesalt/quiz-sql

> **Database aktif:** Google Sheets + Google Apps Script. Supabase tidak diperlukan untuk menjalankan versi ini.

## Fitur

- Login sederhana dengan nama dan kelas siswa.
- 20 soal pilihan ganda; seluruh soal harus dijawab sebelum dikirim.
- Penilaian dilakukan di Google Apps Script, bukan di browser siswa.
- Nilai dan waktu pengerjaan disimpan pada tab `Nilai` di Google Sheets.
- Endpoint baca soal tidak mengirim kunci jawaban atau penjelasan jawaban ke browser.
- Frontend menggunakan JSONP untuk membaca data lintas domain dari GitHub Pages; pengiriman hasil menggunakan POST melalui form tersembunyi dan konfirmasi hasil melalui endpoint JSONP.
- Percobaan ulang otomatis untuk kegagalan pemuatan JSONP sementara.
- Setelah hasil berhasil disimpan, nilai ditampilkan selama sekitar 3 detik, sesi identitas siswa dihapus, lalu browser otomatis kembali ke `login.html`.

## Arsitektur

```text
Siswa
  └─ GitHub Pages (login.html, index.html, assets/)
       └─ Google Apps Script Web App (/exec)
            ├─ Membaca bank soal dari tab `Soal`
            ├─ Memeriksa jawaban dan menghitung nilai di server
            └─ Menyimpan hasil ke tab `Nilai`
```

Spreadsheet tidak perlu dibagikan ke siswa. Apps Script mengakses spreadsheet menggunakan otorisasi pemilik deployment.

## Alur setelah kuis dikirim

1. Siswa mengisi nama dan kelas pada `login.html`.
2. Siswa menjawab semua 20 soal dan menekan **Kirim Jawaban & Simpan Nilai**.
3. Google Apps Script menghitung nilai dan menyimpan hasil ke tab `Nilai`.
4. Jika penyimpanan terkonfirmasi berhasil, halaman menampilkan ringkasan nilai selama sekitar **3 detik**.
5. Setelah itu, data sesi `ifelseQuizStudent` dihapus dari `sessionStorage`, lalu browser diarahkan kembali ke `login.html` menggunakan `location.replace()` agar halaman kuis yang sudah dikirim tidak terbuka kembali melalui tombol Back.

Jika penyimpanan gagal atau belum terkonfirmasi, pengalihan otomatis **tidak** dilakukan. Siswa melihat pesan kesalahan agar guru dapat memeriksa tab `Nilai` sebelum mencoba ulang.

> Patch otomatis kembali ke login hanya berlaku jika perubahan `assets/js/quiz.js` dan pembaruan versi script di `index.html` sudah dipasang pada branch yang dipublikasikan GitHub Pages. Jangan mengganti `assets/js/config.js`; pertahankan URL Apps Script `/exec` yang saat ini berfungsi.

## Penyiapan backend Google Sheets

### 1. Buat atau periksa spreadsheet

1. Buka [Google Apps Script](https://script.google.com/home/start) dan buat proyek baru jika belum memiliki backend.
2. Salin kode backend dari [`google-apps-script/Code.gs`](google-apps-script/Code.gs) ke file `Code.gs` di proyek Apps Script.
3. Simpan, lalu pilih fungsi `setupQuizSpreadsheet` dan klik **Jalankan**.
4. Berikan izin yang diminta Google. URL spreadsheet tercatat di log eksekusi sebagai `Spreadsheet URL: ...`.
5. Buka spreadsheet dan pastikan terdapat tab `Soal` dengan 20 soal serta tab `Nilai` untuk hasil pengerjaan.

Fungsi setup menyimpan ID spreadsheet pada Script Properties (`SPREADSHEET_ID`). Jika sudah diinisialisasi, fungsi memakai spreadsheet yang sama. Jangan menghapus properti tersebut atau membuat spreadsheet baru untuk perbaikan biasa.

Jika pilihan soal nomor 3 (operator `===`, `==`, dan `=`) menunjukkan `#ERROR!`, pilih fungsi `repairQuestion3Options` di Apps Script lalu jalankan. Fungsi ini memperbaiki pilihan itu sebagai teks biasa tanpa membuat database baru.

### 2. Deploy sebagai Web App

1. Di Apps Script, pilih **Deploy → New deployment** (atau **Manage deployments → Edit** untuk deployment yang sudah digunakan).
2. Pilih jenis **Web app**.
3. Atur **Execute as** ke **Me**.
4. Atur akses agar dapat digunakan tanpa login siswa, misalnya **Anyone**, jika opsi ini diizinkan oleh kebijakan akun Google/Google Workspace.
5. Klik **Deploy** dan salin URL Web App yang berakhir dengan `/exec`.

Setiap kali kode `Code.gs` diubah, gunakan **Deploy → Manage deployments → Edit → New version → Deploy** agar perubahan aktif. Jika deployment yang sama diperbarui, pertahankan URL-nya.

### 3. Hubungkan frontend ke Apps Script

Buka [`assets/js/config.js`](assets/js/config.js) dan isi variabel URL dengan URL Web App milik Anda:

```js
window.GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/ID_DEPLOYMENT/exec";
```

Ganti URL contoh di atas dengan URL asli. URL harus berakhir `/exec`, bukan `/dev`, URL spreadsheet, atau URL `script.googleusercontent.com` hasil pengalihan.

Commit dan push perubahan frontend ke branch yang digunakan GitHub Pages. Untuk repository ini, periksa **Settings → Pages** guna memastikan branch dan folder publikasi sesuai dengan tempat file disimpan.

## Uji sebelum dipakai siswa

### Uji endpoint JSONP

Buka URL berikut di browser dengan mengganti URL contoh dengan URL deployment sebenarnya:

```text
https://script.google.com/macros/s/ID_DEPLOYMENT/exec?action=getQuestions&callback=test123
```

Respons yang diharapkan dimulai seperti berikut dan berisi 20 soal:

```js
test123({"ok":true,"questions":[ ... ]});
```

Parameter `callback=test123` penting untuk menguji format JSONP yang digunakan frontend. Respons JSON biasa tanpa callback hanya membuktikan endpoint GET biasa dapat menghasilkan JSON; itu belum memastikan dukungan JSONP.

### Uji alur kuis lengkap

1. Buka halaman login GitHub Pages.
2. Masukkan nama dan kelas uji, lalu mulai kuis.
3. Jawab 20 soal dan kirim jawaban.
4. Pastikan website menampilkan nilai dan status penyimpanan berhasil.
5. Buka Google Sheets → tab `Nilai` dan pastikan baris hasil baru sesuai dengan percobaan uji.

Gunakan nama uji dahulu sebelum membagikan kuis ke kelas.

## Struktur Google Sheets

### Tab `Soal`

Header yang digunakan backend:

| Kolom | Keterangan |
|---|---|
| `id` | ID unik soal |
| `question_order` | Urutan soal |
| `question_text` | Teks pertanyaan |
| `option_a`–`option_d` | Empat pilihan jawaban |
| `correct_option` | Indeks jawaban benar: `1` = A, `2` = B, `3` = C, `4` = D |
| `explanation` | Penjelasan untuk pengelola; tidak dikirim ke browser siswa |
| `active` | Status soal aktif; gunakan `TRUE` untuk soal yang dipakai |

Backend saat ini memerlukan tepat **20 soal aktif**. Jika mengubah jumlah atau format soal, frontend dan backend perlu diperbarui bersama.

### Tab `Nilai`

| Kolom | Keterangan |
|---|---|
| `id` | ID unik hasil pengerjaan |
| `student_name` | Nama siswa |
| `student_class` | Kelas siswa |
| `score` | Nilai skala 0–100 |
| `correct_count` | Jumlah jawaban benar |
| `total_questions` | Jumlah soal (20) |
| `submitted_at` | Waktu pengiriman |

Nilai dihitung di server dengan rumus `jumlah benar / 20 × 100` sehingga setiap soal bernilai 5 poin.

## Berkas utama

- `index.html` — halaman kuis.
- `login.html` — halaman input nama dan kelas.
- `assets/css/style.css` — tampilan aplikasi.
- `assets/js/config.js` — URL deployment Google Apps Script.
- `assets/js/login.js` — sesi identitas siswa di browser.
- `assets/js/quiz.js` — pemuatan soal, pengiriman jawaban, dan tampilan nilai.
- `google-apps-script/Code.gs` — backend Google Apps Script, bila disimpan dalam repository.
- `README_GOOGLE_SHEETS.md` — panduan pemasangan tambahan, jika tersedia di repository.

## Pemecahan masalah

### Soal gagal dimuat

1. Periksa `assets/js/config.js`; URL harus merupakan URL Web App `/exec` yang benar.
2. Uji endpoint JSONP dengan `?action=getQuestions&callback=test123`.
3. Pastikan deployment mengizinkan akses tanpa login dan versi deployment sudah diperbarui.
4. Pastikan tab `Soal` memiliki 20 soal aktif dan kolom yang sesuai dengan header di atas.
5. Buka DevTools browser → **Console** dan **Network** untuk melihat error yang lebih rinci.
6. Jika endpoint berhasil dites langsung tetapi halaman masih menggunakan pesan/kode lama, pastikan file frontend terbaru sudah di-commit ke branch GitHub Pages, lalu lakukan hard refresh (`Ctrl+Shift+R`).

### Hasil tidak tersimpan

- Pastikan `Code.gs` pada deployment aktif mendukung `doPost`, penilaian, penyimpanan ke tab `Nilai`, dan aksi `getSubmissionResult`.
- Periksa **Apps Script → Executions** untuk melihat apakah ada eksekusi gagal.
- Setelah mengubah backend, deploy sebagai **New version**.
- Jika pengiriman tampak timeout, periksa tab `Nilai` terlebih dahulu sebelum mengirim ulang agar tidak membuat hasil duplikat secara tidak sengaja.

## Keamanan dan batasan

- Jangan meletakkan password, token privat, atau kunci rahasia di file frontend.
- Jangan memberikan akses editor spreadsheet kepada siswa; hanya pemilik/operator tepercaya yang perlu mengakses tab `Soal` dan kunci jawaban.
- Login nama/kelas hanya untuk pencatatan identitas, bukan autentikasi akun. Siswa dapat menggunakan nama berbeda dan endpoint publik dapat menerima kiriman berulang.
- Untuk ujian berisiko tinggi, tambahkan autentikasi siswa, kode ujian/percobaan, pembatasan pengiriman, serta pemantauan penyalahgunaan sebelum digunakan.
- Aplikasi bergantung pada ketersediaan dan kuota Google Apps Script/Google Sheets. Terapkan perlindungan tambahan sebelum dipakai dalam skala besar.

## Roadmap

### Selesai / tersedia

- [x] Memindahkan pembacaan bank soal dan penyimpanan nilai dari Supabase ke Google Sheets + Google Apps Script.
- [x] Memuat 20 soal aktif dari tab `Soal`.
- [x] Menghitung nilai di backend agar kunci jawaban tidak dikirim ke browser.
- [x] Menyimpan nama, kelas, jumlah jawaban benar, nilai, dan waktu pengerjaan pada tab `Nilai`.
- [x] Mendukung pembacaan lintas domain dari GitHub Pages melalui JSONP dan pengiriman hasil melalui POST.
- [x] Memperbaiki penyimpanan operator JavaScript seperti `===`, `==`, dan `=` sebagai teks biasa di Google Sheets.
- [x] Mengarahkan siswa kembali ke halaman login sekitar 3 detik setelah nilai berhasil disimpan, sekaligus menghapus sesi siswa pada browser.

### Rencana pengembangan

- [ ] Menambahkan kode peserta atau autentikasi yang lebih kuat daripada nama dan kelas.
- [ ] Menambahkan perlindungan percobaan ganda/idempotensi agar satu sesi ujian tidak menghasilkan nilai duplikat.
- [ ] Membuat halaman rekap guru dengan pencarian, filter kelas, dan ekspor CSV.
- [ ] Menambahkan pengacakan urutan soal/pilihan serta opsi batas waktu yang bisa diatur guru.
- [ ] Menambahkan pemeriksaan kesehatan endpoint dan tes otomatis untuk alur login, pemuatan soal, pengiriman, serta penyimpanan nilai.

Roadmap ini mencatat status fitur yang ada dan arah pengembangan yang direncanakan; item pada bagian rencana belum dianggap tersedia sampai kode implementasinya dipublikasikan.

## Lisensi

Periksa file `LICENSE` pada repository jika tersedia. Jika belum ada, jangan mengasumsikan lisensi tertentu untuk penggunaan ulang atau distribusi kode.
