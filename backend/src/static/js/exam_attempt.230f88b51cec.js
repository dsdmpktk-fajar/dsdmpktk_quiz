// exam_attempt.js - final, includes navigation build, timer, autosave, file support

let questions = [];
let index = 0;
let answers = {};    // qid -> { selected_choices: [], text_answer: "", files: FileList }
let timerInterval = null;
let examDuration = null;
let examStart = null;
let autosaveInterval = null;
let isSubmitting = false;

document.addEventListener("DOMContentLoaded", () => {
  const qbox = document.getElementById("question-box");
  const qtext = document.getElementById("question-text");
  const qindex = document.getElementById("question-index");
  const qtotal = document.getElementById("question-total");
  const navBox = document.getElementById("navigation");
  const timerBox = document.getElementById("timer");
  const msg = document.getElementById("exam-msg");
  const fileHint = document.getElementById("file-hint");

  function csrf() {
    const m = document.cookie.match(/csrftoken=([^;]+)/);
    return m ? m[1] : "";
  }

  // load questions
  async function loadQuestions() {
    try {
      const res = await fetch(`/api/exam/exams/${EXAM_ID}/questions/?user_exam=${ATTEMPT_ID}`, {
        credentials: "same-origin"
      });
      questions = await res.json();
    } catch (e) {
      qbox.innerHTML = "<div class='text-danger'>Gagal memuat soal.</div>";
      return;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      qbox.innerHTML = "<div class='text-muted'>Tidak ada soal.</div>";
      return;
    }

    qtotal.textContent = questions.length;
    renderQuestion();
    buildNavigation();
    autosaveInterval = setInterval(autosave, 5000);
  }

  // load timer info
  async function loadTimer() {
    try {
      const res = await fetch(`/api/exam/exams/${EXAM_ID}/results/`, { credentials: "same-origin" });
      const list = await res.json();
      const attempt = Array.isArray(list) ? list.find(x => x.id === ATTEMPT_ID) : null;
      if (!attempt) return;
      examStart = attempt.start_time;
      examDuration = attempt.exam.duration_minutes;
      startTimer();
    } catch (e) { /* ignore */ }
  }

  function startTimer() {
    function update() {
      if (!examStart || !examDuration) return;
      const start = new Date(examStart);
      const now = new Date();
      const end = new Date(start.getTime() + examDuration * 60000);
      const diff = end - now;
      if (diff <= 0) {
        clearInterval(timerInterval);
        timerBox.textContent = "00:00:00";
        lockUI();
        autoFinish();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      timerBox.textContent = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    }
    update();
    timerInterval = setInterval(update, 1000);
  }

  function lockUI() {
    const inputs = qbox.querySelectorAll("input, textarea, select, button");
    inputs.forEach(i => i.disabled = true);
    document.getElementById("btn-next").disabled = true;
    document.getElementById("btn-prev").disabled = true;
    document.getElementById("btn-finish").disabled = true;
    msg.innerHTML = `<div class="alert alert-warning py-2">Waktu selesai. Menyelesaikan ujian...</div>`;
  }

  // navigation
  function buildNavigation() {
    navBox.innerHTML = "";
    questions.forEach((q, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = i + 1;
      btn.classList.add("nav-btn");

      const saved = answers[q.id];
      if (i === index) btn.classList.add("nav-btn-current");
      else if (saved && ( (saved.selected_choices && saved.selected_choices.length) || saved.text_answer || saved.files )) btn.classList.add("nav-btn-answered");
      else btn.classList.add("nav-btn-default");

      btn.addEventListener("click", () => {
        saveCurrent();
        index = i;
        renderQuestion();
      });

      navBox.appendChild(btn);
    });
    // update meta
    qindex.textContent = index + 1;
    qtotal.textContent = questions.length;
  }

  function renderQuestion() {
    const q = questions[index];
    if (!q) return;
    qtext.textContent = q.text;
    qindex.textContent = index + 1;
    fileHint.textContent = q.question_type === "FILE" ? (q.allow_multiple_files ? "Boleh mengunggah banyak file." : "Unggah 1 file.") : "";
    let html = "";

    if (q.question_type === "MCQ" || q.question_type === "TRUEFALSE") {
      q.choices.forEach(c => {
        html += `<div class="form-check mb-2">
                  <input class="form-check-input" type="radio" name="answer" id="ch_${c.id}" value="${c.id}">
                  <label class="form-check-label" for="ch_${c.id}">${c.text}</label>
                 </div>`;
      });
    } else if (q.question_type === "CHECK") {
      q.choices.forEach(c => {
        html += `<div class="form-check mb-2">
                  <input class="form-check-input" type="checkbox" name="answer" id="ch_${c.id}" value="${c.id}">
                  <label class="form-check-label" for="ch_${c.id}">${c.text}</label>
                 </div>`;
      });
    } else if (q.question_type === "DROPDOWN") {
      html += `<select id="dropdown-answer" class="form-select mb-2"><option value="">-- pilih --</option>`;
      q.choices.forEach(c => html += `<option value="${c.id}">${c.text}</option>`);
      html += `</select>`;
    } else if (q.question_type === "TEXT") {
      html += `<textarea id="text-answer" class="form-control mb-2" rows="5"></textarea>`;
    } else if (q.question_type === "FILE") {
      const multi = q.allow_multiple_files ? "multiple" : "";
      html += `<input id="file-answer" type="file" class="form-control mb-2" ${multi}>`;
    }

    qbox.innerHTML = html;
    restoreAnswer(q);
    buildNavigation();
  }

  function isRequiredAnswered(q) {
    if (!q.required) return true;
    const saved = answers[q.id];
    if (!saved) return false;
    if (["MCQ","TRUEFALSE"].includes(q.question_type)) return saved.selected_choices && saved.selected_choices.length === 1;
    if (q.question_type === "CHECK") return saved.selected_choices && saved.selected_choices.length > 0;
    if (q.question_type === "DROPDOWN") return saved.selected_choices && saved.selected_choices.length === 1;
    if (q.question_type === "TEXT") return saved.text_answer && saved.text_answer.trim() !== "";
    if (q.question_type === "FILE") return saved.files && saved.files.length > 0;
    return true;
  }

  function saveCurrent() {
    const q = questions[index];
    if (!q) return;
    const id = q.id;
    // MCQ/TRUEFALSE
    if (["MCQ","TRUEFALSE"].includes(q.question_type)) {
      const sel = document.querySelector("input[name='answer']:checked");
      answers[id] = { selected_choices: sel ? [parseInt(sel.value)] : [] };
    } else if (q.question_type === "CHECK") {
      const sels = [...document.querySelectorAll("input[name='answer']:checked")].map(el => parseInt(el.value));
      answers[id] = { selected_choices: sels };
    } else if (q.question_type === "DROPDOWN") {
      const v = document.getElementById("dropdown-answer").value;
      answers[id] = { selected_choices: v ? [parseInt(v)] : [] };
    } else if (q.question_type === "TEXT") {
      const v = document.getElementById("text-answer").value;
      answers[id] = { text_answer: v };
    } else if (q.question_type === "FILE") {
      const fi = document.getElementById("file-answer");
      if (fi && fi.files.length > 0) answers[id] = { files: fi.files };
    }
  }

  function restoreAnswer(q) {
    const saved = answers[q.id];
    if (!saved) return;
    if (saved.selected_choices) {
      saved.selected_choices.forEach(cid => {
        const el = document.querySelector(`input[value="${cid}"]`);
        if (el) el.checked = true;
      });
      if (document.getElementById("dropdown-answer")) {
        document.getElementById("dropdown-answer").value = saved.selected_choices[0] || "";
      }
    }
    if (saved.text_answer && document.getElementById("text-answer")) {
      document.getElementById("text-answer").value = saved.text_answer;
    }
    if (saved.files && q.question_type === "FILE") {
      // show small note - actual file inputs can't be pre-populated
      fileHint.textContent = `${saved.files.length} file dipilih (belum tersimpan ke server).`;
    }
  }

  function autosave() {
    saveCurrent();
    const payload = Object.entries(answers).map(([qid, obj]) => ({
      question: parseInt(qid),
      selected_choices: obj.selected_choices || [],
      text_answer: obj.text_answer || null
    }));

    fetch(`/api/exam/exams/${EXAM_ID}/submit/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": csrf(),
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ user_exam: ATTEMPT_ID, answers: payload })
    }).catch(() => {});
  }

  async function finalSubmit() {
    saveCurrent();
    const fd = new FormData();
    fd.append("user_exam", ATTEMPT_ID);
    const answersArray = Object.entries(answers).map(([qid, obj]) => ({
      question: parseInt(qid),
      selected_choices: obj.selected_choices || [],
      text_answer: obj.text_answer || null
    }));
    fd.append("answers", JSON.stringify(answersArray));

    // append files with key files_<qid> for backend
    Object.entries(answers).forEach(([qid, obj]) => {
      if (obj.files) {
        for (let f of obj.files) fd.append(`files_${qid}`, f);
      }
    });

    await fetch(`/api/exam/exams/${EXAM_ID}/submit/`, {
      method: "POST",
      headers: { "X-CSRFToken": csrf() },
      credentials: "same-origin",
      body: fd
    });
  }

  async function finishExam() {
    await fetch(`/api/exam/exams/${EXAM_ID}/finish/`, {
      method: "POST",
      headers: { "X-CSRFToken": csrf(), "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ user_exam: ATTEMPT_ID })
    });
  }

  async function autoFinish() {
    lockUI();
    try { await finalSubmit(); await finishExam(); } catch (e) {}
    window.location.href = `/exams/${EXAM_ID}/attempt/${ATTEMPT_ID}/result/`;
  }

  // buttons
  document.getElementById("btn-next").onclick = () => {
    saveCurrent();
    const q = questions[index];
    if (!isRequiredAnswered(q)) { msg.textContent = "Soal ini wajib dijawab."; return; }
    if (index < questions.length - 1) { index++; renderQuestion(); }
  };
  document.getElementById("btn-prev").onclick = () => { saveCurrent(); if (index > 0) { index--; renderQuestion(); } };
  document.getElementById("btn-finish").onclick = async () => {
    if (isSubmitting) return;
    isSubmitting = true;
    lockUI();
    clearInterval(autosaveInterval);
    saveCurrent();
    for (let q of questions) { if (!isRequiredAnswered(q)) { msg.textContent = "Masih ada soal wajib yang belum dijawab."; isSubmitting=false; return; } }
    msg.textContent = "Menyimpan jawaban...";
    try { await finalSubmit(); await finishExam(); } catch (e) { /* ignore */ }
    window.location.href = `/exams/${EXAM_ID}/attempt/${ATTEMPT_ID}/result/`;
  };

  // init
  loadQuestions();
  loadTimer();
});
