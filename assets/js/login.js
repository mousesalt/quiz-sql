const $ = id => document.getElementById(id);
const form = $("loginForm");
form.addEventListener("submit", event => {
  event.preventDefault();
  const name = $("studentName").value.trim();
  const studentClass = $("studentClass").value.trim();
  if (!name || !studentClass) {
    $("loginMessage").textContent = "Isi nama lengkap dan kelas terlebih dahulu.";
    (!name ? $("studentName") : $("studentClass")).focus();
    return;
  }
  // Data identitas hanya diteruskan antarhalaman di browser, belum disimpan ke database.
  // Nilai akhir disimpan oleh fungsi SQL saat siswa mengirim kuis.
  const session = { name, studentClass };
  try {
    sessionStorage.setItem("ifelseQuizStudent", JSON.stringify(session));
  } catch (_) {
    $("loginMessage").textContent = "Browser tidak mengizinkan penyimpanan sesi. Aktifkan session storage lalu coba lagi.";
    return;
  }
  window.location.href = "index.html";
});
