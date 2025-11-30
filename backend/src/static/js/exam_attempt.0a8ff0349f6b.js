// static/js/exam_attempt.js
// Complete exam attempt frontend with branching support.
// Requires EXAM_ID and ATTEMPT_ID provided by template (see attempt.html)

(function () {
  // -----------------------
  // State
  // -----------------------
  let questions = [];           // current allowed questions (backend filtered)
  let index = 0;                // current index into questions[]
  let answers = {};             // local cache: qid -> { selected_choices: [], text_answer, files: FileList }
  let timerInterval = null;
  let autosaveInterval = null;
  let examStart = null;
  let examDuration = null;
  let isSubmitting = false;

  // DOM helpers
  const qbox = () => document.getElementById("question-box");
  const navBox = () => document.getElementById("navigation");
  const progressInner = () => document.getElementById("progress-inner");
  const progressText = () => document.getElementById("progress-text");
  const msgBox = () => document.getElementById("exam-msg");
  const timerBox = () => document.getElementById("timer");

  // -----------------------
  // Utilities
  // -----------------------
  function csrf() {
    const m = document.cookie.match(/csrftoken=([^;]+)/);
    return m ? m[1] : "";
  }

  async function jsonFetch(url, opts = {}) {
    opts.credentials = "same-origin";
    opts.headers = Object.assign({ "Accept": "application/json" }, opts.headers || {});
    const res = await fetch(url, opts);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) throw data || { detail: "HTTP " + res.status };
    return data;
  }

  // -----------------------
  // Load questions from server
  // Backend will filter branching if user_exam provided.
  // -----------------------
  async function loadQuestions() {
    try {
      const url = `/api/exam/exams/${EXAM_ID}/questions/?user_exam=${ATTEMPT_ID}`;
      const data = await jsonFetch(url);
      questions = Array.isArray(data) ? data : (data.results || []);
      if (!questions.length) {
        qbox().innerHTML = "<div class='text-danger'>Tidak ada soal.</div>";
        buildNavigation();
        updateProgress();
        return;
      }

      // Prefill from returned user_answer if present
      questions.forEach(q => {
        if (q.user_answer) {
          answers[q.id] = {
            selected_choices: q.user_answer.selected_choices || [],
            text_answer: q.user_answer.text_answer || "",
            files: null
          };
        }
      });

      if (index >= questions.length) index = Math.max(0, questions.length - 1);

      renderQuestion();
      buildNavigation();
      updateProgress();
    } catch (err) {
      console.error("loadQuestions error", err);
      msgBox().textContent = (err && err.detail) ? err.detail : "Gagal memuat soal.";
    }
  }

  // -----------------------
  // Timer handling (loads user_exam info)
  // -----------------------
  async function loadTimer() {
    try {
      const list = await jsonFetch(`/api/exam/exams/${EXAM_ID}/results/`);
      const attempt = Array.isArray(list) ? list.find(x => x.id === ATTEMPT_ID) : (list || null);
      if (!attempt) return;
      examStart = attempt.start_time;
      examDuration = (attempt.exam && attempt.exam.duration_minutes) ? attempt.exam.duration_minutes : attempt.duration_minutes;
      startTimer();
    } catch (e) {
      console.warn("loadTimer:", e);
    }
  }

  function startTimer() {
    if (!examStart || !examDuration) return;
    function update() {
      const start = new Date(examStart);
      const now = new Date();
      const end = new Date(start.getTime() + examDuration * 60000);
      const diff = end - now;
      if (diff <= 0) {
        clearInterval(timerInterval);
        timerBox().textContent = "00:00:00";
        lockUI();
        autoFinish();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      timerBox().textContent = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    }
    update();
    timerInterval = setInterval(update, 1000);
  }

  function lockUI() {
    const inputs = qbox().querySelectorAll("input, textarea, select, button");
    inputs.forEach(i => i.disabled = true);
    const btns = ["btn-next","btn-prev","btn-finish","btn-save"];
    btns.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
  }

  async function autoFinish() {
    await finalSubmit();
    await finishExam();
    window.location.href = `/exams/${EXAM_ID}/attempt/${ATTEMPT_ID}/result/`;
  }

  // -----------------------
  // Render a question
  // -----------------------
  function renderQuestion() {
    const q = questions[index];
    if (!q) {
      qbox().innerHTML = "<div class='text-muted'>Soal tidak ditemukan.</div>";
      return;
    }

    let html = `<h4 class="mb-3">${q.text}</h4>`;
    const choices = q.choices || [];

    if (q.question_type === "MCQ" || q.question_type === "TRUEFALSE") {
      choices.forEach(c => {
        html += `
          <div class="form-check">
            <input class="form-check-input" type="radio" name="answer" id="choice-${c.id}" value="${c.id}">
            <label class="form-check-label" for="choice-${c.id}">${c.text}</label>
          </div>`;
      });
    }

    if (q.question_type === "CHECK") {
      choices.forEach(c => {
        html += `
          <div class="form-check">
            <input class="form-check-input" type="checkbox" name="answer" id="choice-${c.id}" value="${c.id}">
            <label class="form-check-label" for="choice-${c.id}">${c.text}</label>
          </div>`;
      });
    }

    if (q.question_type === "DROPDOWN") {
      html += `<select id="dropdown-answer" class="form-select mb-2"><option value="">-- pilih --</option>`;
      choices.forEach(c => html += `<option value="${c.id}">${c.text}</option>`);
      html += `</select>`;
    }

    if (q.question_type === "TEXT") {
      html += `<textarea id="text-answer" class="form-control mb-2" rows="5" placeholder="Tulis jawaban ..."></textarea>`;
    }

    if (q.question_type === "FILE") {
      html += `<input type="file" id="file-answer" class="form-control mb-2" ${q.allow_multiple_files ? "multiple" : ""}>`;
      html += `<div class="small text-muted">Unggah file sesuai instruksi.</div>`;
    }

    qbox().innerHTML = html;

    // restore and attach listeners
    restoreAnswer(q);
    attachListeners(q);
    updateProgress();
  }

  // -----------------------
  // Build navigation grid
  // -----------------------
  function buildNavigation() {
    const box = navBox();
    box.innerHTML = "";
    questions.forEach((q, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-btn";
      btn.textContent = i + 1;
      if (i === index) btn.classList.add("current");
      const saved = answers[q.id];
      if (saved && (saved.selected_choices?.length || (saved.text_answer && saved.text_answer.trim()) || saved.files)) btn.classList.add("answered");
      btn.onclick = () => {
        saveCurrent();
        index = i;
        renderQuestion();
        buildNavigation();
      };
      box.appendChild(btn);
    });
  }

  // -----------------------
  // Update progress bar & text
  // -----------------------
  function updateProgress() {
    const total = questions.length || 1;
    const pos = Math.min(total, index + 1);
    const percent = Math.round((pos / total) * 100);
    if (progressInner()) progressInner().style.width = percent + "%";
    if (progressText()) progressText().textContent = `Soal ${pos} / ${total} — ${percent}%`;
  }

  // -----------------------
  // Save current input to local answers object
  // -----------------------
  function saveCurrent() {
    const q = questions[index];
    if (!q) return;
    const id = q.id;
    answers[id] = answers[id] || {};

    if (["MCQ","TRUEFALSE"].includes(q.question_type)) {
      const sel = qbox().querySelector("input[name='answer']:checked");
      answers[id].selected_choices = sel ? [parseInt(sel.value)] : [];
    } else if (q.question_type === "CHECK") {
      const arr = [...qbox().querySelectorAll("input[name='answer']:checked")].map(i => parseInt(i.value));
      answers[id].selected_choices = arr;
    } else if (q.question_type === "DROPDOWN") {
      const val = qbox().querySelector("#dropdown-answer")?.value || "";
      answers[id].selected_choices = val ? [parseInt(val)] : [];
    } else if (q.question_type === "TEXT") {
      const txt = qbox().querySelector("#text-answer")?.value || "";
      answers[id].text_answer = txt;
    } else if (q.question_type === "FILE") {
      const fi = qbox().querySelector("#file-answer");
      if (fi && fi.files.length > 0) {
        answers[id].files = fi.files;
      }
    }
  }

  // -----------------------
  // Restore answers into form controls if present in local answers
  // -----------------------
  function restoreAnswer(q) {
    const saved = answers[q.id];
    if (!saved) return;
    if (saved.selected_choices) {
      saved.selected_choices.forEach(cid => {
        const el = qbox().querySelector(`input[value="${cid}"]`);
        if (el) el.checked = true;
      });
    }
    if (saved.selected_choices && qbox().querySelector("#dropdown-answer")) {
      qbox().querySelector("#dropdown-answer").value = saved.selected_choices[0] || "";
    }
    if (saved.text_answer && qbox().querySelector("#text-answer")) {
      qbox().querySelector("#text-answer").value = saved.text_answer;
    }
    if (saved.files && q.question_type === "FILE") {
      const hint = document.createElement("div");
      hint.className = "small text-success mt-2";
      hint.textContent = `${saved.files.length} file siap diupload (dipilih)`;
      qbox().appendChild(hint);
    }
  }

  // -----------------------
  // Attach listeners for immediate-save actions (choice changes)
  // -----------------------
  function attachListeners(q) {
    const choiceInputs = qbox().querySelectorAll("input[name='answer'], #dropdown-answer");
    choiceInputs.forEach(el => {
      el.addEventListener("change", async () => {
        saveCurrent();
        try {
          await submitAnswers([{ question: q.id, selected_choices: answers[q.id].selected_choices || [], text_answer: answers[q.id].text_answer || null }], false);
          const prevQid = q.id;
          await loadQuestions();
          const newIdx = questions.findIndex(x => x.id === prevQid);
          index = newIdx >= 0 ? newIdx : Math.min(index, Math.max(0, questions.length - 1));
          renderQuestion();
          buildNavigation();
          updateProgress();
        } catch (err) {
          console.error("submit on change failed", err);
          msgBox().textContent = "Gagal menyimpan jawaban sementara.";
        }
      });
    });

    const ta = qbox().querySelector("#text-answer");
    if (ta) {
      ta.addEventListener("blur", () => {
        saveCurrent();
        submitAnswers([{ question: q.id, selected_choices: answers[q.id].selected_choices || [], text_answer: answers[q.id].text_answer || null }], false)
          .catch(() => {});
      });
    }

    const fi = qbox().querySelector("#file-answer");
    if (fi) {
      fi.addEventListener("change", () => {
        saveCurrent();
        const hintId = "file-hint-" + q.id;
        let hint = qbox().querySelector("#" + hintId);
        if (!hint) {
          hint = document.createElement("div");
          hint.id = hintId;
          hint.className = "small text-muted mt-2";
          qbox().appendChild(hint);
        }
        hint.textContent = `${fi.files.length} file dipilih (akan diupload saat final submit).`;
        buildNavigation();
      });
    }
  }

  // -----------------------
  // Submit answers JSON-only (no files). If reloadAfter true, reload questions.
  // -----------------------
  async function submitAnswers(answerPayloadArray = [], reloadAfter = true) {
    try {
      await jsonFetch(`/api/exam/exams/${EXAM_ID}/submit/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() },
        body: JSON.stringify({ user_exam: ATTEMPT_ID, answers: answerPayloadArray })
      });
      if (reloadAfter) await loadQuestions();
    } catch (err) {
      console.error("submitAnswers error", err);
      throw err;
    }
  }

  // -----------------------
  // Autosave all answers periodically (JSON-only)
  // -----------------------
  function startAutosave() {
    if (autosaveInterval) clearInterval(autosaveInterval);
    autosaveInterval = setInterval(() => {
      const payload = Object.entries(answers).map(([qid, obj]) => ({
        question: parseInt(qid),
        selected_choices: obj.selected_choices || [],
        text_answer: obj.text_answer || null
      }));
      if (payload.length) submitAnswers(payload, false).catch(() => {});
    }, 5000);
  }

  // -----------------------
  // Final submit including files
  // -----------------------
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

  // -----------------------
  // Finish exam (mark completed)
  // -----------------------
  async function finishExam() {
    await fetch(`/api/exam/exams/${EXAM_ID}/finish/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() },
      credentials: "same-origin",
      body: JSON.stringify({ user_exam: ATTEMPT_ID })
    });
  }

  // -----------------------
  // Button handlers
  // -----------------------
  function next() {
    saveCurrent();
    if (index < questions.length - 1) {
      index++;
      renderQuestion();
      buildNavigation();
    }
  }
  function prev() {
    saveCurrent();
    if (index > 0) {
      index--;
      renderQuestion();
      buildNavigation();
    }
  }

  async function finishFlow() {
    if (isSubmitting) return;
    isSubmitting = true;
    for (let q of questions) {
      if (!isRequiredAnswered(q)) {
        msgBox().textContent = "Masih ada soal wajib yang belum dijawab.";
        isSubmitting = false;
        return;
      }
    }
    msgBox().textContent = "Menyimpan jawaban dan mengirim...";
    clearInterval(autosaveInterval);
    try {
      await finalSubmit();
      await finishExam();
      window.location.href = `/exams/${EXAM_ID}/attempt/${ATTEMPT_ID}/result/`;
    } catch (e) {
      console.error("finish error", e);
      msgBox().textContent = "Gagal menyelesaikan ujian.";
      isSubmitting = false;
    }
  }

  // -----------------------
  // Required-check
  // -----------------------
  function isRequiredAnswered(q) {
    const saved = answers[q.id];
    if (!q.required) return true;
    if (["MCQ","TRUEFALSE"].includes(q.question_type)) return !!(saved && saved.selected_choices && saved.selected_choices.length === 1);
    if (q.question_type === "CHECK") return !!(saved && saved.selected_choices && saved.selected_choices.length > 0);
    if (q.question_type === "DROPDOWN") return !!(saved && saved.selected_choices && saved.selected_choices.length === 1);
    if (q.question_type === "TEXT") return !!(saved && saved.text_answer && saved.text_answer.trim().length > 0);
    if (q.question_type === "FILE") return !!(saved && saved.files && saved.files.length > 0);
    return true;
  }

  // -----------------------
  // Event wiring
  // -----------------------
  function wireButtons() {
    const nextBtn = document.getElementById("btn-next");
    const prevBtn = document.getElementById("btn-prev");
    const finishBtn = document.getElementById("btn-finish");
    const saveBtn = document.getElementById("btn-save");
    if (nextBtn) nextBtn.addEventListener("click", () => { next(); });
    if (prevBtn) prevBtn.addEventListener("click", () => { prev(); });
    if (finishBtn) finishBtn.addEventListener("click", () => { finishFlow(); });
    if (saveBtn) saveBtn.addEventListener("click", () => {
      const payload = Object.entries(answers).map(([qid, obj]) => ({
        question: parseInt(qid),
        selected_choices: obj.selected_choices || [],
        text_answer: obj.text_answer || null
      }));
      submitAnswers(payload, false).then(()=> msgBox().textContent = "Tersimpan.").catch(()=> msgBox().textContent = "Gagal menyimpan.");
    });
  }

  // -----------------------
  // Init
  // -----------------------
  function init() {
    wireButtons();
    loadQuestions();
    loadTimer();
    startAutosave();
  }

  document.addEventListener("DOMContentLoaded", init);

  // debugging helper
  window._exam_debug = { getState: () => ({ questions, index, answers }) };

})();
