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

## Roadmap Pengembangan Multi-Mata-Pelajaran

Tujuan utama roadmap ini adalah agar guru dapat **menambah dan memilih beberapa mata pelajaran dari satu website**, dengan bank soal dan rekap nilai terpisah per mata pelajaran. Backend tetap menggunakan Google Apps Script dan Google Sheets; GitHub Pages tetap menjadi hosting frontend.

> **Status saat ini:** versi dasar kuis sudah berjalan untuk satu bank soal. Multi-mata-pelajaran belum dianggap selesai sebelum seluruh kriteria penerimaan pada milestone terkait terpenuhi. Urutan milestone di bawah adalah urutan pengerjaan yang disarankan, bukan klaim bahwa fiturnya sudah tersedia.

### Ringkasan milestone

| ID | Milestone GitHub | Prioritas | Hasil utama | Ketergantungan |
|---|---|---|---|---|
| M0 | Stabilkan dan cadangkan versi aktif | Wajib | Versi kuis yang saat ini berjalan aman untuk dijadikan baseline | — |
| M1 | Siapkan struktur data multi-mapel | Wajib | `MataPelajaran`, `subject_id` pada soal, data lama tetap aman | M0 |
| M2 | Tambahkan pemilih mata pelajaran | Wajib | Siswa dapat memilih mapel sebelum mulai mengerjakan | M1 |
| M3 | Muat dan nilai soal secara dinamis per mapel | Wajib | Setiap mapel memuat bank soal dan jumlah soal yang sesuai | M1, M2 |
| M4 | Simpan nilai dan riwayat per mapel | Wajib | Setiap hasil tercatat bersama mata pelajaran dan percobaan | M3 |
| M5 | Pengelolaan bank soal yang mudah untuk guru | Berikutnya | Guru dapat menambah/mengimpor dan mengaktifkan soal melalui Sheets | M1–M4 |
| M6 | Rekap nilai, ekspor, dan penguatan keamanan | Berikutnya | Rekap per mapel/kelas, CSV, dan pengujian keamanan lebih baik | M4, M5 |

---

### M0 — Stabilkan dan cadangkan versi aktif

**Tujuan:** memastikan versi yang sudah berjalan dapat dipulihkan sebelum struktur database diubah.

**Issue yang dikerjakan:**
- [ ] Buat salinan/backup spreadsheet Google Sheets yang saat ini aktif.
- [ ] Catat URL Web App `/exec` yang benar; jangan menyimpan URL privat sebagai rahasia di README publik.
- [ ] Catat branch dan file frontend yang benar-benar dipublikasikan oleh GitHub Pages.
- [ ] Uji satu alur lengkap: login → muat 20 soal → kirim jawaban → nilai tersimpan di `Nilai` → kembali ke login.
- [ ] Simpan contoh hasil pengujian dan pastikan kunci jawaban tidak dikirim dalam respons soal.

**Kriteria selesai:** alur kuis versi saat ini berhasil diuji; backup dapat dibuka; ada cara untuk memulihkan frontend dan spreadsheet jika migrasi gagal.

### M1 — Siapkan struktur data multi-mapel

**Tujuan:** menambahkan dukungan banyak mapel tanpa menghilangkan data kuis yang sekarang.

**Perubahan Google Sheets:**
- [ ] Buat tab `MataPelajaran` dengan kolom `subject_id`, `subject_name`, `subject_code`, `description`, `active`.
- [ ] Tambahkan kolom `subject_id` pada tab `Soal`.
- [ ] Isi `subject_id` untuk seluruh 20 soal lama, misalnya `informatika`.
- [ ] Gunakan ID yang stabil dan unik seperti `informatika`, `matematika`, dan `bahasa-indonesia`; jangan menggunakan nama tampilan sebagai ID utama.
- [ ] Jangan menghapus atau mengganti kolom lama yang sedang digunakan backend sampai kode kompatibel siap.

**Contoh baris `MataPelajaran`:**

