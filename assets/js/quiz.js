const $ = id => document.getElementById(id);
const form = $("quizForm");
const questionsEl = $("questions");
let questions = [];
let submitted = false;
let submitting = false;
let studentSession = null;

try {
  studentSession = JSON.parse(sessionStorage.getItem("ifelseQuizStudent") || "null");
} catch (_) {
  studentSession = null;
}

if (!studentSession || !studentSession.name || !studentSession.studentClass) {
  window.location.replace("login.html");
} else {
  $("studentIdentity").textContent = `${studentSession.name} — ${studentSession.studentClass}`;
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function getWebAppUrl() {
  const url = window.GOOGLE_SHEETS_WEB_APP_URL;
  if (!url || url.includes("TEMPEL_URL") || !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(url)) {
    throw new Error("URL Google Apps Script belum dipasang. Isi assets/js/config.js dengan URL deployment yang berakhiran /exec.");
  }
  return url;
}

function jsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const callbackName = "__quizJsonp_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const url = new URL(getWebAppUrl());
    url.searchParams.set("action", action);
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("_", String(Date.now()));
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

    const cleanup = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      script.remove();
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
    };

    window[callbackName] = data => {
      cleanup();
      if (!data || typeof data !== "object") return reject(new Error("Respons Google Sheets tidak valid."));
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("Tidak dapat menghubungi Google Sheets. Periksa URL deployment dan koneksi internet."));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheets tidak merespons. Coba lagi beberapa saat."));
    }, 20000);
    script.src = url.toString();
    document.head.appendChild(script);
  });
}

function makeRequestId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return "req-" + Date.now() + "-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

async function fetchSubmissionResult(requestId) {
  let lastResponse = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    lastResponse = await jsonp("getSubmissionResult", { request_id: requestId });
    if (!lastResponse.pending) return lastResponse;
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  throw new Error(lastResponse?.error || "Pengiriman belum dapat dikonfirmasi. Muat hasil di Google Sheets untuk memastikan apakah nilai sudah tersimpan.");
}

// Mengirim POST lewat form + iframe agar browser GitHub Pages tidak memerlukan CORS.
// Hasil akhirnya diambil melalui endpoint JSONP terpisah.
async function submitToGoogleSheets(payload) {
  const endpoint = getWebAppUrl();
  const requestId = makeRequestId();
  const body = { ...payload, request_id: requestId };
  const targetName = "gsQuizSubmit_" + requestId.replace(/[^a-zA-Z0-9]/g, "");
  const iframe = document.createElement("iframe");
  iframe.name = targetName;
  iframe.title = "Pengiriman hasil kuis";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.display = "none";

  document.body.appendChild(iframe);
  await new Promise((resolve, reject) => {
    const readyTimer = setTimeout(() => reject(new Error("Browser gagal menyiapkan pengiriman hasil.")), 5000);
    iframe.addEventListener("load", () => { clearTimeout(readyTimer); resolve(); }, { once: true });
    iframe.src = "about:blank";
  });

  try {
    const formPost = document.createElement("form");
    formPost.method = "POST";
    formPost.action = endpoint;
    formPost.target = targetName;
    formPost.acceptCharset = "UTF-8";

    const payloadInput = document.createElement("input");
    payloadInput.type = "hidden";
    payloadInput.name = "payload";
    payloadInput.value = JSON.stringify(body);
    formPost.appendChild(payloadInput);

    const requestInput = document.createElement("input");
    requestInput.type = "hidden";
    requestInput.name = "request_id";
    requestInput.value = requestId;
    formPost.appendChild(requestInput);

    const responsePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        iframe.remove();
        reject(new Error("Pengiriman terlalu lama. Periksa tab Nilai di Google Sheets sebelum mencoba ulang."));
      }, 45000);
      iframe.addEventListener("load", async () => {
        clearTimeout(timer);
        try {
          resolve(await fetchSubmissionResult(requestId));
        } catch (error) {
          reject(error);
        } finally {
          iframe.remove();
        }
      }, { once: true });
    });

    document.body.appendChild(formPost);
    formPost.submit();
    formPost.remove();
    return await responsePromise;
  } catch (error) {
    iframe.remove();
    throw error;
  }
}

