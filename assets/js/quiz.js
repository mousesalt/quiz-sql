const $ = id => document.getElementById(id);
const form = $("quizForm");
const questionsEl = $("questions");
let client = null, questions = [], submitted = false, submitting = false;
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
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function getClient(){
  if(client)return client;
  const url=window.SUPABASE_URL,key=window.SUPABASE_ANON_KEY;
  if(!url||!key||url.includes("GANTI_DENGAN")||key.includes("GANTI_DENGAN"))throw new Error("Konfigurasi Supabase belum diisi di assets/js/config.js.");
  if(!window.supabase?.createClient)throw new Error("Library Supabase gagal dimuat. Periksa koneksi internet.");
  client=window.supabase.createClient(url,key);return client;
}
async function loadQuestions(){
  $("submitBtn").disabled=true;$("formMessage").textContent="";$("progress").textContent="Memuat soal…";
  questionsEl.innerHTML="<p>Memuat soal dari database…</p>";
  try{
    const {data,error}=await getClient().from("quiz_questions_public").select("id,question_text,option_a,option_b,option_c,option_d,question_order").order("question_order",{ascending:true});
    if(error)throw error;if(!data||data.length!==20)throw new Error(`Database harus berisi tepat 20 soal aktif. Soal yang ditemukan: ${data?.length||0}. Jalankan SQL setup atau upgrade.`);
    questions=data;
    questionsEl.innerHTML=questions.map((q,i)=>`<section class="question" id="q${i}"><h3>${i+1}. ${esc(q.question_text)}</h3>${[q.option_a,q.option_b,q.option_c,q.option_d].map((o,j)=>`<label class="option"><input type="radio" name="q${q.id}" value="${j+1}"><span><b>${"ABCD"[j]}.</b> ${esc(o)}</span></label>`).join("")}</section>`).join("");
    $("progress").textContent=`0/${questions.length} dijawab`;$("submitBtn").disabled=false;
  }catch(e){console.error(e);questionsEl.innerHTML="<p>Soal gagal dimuat. Periksa konfigurasi, SQL, dan koneksi internet.</p>";$("formMessage").textContent=e.message||"Gagal memuat soal.";$("progress").textContent="Gagal memuat";}
}
questionsEl.addEventListener("change",()=>{$("progress").textContent=`${questions.filter(q=>form.querySelector(`[name="q${q.id}"]:checked`)).length}/${questions.length} dijawab`;});
form.addEventListener("submit",async ev=>{
  ev.preventDefault();if(submitted||submitting)return;
  const name = studentSession?.name?.trim();
  const cls = studentSession?.studentClass?.trim();
  if (!name || !cls) {
    window.location.replace("login.html");
    return;
  }
  const answers=[];
  for(let i=0;i<questions.length;i++){const q=questions[i],sel=form.querySelector(`[name="q${q.id}"]:checked`);if(!sel){$("formMessage").textContent=`Soal nomor ${i+1} belum dijawab.`;$("q"+i).scrollIntoView({behavior:"smooth",block:"center"});return;}answers.push({question_id:q.id,selected_option:Number(sel.value)});}
  submitting=true;$("submitBtn").disabled=true;$("formMessage").textContent="Mengirim jawaban dan menghitung nilai melalui SQL…";
  try{
    const {data,error}=await getClient().rpc("submit_ifelse_quiz",{p_student_name:name,p_student_class:cls,p_answers:answers});
    if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row||typeof row.score!=="number")throw new Error("Respons database tidak valid.");
    $("score").textContent=row.score;$("resultTitle").textContent=row.score>=75?"Bagus, pertahankan!":"Tetap semangat belajar!";
    $("resultMessage").textContent=`${name}, jawaban benar ${row.correct_count} dari ${row.total_questions} soal.`;
    $("resultMeta").textContent=`Kelas: ${cls} · Waktu: ${new Date(row.submitted_at).toLocaleString("id-ID")}`;
    $("saveStatus").textContent="Nilai berhasil dihitung dan disimpan di database Supabase.";$("saveStatus").className="save-status ok";
    $("result").hidden=false;$("result").scrollIntoView({behavior:"smooth",block:"start"});$("formMessage").textContent="Pengiriman berhasil.";submitted=true;
    questionsEl.querySelectorAll("input").forEach(input=>input.disabled=true);
  }catch(e){console.error(e);$("formMessage").textContent="Gagal menyimpan nilai: "+(e.message||"Periksa konfigurasi dan SQL.");$("submitBtn").disabled=false;submitting=false;}
});
$("reloadBtn").addEventListener("click",()=>{if(submitted){$("formMessage").textContent="Kuis sudah dikirim. Muat ulang halaman untuk sesi baru.";return;}loadQuestions();});
loadQuestions();
