/**
 * Backend kuis If-Else + SQL menggunakan Google Sheets.
 * Jalankan setupQuizSpreadsheet() satu kali sebelum deploy sebagai Web App.
 * Kunci jawaban hanya dipakai di Apps Script dan tidak dikirim ke frontend.
 */
const QUESTIONS_SHEET = "Soal";
const RESULTS_SHEET = "Nilai";
const TOTAL_QUESTIONS = 20;
const RESPONSE_CACHE_SECONDS = 300;

const SEED_QUESTIONS = [
  [1, 1, "Apa fungsi utama percabangan if-else dalam JavaScript?", "Mengulang perintah tanpa henti", "Memilih aksi berdasarkan kondisi", "Menyimpan data ke tabel", "Mengubah ukuran halaman", 2, "if-else memilih jalur aksi berdasarkan kondisi benar atau salah.", true],
  [2, 2, "Apa arti kondisi hover === true?", "Variabel hover diberi nilai false", "Nilai dan tipe hover dibandingkan dengan true", "Program selalu menjalankan else", "Variabel hover dihapus", 2, "Operator === membandingkan nilai dan tipe data.", true],
  [3, 3, "Operator JavaScript yang digunakan untuk memberikan nilai kepada variabel adalah ...", "===", "==", "=", "&&", 3, "Tanda = adalah operator penugasan.", true],
  [4, 4, "Kapan blok else dijalankan?", "Ketika kondisi if bernilai false", "Setiap kali halaman dibuka", "Hanya ketika kondisi if true", "Hanya di dalam perulangan", 1, "else berjalan ketika kondisi if tidak terpenuhi.", true],
  [5, 5, "Event yang terjadi ketika kursor memasuki area tombol adalah ...", "mouseleave", "mouseenter", "keydown", "submit", 2, "mouseenter terjadi saat pointer memasuki area elemen.", true],
  [6, 6, "Event yang cocok untuk mendeteksi kursor meninggalkan tombol adalah ...", "mouseenter", "click", "mouseleave", "change", 3, "mouseleave terjadi saat pointer keluar dari area elemen.", true],
  [7, 7, "Jika hover bernilai true dan blok if mengatur warna tombol menjadi biru, hasilnya adalah ...", "Warna tombol menjadi biru", "Blok else selalu berjalan", "Browser tertutup", "Tombol dihapus", 1, "Kondisi true menjalankan blok if.", true],
  [8, 8, "Apa kegunaan document.getElementById('tombol')?", "Membuat elemen baru", "Mengambil elemen HTML berdasarkan ID tombol", "Menghapus seluruh tombol", "Menyimpan nilai ke SQL", 2, "getElementById mengambil elemen berdasarkan atribut id.", true],
  [9, 9, "Apa fungsi textContent pada JavaScript?", "Mengubah teks dalam elemen", "Mengubah alamat IP", "Membuat tabel SQL", "Mendeteksi kursor keluar", 1, "textContent membaca atau mengubah teks elemen.", true],
  [10, 10, "Jika kondisi if bernilai false, perintah pada blok if ...", "Tetap dijalankan", "Dilewati dan blok else dapat dijalankan", "Diubah menjadi komentar", "Dijalankan dua kali", 2, "Ketika kondisi false, blok if dilewati.", true],
  [11, 11, "Apa kepanjangan SQL?", "Structured Query Language", "Simple Question Logic", "System Quick Link", "Style Query Layout", 1, "SQL adalah Structured Query Language.", true],
  [12, 12, "Perintah SQL untuk membaca data dari tabel adalah ...", "INSERT", "UPDATE", "SELECT", "DELETE", 3, "SELECT digunakan untuk mengambil data.", true],
  [13, 13, "Perintah SQL untuk menambahkan baris data baru adalah ...", "INSERT INTO", "SELECT FROM", "ALTER ONLY", "READ TABLE", 1, "INSERT INTO menambahkan baris baru.", true],
  [14, 14, "Perintah SQL untuk mengubah data yang sudah ada adalah ...", "CREATE", "UPDATE", "SELECT", "GRANT", 2, "UPDATE mengubah nilai pada baris yang memenuhi kondisi.", true],
  [15, 15, "Perintah SQL untuk menghapus baris data adalah ...", "DROP ROW", "REMOVE", "DELETE FROM", "CLEAR TABLE", 3, "DELETE FROM menghapus baris dari tabel.", true],
  [16, 16, "Pada SQL, klausa WHERE digunakan untuk ...", "Mengurutkan data saja", "Memfilter baris berdasarkan kondisi", "Membuat warna tombol", "Menghitung jumlah halaman", 2, "WHERE membatasi baris yang diproses sesuai kondisi.", true],
  [17, 17, "Apa fungsi PRIMARY KEY pada tabel SQL?", "Menentukan warna tabel", "Mengidentifikasi setiap baris secara unik", "Menyimpan kata sandi plaintext", "Mengurutkan CSS", 2, "Primary key harus mengidentifikasi baris secara unik.", true],
  [18, 18, "Apa fungsi NOT NULL pada kolom SQL?", "Kolom wajib memiliki nilai, tidak boleh NULL", "Kolom hanya boleh berisi angka genap", "Kolom otomatis dihapus", "Kolom menjadi kunci asing otomatis", 1, "NOT NULL mencegah nilai NULL pada kolom.", true],
  [19, 19, "Dalam Supabase, tabel quiz_results pada proyek ini digunakan untuk menyimpan ...", "Warna tombol saja", "Nama, kelas, nilai, dan waktu pengerjaan siswa", "File CSS", "Daftar ekstensi browser", 2, "Tabel hasil menyimpan informasi pengumpulan kuis.", true],
  [20, 20, "Mengapa service_role key Supabase tidak boleh diletakkan di JavaScript publik?", "Karena hanya mendukung CSS", "Karena dapat memberi hak akses istimewa dan membahayakan database", "Karena membuat SQL tidak bisa SELECT", "Karena mengganti HTML menjadi PHP", 2, "service_role key bersifat rahasia dan dapat melewati Row Level Security.", true]
];

function setupQuizSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty("SPREADSHEET_ID");
  let spreadsheet;

  if (existingId) {
    spreadsheet = SpreadsheetApp.openById(existingId);
    ensureSheets_(spreadsheet, false);
  } else {
    spreadsheet = SpreadsheetApp.create("Database Kuis If-Else dan SQL");
    props.setProperty("SPREADSHEET_ID", spreadsheet.getId());
    ensureSheets_(spreadsheet, true);
  }

  console.log("Spreadsheet URL: " + spreadsheet.getUrl());
  Logger.log("Spreadsheet URL: " + spreadsheet.getUrl());
  return spreadsheet.getUrl();
}

function ensureSheets_(spreadsheet, seedQuestions) {
  let questions = spreadsheet.getSheetByName(QUESTIONS_SHEET);
  if (!questions) {
    const firstSheet = spreadsheet.getSheets()[0];
    if (firstSheet && firstSheet.getLastRow() === 0) {
      firstSheet.setName(QUESTIONS_SHEET);
      questions = firstSheet;
    } else {
      questions = spreadsheet.insertSheet(QUESTIONS_SHEET);
    }
  }

  const questionHeaders = ["id", "question_order", "question_text", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation", "active"];
  if (questions.getLastRow() === 0) {
    questions.getRange(1, 1, 1, questionHeaders.length).setValues([questionHeaders]);
  }
  if (seedQuestions && questions.getLastRow() === 1) {
    questions.getRange(2, 1, SEED_QUESTIONS.length, questionHeaders.length).setValues(SEED_QUESTIONS);
  }
  formatHeader_(questions, questionHeaders.length);
  questions.setFrozenRows(1);
  questions.getRange("A:A").setNumberFormat("0");
  questions.getRange("B:B").setNumberFormat("0");
  questions.getRange("H:H").setNumberFormat("0");
  questions.autoResizeColumns(1, questionHeaders.length);
  questions.setColumnWidth(3, 360);
  questions.setColumnWidth(4, 220);
  questions.setColumnWidth(5, 260);
  questions.setColumnWidth(6, 220);
  questions.setColumnWidth(7, 220);
  questions.setColumnWidth(9, 360);

  let results = spreadsheet.getSheetByName(RESULTS_SHEET);
  if (!results) results = spreadsheet.insertSheet(RESULTS_SHEET);
  const resultHeaders = ["id", "student_name", "student_class", "score", "correct_count", "total_questions", "submitted_at"];
  if (results.getLastRow() === 0) results.getRange(1, 1, 1, resultHeaders.length).setValues([resultHeaders]);
  formatHeader_(results, resultHeaders.length);
  results.setFrozenRows(1);
  results.getRange("A:A").setNumberFormat("@");
  results.getRange("D:F").setNumberFormat("0");
  results.getRange("G:G").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  results.autoResizeColumns(1, resultHeaders.length);
  results.setColumnWidth(2, 230);
  results.setColumnWidth(3, 130);
}

function formatHeader_(sheet, columns) {
  sheet.getRange(1, 1, 1, columns)
    .setFontWeight("bold")
    .setBackground("#1f3a5f")
    .setFontColor("#ffffff")
    .setWrap(true);
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || "getQuestions");
  let response;
  try {
    if (action === "getQuestions") {
      response = getPublicQuestions_();
    } else if (action === "getSubmissionResult") {
      response = getSubmissionResult_(String(params.request_id || ""));
    } else {
      response = { ok: false, error: "Aksi tidak dikenal." };
    }
  } catch (error) {
    response = { ok: false, error: safeError_(error) };
  }
  return outputResponse_(response, params.callback);
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  let requestId = String(params.request_id || "");
  try {
    const payload = JSON.parse(String(params.payload || "{}"));
    if (!requestId) requestId = String(payload.request_id || "");
    const result = gradeAndSave_(payload);
    cacheResponse_(requestId, result);
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    const response = { ok: false, error: safeError_(error) };
    cacheResponse_(requestId, response);
    return ContentService.createTextOutput("ERROR").setMimeType(ContentService.MimeType.TEXT);
  }
}