| subject_id | subject_name | subject_code | description | active |
|---|---|---|---|---|
| `informatika` | Informatika | INF | If-Else, interaksi tombol, dan dasar SQL | TRUE |
| `matematika` | Matematika | MAT | Bank soal Matematika | FALSE |
| `bahasa-indonesia` | Bahasa Indonesia | BIN | Bank soal Bahasa Indonesia | FALSE |

Mapel selain Informatika dapat tetap `FALSE` sampai soal dan pengujiannya siap.

**Kriteria selesai:** setiap soal lama terkait dengan satu `subject_id`; 20 soal lama tetap dapat dibaca; data hasil lama tetap utuh; mapel aktif/nonaktif bisa dikelola melalui Sheets.

### M2 — Tambahkan pemilih mata pelajaran

**Tujuan:** membuat alur siswa memilih mapel setelah mengisi identitas.

**Issue yang dikerjakan:**
- [ ] Tambahkan endpoint baca `getSubjects` yang hanya mengembalikan mapel aktif.
- [ ] Tambahkan tampilan pilih mapel pada alur login, sebelum masuk ke halaman pengerjaan.
- [ ] Simpan `subject_id` pilihan ke sesi kuis bersama identitas siswa.
- [ ] Tampilkan nama mapel di judul halaman kuis.
- [ ] Berikan pesan yang jelas jika daftar mapel kosong atau mapel belum mempunyai soal aktif.
- [ ] Pastikan siswa tidak dapat memulai kuis dengan `subject_id` kosong atau mapel nonaktif.

**Kriteria selesai:** setelah guru menambahkan baris mapel baru yang aktif di `MataPelajaran`, mapel tersebut muncul di halaman pilihan tanpa mengubah daftar mapel langsung di HTML. Mapel tetap tidak dapat dipakai untuk kuis sampai bank soalnya tersedia.

### M3 — Muat soal dan hitung nilai secara dinamis per mapel

**Tujuan:** mengganti asumsi satu set 20 soal menjadi bank soal yang difilter berdasarkan mapel.

**Issue yang dikerjakan:**
- [ ] Perluas `getQuestions` untuk menerima `subject_id` dan hanya memuat soal aktif milik mapel itu.
- [ ] Validasi `subject_id` di backend; jangan hanya mempercayai nilai yang dikirim browser.
- [ ] Pastikan respons soal tidak mengandung `correct_option` atau `explanation`.
- [ ] Hapus asumsi jumlah soal selalu 20 pada frontend dan backend.
- [ ] Hitung nilai berdasarkan jumlah soal yang benar-benar dikirim: `jumlah benar / total soal × 100`.
- [ ] Saat menerima jawaban, periksa bahwa seluruh ID soal berasal dari mapel yang dipilih dan jumlah jawabannya valid.
- [ ] Tentukan perilaku untuk mapel tanpa soal aktif: tampilkan pesan dan jangan mulai kuis.

**Kriteria selesai:** dua mapel dapat memiliki bank soal dengan jumlah berbeda, misalnya 20 soal Informatika dan 10 soal Matematika, serta masing-masing dinilai benar berdasarkan total soalnya sendiri. Kunci jawaban tetap diproses server-side.

### M4 — Simpan nilai dan riwayat per mapel

**Tujuan:** memastikan guru dapat membedakan hasil siswa untuk setiap mapel dan setiap percobaan.

**Issue yang dikerjakan:**
- [ ] Tambahkan `subject_id` dan `subject_name` pada hasil yang disimpan ke tab `Nilai`.
- [ ] Simpan `total_questions`, `correct_count`, `score`, `student_name`, `student_class`, dan `submitted_at` secara konsisten.
- [ ] Tambahkan `attempt_id` unik untuk identifikasi satu pengiriman; rancang pemeriksaan agar klik kirim berulang tidak membuat hasil ganda tanpa sengaja.
- [ ] Pastikan redirect kembali ke login hanya dilakukan setelah backend mengonfirmasi hasil tersimpan.
- [ ] Pastikan hasil dari mapel berbeda dapat dibedakan meskipun nama dan kelas siswa sama.
- [ ] Uji kegagalan jaringan dan periksa spreadsheet sebelum mengizinkan siswa mengirim ulang.