async function loadQuestions() {
  $("submitBtn").disabled = true;
  $("formMessage").textContent = "";
  $("progress").textContent = "Memuat soal…";
  questionsEl.innerHTML = "<p>Memuat soal dari Google Sheets…</p>";
  try {
    const response = await jsonp("getQuestions");
    if (!response.ok) throw new Error(response.error || "Soal gagal dimuat.");
    if (!Array.isArray(response.questions) || response.questions.length !== 20) {
      throw new Error(`Google Sheets harus berisi tepat 20 soal aktif. Soal ditemukan: ${response.questions?.length || 0}.`);
    }
    questions = response.questions;
    questionsEl.innerHTML = questions.map((q, index) =>
      `<section class="question" id="q${index}"><h3>${index + 1}. ${esc(q.question_text)}</h3>` +
      [q.option_a, q.option_b, q.option_c, q.option_d].map((option, optionIndex) =>
        `<label class="option"><input type="radio" name="q${esc(q.id)}" value="${optionIndex + 1}"><span><b>${"ABCD"[optionIndex]}.</b> ${esc(option)}</span></label>`
      ).join("") + `</section>`
    ).join("");
    $("progress").textContent = `0/${questions.length} dijawab`;
    $("submitBtn").disabled = false;
  } catch (error) {
    console.error(error);
    questionsEl.innerHTML = "<p>Soal gagal dimuat. Periksa URL Google Apps Script dan tab Soal pada Google Sheets.</p>";
    $("formMessage").textContent = error.message || "Gagal memuat soal.";
    $("progress").textContent = "Gagal memuat";
  }
}

questionsEl.addEventListener("change", () => {
  $("progress").textContent = `${questions.filter(q => form.querySelector(`[name="q${q.id}"]:checked`)).length}/${questions.length} dijawab`;
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (submitted || submitting) return;
  const name = studentSession?.name?.trim();
  const studentClass = studentSession?.studentClass?.trim();
  if (!name || !studentClass) {
    window.location.replace("login.html");
    return;
  }

  const answers = [];
  for (let index = 0; index < questions.length; index++) {
    const question = questions[index];
    const selected = form.querySelector(`[name="q${question.id}"]:checked`);
    if (!selected) {
      $("formMessage").textContent = `Soal nomor ${index + 1} belum dijawab.`;
      $("q" + index).scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    answers.push({ question_id: question.id, selected_option: Number(selected.value) });
  }

  submitting = true;
  $("submitBtn").disabled = true;
  $("formMessage").textContent = "Mengirim jawaban dan menghitung nilai di Google Sheets…";
  try {
    const response = await submitToGoogleSheets({ student_name: name, student_class: studentClass, answers });
    if (!response.ok) throw new Error(response.error || "Google Sheets menolak pengiriman nilai.");
    const row = response.result;
    if (!row || typeof row.score !== "number") throw new Error("Respons nilai dari Google Sheets tidak valid.");

    $("score").textContent = row.score;
    $("resultTitle").textContent = row.score >= 75 ? "Bagus, pertahankan!" : "Tetap semangat belajar!";
    $("resultMessage").textContent = `${name}, jawaban benar ${row.correct_count} dari ${row.total_questions} soal.`;
    $("resultMeta").textContent = `Kelas: ${studentClass} · Waktu: ${new Date(row.submitted_at).toLocaleString("id-ID")}`;
    $("saveStatus").textContent = "Nilai berhasil dihitung dan disimpan di Google Sheets.";
    $("saveStatus").className = "save-status ok";
    $("result").hidden = false;
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
    $("formMessage").textContent = "Pengiriman berhasil.";
    submitted = true;
    questionsEl.querySelectorAll("input").forEach(input => { input.disabled = true; });
  } catch (error) {
    console.error(error);
    $("formMessage").textContent = "Gagal menyimpan nilai: " + (error.message || "Periksa koneksi dan deployment Apps Script.");
    $("submitBtn").disabled = false;
    submitting = false;
  }
});

$("reloadBtn").addEventListener("click", () => {
  if (submitted) {
    $("formMessage").textContent = "Kuis sudah dikirim. Muat ulang halaman untuk sesi baru.";
    return;
  }
  loadQuestions();
});

if (studentSession && studentSession.name && studentSession.studentClass) loadQuestions();