function getPublicQuestions_() {
  const rows = getActiveQuestions_();
  if (rows.length !== TOTAL_QUESTIONS) {
    throw new Error("Tab Soal harus memiliki tepat 20 soal aktif. Ditemukan: " + rows.length + ".");
  }
  return {
    ok: true,
    questions: rows.map(q => ({
      id: q.id,
      question_order: q.question_order,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d
    }))
  };
}

function gradeAndSave_(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Format pengiriman tidak valid.");
  const name = String(payload.student_name || "").trim();
  const studentClass = String(payload.student_class || "").trim();
  if (name.length < 1 || name.length > 100) throw new Error("Nama siswa wajib diisi, maksimal 100 karakter.");
  if (studentClass.length < 1 || studentClass.length > 30) throw new Error("Kelas wajib diisi, maksimal 30 karakter.");

  const questions = getActiveQuestions_();
  if (questions.length !== TOTAL_QUESTIONS) throw new Error("Kuis harus memiliki tepat 20 soal aktif.");
  if (!Array.isArray(payload.answers) || payload.answers.length !== TOTAL_QUESTIONS) throw new Error("Semua 20 soal wajib dijawab.");

  const questionById = Object.create(null);
  questions.forEach(q => { questionById[String(q.id)] = q; });
  const answerById = Object.create(null);

  payload.answers.forEach(answer => {
    const id = String(answer && answer.question_id != null ? answer.question_id : "");
    const selected = Number(answer && answer.selected_option);
    if (!Object.prototype.hasOwnProperty.call(questionById, id)) throw new Error("Ada ID soal yang tidak valid.");
    if (Object.prototype.hasOwnProperty.call(answerById, id)) throw new Error("Ada soal yang dikirim lebih dari satu kali.");
    if (![1, 2, 3, 4].includes(selected)) throw new Error("Pilihan jawaban tidak valid.");
    answerById[id] = selected;
  });
  if (Object.keys(answerById).length !== TOTAL_QUESTIONS) throw new Error("Semua 20 soal harus dijawab satu kali.");

  let correctCount = 0;
  questions.forEach(q => {
    if (Number(q.correct_option) === answerById[String(q.id)]) correctCount++;
  });
  const score = Math.round((correctCount / TOTAL_QUESTIONS) * 100);
  const submittedAt = new Date();
  const spreadsheet = getSpreadsheet_();
  const resultSheet = spreadsheet.getSheetByName(RESULTS_SHEET);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let resultId;
  try {
    resultId = Utilities.getUuid();
    resultSheet.appendRow([resultId, name, studentClass, score, correctCount, TOTAL_QUESTIONS, submittedAt]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return {
    ok: true,
    result: {
      result_id: resultId,
      score: score,
      correct_count: correctCount,
      total_questions: TOTAL_QUESTIONS,
      submitted_at: submittedAt.toISOString()
    }
  };
}

function getActiveQuestions_() {
  const sheet = getSpreadsheet_().getSheetByName(QUESTIONS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) throw new Error("Tab Soal kosong atau belum dibuat. Jalankan setupQuizSpreadsheet().");
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(v => String(v).trim());
  const index = Object.create(null);
  headers.forEach((header, i) => { index[header] = i; });
  const required = ["id", "question_order", "question_text", "option_a", "option_b", "option_c", "option_d", "correct_option", "active"];
  required.forEach(header => { if (index[header] == null) throw new Error("Kolom " + header + " tidak ditemukan pada tab Soal."); });
  return values
    .filter(row => isActive_(row[index.active]))
    .map(row => ({
      id: String(row[index.id]).trim(),
      question_order: Number(row[index.question_order]),
      question_text: String(row[index.question_text] == null ? "" : row[index.question_text]),
      option_a: String(row[index.option_a] == null ? "" : row[index.option_a]),
      option_b: String(row[index.option_b] == null ? "" : row[index.option_b]),
      option_c: String(row[index.option_c] == null ? "" : row[index.option_c]),
      option_d: String(row[index.option_d] == null ? "" : row[index.option_d]),
      correct_option: Number(row[index.correct_option])
    }))
    .filter(q => q.id && q.question_text.trim() && q.option_a.trim() && q.option_b.trim() && q.option_c.trim() && q.option_d.trim())
    .sort((a, b) => a.question_order - b.question_order);
}

function isActive_(value) {
  if (value === true || value === 1) return true;
  const text = String(value).trim().toLowerCase();
  return text === "true" || text === "ya" || text === "yes" || text === "aktif" || text === "1";
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("Spreadsheet belum diinisialisasi. Jalankan setupQuizSpreadsheet() dari editor Apps Script.");
  return SpreadsheetApp.openById(id);
}

function getSubmissionResult_(requestId) {
  if (!/^[A-Za-z0-9-]{8,100}$/.test(requestId)) return { ok: false, error: "ID pengiriman tidak valid." };
  const cached = CacheService.getScriptCache().get("quiz-result-" + requestId);
  if (!cached) return { ok: false, pending: true, error: "Hasil sedang diproses. Coba lagi." };
  return JSON.parse(cached);
}

function cacheResponse_(requestId, response) {
  if (!/^[A-Za-z0-9-]{8,100}$/.test(String(requestId || ""))) return;
  CacheService.getScriptCache().put("quiz-result-" + requestId, JSON.stringify(response), RESPONSE_CACHE_SECONDS);
}

function outputResponse_(data, callback) {
  const safeJson = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const cb = String(callback || "");
  if (cb) {
    if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(cb)) {
      return ContentService.createTextOutput("Invalid callback").setMimeType(ContentService.MimeType.TEXT);
    }
    return ContentService.createTextOutput(cb + "(" + safeJson + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(safeJson).setMimeType(ContentService.MimeType.JSON);
}

function safeError_(error) {
  const message = error && error.message ? error.message : String(error || "Terjadi kesalahan pada server.");
  return message.slice(0, 300);
}
