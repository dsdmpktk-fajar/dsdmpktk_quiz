// static/js/exam.js
const ExamApp = (() => {
  const API_BASE = "/api/exam/exams";

  /* --------------------------
     UTIL helpers
  ---------------------------*/
  function xhrJson(url, opts={}) {
    const headers = opts.headers || {};
    headers['Content-Type'] = 'application/json';
    opts.headers = Object.assign({'X-Requested-With': 'XMLHttpRequest'}, headers);
    if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
    return fetch(url, opts).then(async res => {
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null } catch(e){ data = text; }
      if (!res.ok) throw {status: res.status, data};
      return data;
    });
  }

  /* --------------------------
     List page
  ---------------------------*/
  async function loadExams(tbodySelector, alertSelector) {
    const tbody = document.querySelector(tbodySelector);
    const alertArea = document.querySelector(alertSelector);
    tbody.innerHTML = "<tr><td colspan='5'>Memuat…</td></tr>";
    try {
      const exams = await xhrJson(`${API_BASE}/`);
      if (!Array.isArray(exams) || exams.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5'>Tidak ada ujian.</td></tr>";
        return;
      }
      tbody.innerHTML = "";
      exams.forEach(ex => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(ex.title)}</td>
          <td>${escapeHtml(ex.description || "")}</td>
          <td>${ex.duration_minutes ? ex.duration_minutes + " menit" : "-"}</td>
          <td>${formatDate(ex.start_time)} — ${formatDate(ex.end_time)}</td>
          <td>
            <a href="/exams/${ex.id}/start/" class="btn btn-sm btn-primary">Detail / Mulai</a>
            <a href="/exams/${ex.id}/result/?ue=" class="btn btn-sm btn-outline-secondary">Hasil</a>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch(err) {
      console.error(err);
      alertArea.innerHTML = `<div class="alert alert-danger">Gagal memuat ujian.</div>`;
      tbody.innerHTML = "<tr><td colspan='5'>Error saat memuat.</td></tr>";
    }
  }

  /* --------------------------
     Start page
  ---------------------------*/
  async function initStartPage(examId) {
    try {
      const exam = await xhrJson(`${API_BASE}/${examId}/`);
      document.getElementById("exam-title").textContent = exam.title;
      document.getElementById("exam-desc").textContent = exam.description || "";
      document.getElementById("exam-duration").textContent = exam.duration_minutes ? exam.duration_minutes + " menit" : "—";
      document.getElementById("exam-passing").textContent = exam.passing_grade ?? "—";
      document.getElementById("exam-instruction").textContent = exam.description || "Ikuti instruksi.";

      document.getElementById("btn-start").addEventListener("click", async () => {
        document.getElementById("start-area").style.display = "none";
        document.getElementById("start-loading").style.display = "block";
        try {
          const res = await xhrJson(`${API_BASE}/${examId}/start/`, {method: "POST"});
          const ue = res.user_exam_id || res.id || res.user_exam;
          // redirect to attempt page
          window.location = `/exams/${examId}/attempt/?ue=${ue}`;
        } catch(e) {
          console.error(e);
          document.getElementById("start-area").style.display = "block";
          document.getElementById("start-loading").style.display = "none";
          alert("Gagal mulai ujian. Cek console.");
        }
      });
    } catch(err) {
      console.error(err);
      alert("Gagal memuat data exam.");
    }
  }

  /* --------------------------
     Attempt page (core)
     - load questions (with branching)
     - render questions
     - partial submit
     - finish
  ---------------------------*/
  function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return "";
    return String(unsafe)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function formatDate(dt) {
    if (!dt) return "-";
    try {
      const d = new Date(dt);
      return d.toLocaleString();
    } catch(e) { return dt; }
  }

  // RENDER helper for different question types
  function renderQuestion(q) {
    // q: id, text, question_type, choices, parent_question, parent_choice
    const wrapper = document.createElement("div");
    wrapper.className = "question border rounded p-3 mb-3";
    wrapper.dataset.qid = q.id;

    const html = [];
    html.push(`<div class="d-flex justify-content-between"><strong>Q${q.order ?? ''}.</strong><div>${q.points ?? ''} pts</div></div>`);
    html.push(`<div class="mt-2 mb-2">${escapeHtml(q.text)}</div>`);

    if (q.question_type === "MCQ" || q.question_type === "MULTIPLE") {
      const isMulti = q.question_type === "MULTIPLE";
      if (Array.isArray(q.choices) && q.choices.length) {
        html.push('<div class="choices">');
        q.choices.forEach(c => {
          const inputType = isMulti ? "checkbox" : "radio";
          html.push(`
            <div class="form-check">
              <input class="form-check-input" type="${inputType}" name="choice-${q.id}" id="choice-${c.id}" value="${c.id}">
              <label class="form-check-label" for="choice-${c.id}">${escapeHtml(c.text)}</label>
            </div>
          `);
        });
        html.push('</div>');
      }
    } else if (q.question_type === "TEXT" || q.question_type === "ESSAY") {
      html.push(`<textarea class="form-control" name="text-${q.id}" rows="4"></textarea>`);
    } else if (q.question_type === "FILE") {
      html.push(`<input type="file" class="form-control" name="file-${q.id}" />`);
    } else {
      // fallback
      html.push(`<div>Jenis soal tidak dikenali: ${escapeHtml(q.question_type)}</div>`);
    }

    wrapper.innerHTML = html.join("");
    return wrapper;
  }

  async function fetchQuestionsForAttempt(examId, userExamId) {
    const url = `${API_BASE}/${examId}/questions?user_exam=${userExamId}`;
    return xhrJson(url);
  }

  async function initAttemptPage(examId, userExamId) {
    const questionsArea = document.getElementById("questions-area");
    const alertArea = document.getElementById("attempt-alert");
    const timerEl = document.getElementById("timer");

    if (!userExamId) {
      alert("User exam id tidak tersedia. Pastikan kamu memulai ujian terlebih dahulu.");
      return;
    }

    // fetch exam meta (to get duration)
    let examMeta = null;
    try {
      examMeta = await xhrJson(`${API_BASE}/${examId}/`);
      document.getElementById("exam-title").textContent = examMeta.title;
    } catch(e) {
      console.warn(e);
    }

    // timer
    let secondsLeft = examMeta && examMeta.duration_minutes ? examMeta.duration_minutes * 60 : null;
    if (secondsLeft) {
      const endAt = Date.now() + secondsLeft * 1000;
      const tInterval = setInterval(() => {
        const rem = Math.max(0, Math.round((endAt - Date.now())/1000));
        const mm = String(Math.floor(rem/60)).padStart(2,"0");
        const ss = String(rem % 60).padStart(2,"0");
        timerEl.textContent = `${mm}:${ss}`;
        if (rem <= 0) {
          clearInterval(tInterval);
          alert("Waktu ujian habis. Akan dikirim secara otomatis.");
          finishExam(examId, userExamId);
        }
      }, 500);
    }

    // load and render questions (initial)
    async function loadAndRender() {
      questionsArea.innerHTML = "<div>Memuat pertanyaan…</div>";
      try {
        const questions = await fetchQuestionsForAttempt(examId, userExamId);
        if (!Array.isArray(questions) || questions.length === 0) {
          questionsArea.innerHTML = "<div>Tidak ada pertanyaan untuk ditampilkan.</div>";
          return;
        }
        questionsArea.innerHTML = "";
        questions.forEach(q => {
          const qnode = renderQuestion(q);
          questionsArea.appendChild(qnode);
        });
      } catch(err) {
        console.error(err);
        alertArea.innerHTML = `<div class="alert alert-danger">Gagal memuat pertanyaan.</div>`;
      }
    }

    // bind buttons
    document.getElementById("btn-save").addEventListener("click", async () => {
      document.getElementById("btn-save").disabled = true;
      try {
        const answersPayload = collectAnswers();
        await submitAnswersPartial(examId, userExamId, answersPayload);
        // setelah submit, reload questions (server akan menghitung child yang perlu ditampilkan)
        await loadAndRender();
        alertArea.innerHTML = `<div class="alert alert-success">Jawaban disimpan.</div>`;
      } catch(e) {
        console.error(e);
        alertArea.innerHTML = `<div class="alert alert-danger">Gagal menyimpan jawaban.</div>`;
      } finally {
        document.getElementById("btn-save").disabled = false;
      }
    });

    document.getElementById("btn-finish").addEventListener("click", async () => {
      if (!confirm("Kirim semua jawaban dan selesai?")) return;
      await finishExam(examId, userExamId);
    });

    // initial load
    await loadAndRender();
  }

  function collectAnswers() {
    // collect selected choices and text answers
    const answers = [];
    document.querySelectorAll(".question").forEach(qnode => {
      const qid = qnode.dataset.qid;
      // choices
      const radios = qnode.querySelectorAll("input[type=radio], input[type=checkbox]");
      const selected = [];
      radios.forEach(r => {
        if (r.checked) selected.push(parseInt(r.value));
      });

      // text
      const ta = qnode.querySelector("textarea");
      const text = ta ? ta.value.trim() : "";

      // file handling: this implementation doesn't upload files (needs multipart)
      const fileInput = qnode.querySelector("input[type=file]");
      if (fileInput && fileInput.files.length) {
        // for now: ignore file or mark as TODO
        // production: use FormData and endpoint that accepts multipart/form-data
        console.warn("File upload detected — belum di-handle otomatis.");
      }

      const ansObj = { question: parseInt(qid) };
      if (selected.length) ansObj.selected_choices = selected;
      if (text) ansObj.text_answer = text;
      answers.push(ansObj);
    });
    return answers;
  }

  async function submitAnswersPartial(examId, userExamId, answers) {
    const url = `${API_BASE}/${examId}/submit/`;
    const payload = { user_exam: userExamId, answers };
    return xhrJson(url, {method: "POST", body: payload});
  }

  async function finishExam(examId, userExamId) {
    // try to submit last answers first, then call finish
    try {
      const answers = collectAnswers();
      if (answers.length) {
        await submitAnswersPartial(examId, userExamId, answers);
      }
    } catch(e) {
      console.warn("Gagal submit terakhir sebelum finish", e);
    }

    try {
      const res = await xhrJson(`${API_BASE}/${examId}/finish/`, {method: "POST", body: { user_exam: userExamId }});
      // redirect to result
      window.location = `/exams/${examId}/result/${userExamId}`;
    } catch(e) {
      console.error(e);
      alert("Gagal menyelesaikan ujian. Cek console.");
    }
  }

  /* --------------------------
     Result page
  ---------------------------*/
  async function initResultPage(examId, userExamId) {
    try {
      const res = await xhrJson(`${API_BASE}/${examId}/result/?user_exam=${userExamId}`);
      document.getElementById("exam-title").textContent = res.title || "Hasil Ujian";
      document.getElementById("exam-score").textContent = res.score ?? res.raw_score ?? "—";

      const wrap = document.getElementById("answers-review");
      if (Array.isArray(res.answers) && res.answers.length) {
        wrap.innerHTML = "";
        res.answers.forEach(a => {
          const div = document.createElement("div");
          div.className = "mb-3 p-2 border";
          div.innerHTML = `<strong>Q: ${escapeHtml(a.question_text || '')}</strong>
                           <div>User answer: ${escapeHtml(a.user_answer_text || JSON.stringify(a.selected_choices || []))}</div>
                           <div>Score: ${a.score ?? '-'}</div>`;
          wrap.appendChild(div);
        });
      } else {
        wrap.innerHTML = "<div>Tidak ada jawaban.</div>";
      }
    } catch(e) {
      console.error(e);
      alert("Gagal memuat hasil ujian.");
    }
  }

  /* --------------------------
     Public API
  ---------------------------*/
  return {
    initListPage: (tbodySelector, alertSelector) => loadExams(tbodySelector, alertSelector),
    initStartPage,
    initAttemptPage,
    initResultPage
  };
})();