**Kriteria selesai:** tab `Nilai` menyimpan mapel dan total soal untuk setiap hasil; hasil lama tetap terbaca; pengiriman sukses diikuti alur hasil singkat lalu kembali ke login.

### M5 — Pengelolaan bank soal untuk guru

**Tujuan:** memudahkan guru menambah atau memperbarui soal tanpa mengedit JavaScript setiap kali ada materi/mapel baru.

**Issue yang dikerjakan:**
- [ ] Dokumentasikan template impor CSV/Google Sheets untuk bank soal.
- [ ] Validasi kolom wajib, ID soal unik, `subject_id` terdaftar, opsi A–D tidak kosong, dan `correct_option` hanya `1`–`4`.
- [ ] Gunakan kolom `active` untuk mengaktifkan/menonaktifkan soal tanpa menghapusnya.
- [ ] Pertimbangkan kolom `topic`, `difficulty`, dan `question_order` bila diperlukan untuk memilih soal berdasarkan bab atau tingkat kesulitan.
- [ ] Dokumentasikan prosedur pratinjau dan pengujian sebelum mapel diaktifkan untuk siswa.
- [ ] Baru setelah kebutuhan jelas, pertimbangkan halaman admin terpisah; jangan menaruh kata sandi atau kunci admin di JavaScript publik.

**Kriteria selesai:** guru dapat menambah bank soal dengan mengikuti template dan validasi, lalu mengaktifkannya tanpa mengubah kode website untuk setiap mapel.

### M6 — Rekap nilai, ekspor, dan penguatan keamanan

**Tujuan:** memudahkan analisis hasil dan menyiapkan aplikasi untuk penggunaan kelas yang lebih luas.

**Issue yang dikerjakan:**
- [ ] Tambahkan filter rekap menurut mata pelajaran, kelas, dan tanggal.
- [ ] Tambahkan ekspor CSV dengan header yang jelas.
- [ ] Tambahkan identitas percobaan/kode ujian atau autentikasi yang lebih kuat daripada nama dan kelas saja.
- [ ] Terapkan validasi server-side untuk mapel, ID soal, jumlah jawaban, dan percobaan.
- [ ] Uji mapel nonaktif, mapel tanpa soal, soal tidak valid, nilai 0/100, jaringan terputus, klik kirim berulang, dan redirect ke login.
- [ ] Dokumentasikan batas kuota Google Apps Script/Sheets, backup rutin, serta pemulihan data.

**Kriteria selesai:** guru dapat merekap dan mengekspor hasil per mapel; skenario kesalahan utama diuji; batas keamanan dan pemulihan sudah terdokumentasi.

---

## Membuat GitHub Milestones dan Issues

Agar roadmap ini bisa dilacak di GitHub, buat milestone berikut melalui **Issues → Milestones → New milestone**. Nama milestone harus sama dengan judul pada tabel ringkasan.

Untuk setiap milestone, buat satu issue untuk setiap kelompok tugas di bagian milestone terkait, lalu tetapkan milestone pada issue tersebut. Tandai issue selesai hanya setelah kriteria penerimaan milestone terpenuhi. Hindari menandai semua fitur roadmap sebagai selesai hanya karena README sudah diperbarui.

**Urutan implementasi yang direkomendasikan:**

1. Selesaikan M0 terlebih dahulu sebagai baseline yang aman.
2. Kerjakan M1 dan uji kompatibilitas data lama.
3. Kerjakan M2 agar siswa bisa memilih mapel.
4. Kerjakan M3 agar soal dan penilaian benar-benar dinamis.
5. Kerjakan M4 agar nilai terhubung dengan mapel.
6. Setelah alur inti stabil, lanjutkan M5 dan M6.

**Definisi selesai untuk fitur multi-mapel inti:** setidaknya dua mapel aktif, bank soal terpisah, jumlah soal dapat berbeda, kunci jawaban tidak terkirim ke browser, nilai tersimpan bersama identitas mapel, dan seluruh alur login → pilih mapel → kuis → simpan nilai → kembali login telah diuji.
