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
  if (name.length > 100 || studentClass.length > 30) {
    $("loginMessage").textContent = "Nama maksimal 100 karakter dan kelas maksimal 30 karakter.";
    return;
  }
  try {
    sessionStorage.setItem("ifelseQuizStudent", JSON.stringify({ name, studentClass }));
  } catch (_) {
    $("loginMessage").textContent = "Browser tidak mengizinkan penyimpanan sesi. Aktifkan session storage lalu coba lagi.";
    return;
  }
  window.location.href = "index.html";
});
