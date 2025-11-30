// static/js/exam.js — FINAL VERSION

const ExamApp = (() => {
  const API_BASE = "/api/exam/exams";

  /* =====================================
     HELPERS
  ======================================*/
  function xhrJson(url, opts = {}) {
    opts.headers = opts.headers || {};
    opts.headers["X-Requested-With"] = "XMLHttpRequest";

    if (opts.body && typeof opts.body === "object") {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }

    opts.credentials = "same-origin";

    return fetch(url, opts).then(async (res) => {
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; }
      catch { data = text; }

      if (!res.ok) throw data;
      return data;
    });
  }

  function escape(v) {
    if (!v) return "";
    return String(v)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function fmt(dt) {
    return dt ? new Date(dt).toLocaleString() : "-";
  }

  /* =====================================
     LIST PAGE
  ======================================*/
  async function initListPage(tbodySel, alertSel) {
    const tbody = document.querySelector(tbodySel);
    const alertArea = document.querySelector(alertSel);
    tbody.innerHTML = `<tr><td colspan="5">Memuat…</td></tr>`;

    try {
      const exams = await xhrJson(`${API_BASE}/`);

      if (!Array.isArray(exams) || exams.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">Tidak ada ujian.</td></tr>`;
        return;
      }

      tbody.innerHTML = "";

      exams.forEach((ex) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${escape(ex.title)}</td>
          <td>${escape(ex.description || "")}</td>
          <td>${ex.duration_minutes ? ex.duration_minutes + " menit" : "-"}</td>
          <td>${fmt(ex.start_time)} — ${fmt(ex.end_time)}</td>

          <td>
            <a href="/exams/${ex.id}/start/" class="btn btn-sm btn-primary">Detail / Mulai</a>

            ${
              ex.user_attempt
                ? `<a href="/exams/${ex.id}/attempt/${ex.user_attempt}/result/"
                     class="btn btn-sm btn-outline-secondary ms-1">
                     Hasil
                   </a>`
                : `<span class="ms-2 text-muted small">Belum mengerjakan</span>`
            }
          </td>
        `;

        tbody.appendChild(tr);
      });

    } catch (err) {
      console.error(err);
      alertArea.innerHTML = `<div class="alert alert-danger">Gagal memuat ujian.</div>`;
      tbody.innerHTML = `<tr><td colspan="5">Error</td></tr>`;
    }
  }

  /* =====================================
     START PAGE
  ======================================*/
  async function initStartPage(examId) {
    try {
      const ex = await xhrJson(`${API_BASE}/${examId}/`);

      document.getElementById("exam-title").textContent    = ex.title;
      document.getElementById("exam-desc").textContent     = ex.description || "-";
      document.getElementById("exam-duration").textContent = ex.duration_minutes ? ex.duration_minutes + " menit" : "-";
      document.getElementById("exam-passing").textContent  = ex.passing_grade ?? "-";

      document.getElementById("btn-start").onclick = async () => {
        document.getElementById("start-area").style.display = "none";
        document.getElementById("start-loading").style.display = "block";

        try {
          const resp = await xhrJson(`${API_BASE}/${examId}/start/`, { method: "POST" });
          const ueId = resp.user_exam_id || resp.user_exam || resp.id;

          window.location.href = `/exams/${examId}/attempt/${ueId}/`;
        } catch (e) {
          console.error(e);
          alert("Tidak bisa mulai ujian.");
        }
      };

    } catch (err) {
      console.error(err);
      alert("Gagal memuat data ujian.");
    }
  }

  /* =====================================
     RESULT PAGE
  ======================================*/
  async function initResultPage(examId, attemptId) {
    const box = document.getElementById("result-box");

    try {
      const data = await xhrJson(`${API_BASE}/${examId}/my-result/`);

      const examTitle  = data.exam?.title || "Ujian";
      const score      = data.score?.toFixed(2) || 0;
      const rawScore   = data.raw_score ?? "-";

      const hasPassing = data.passing_grade !== null && data.passing_grade > 0;
      const passed     = hasPassing ? (data.score >= data.passing_grade) : null;

      box.innerHTML = `
        <div class="card p-4 shadow-sm">
          <h4 class="mb-3">${examTitle}</h4>

          <div class="mb-2"><strong>Score:</strong> ${score}</div>
          <div class="mb-2"><strong>Raw Score:</strong> ${rawScore}</div>

          ${
            hasPassing
              ? `<div class="mb-2"><strong>Passing Grade:</strong> ${data.passing_grade}</div>
                 <span class="badge ${passed ? "bg-success" : "bg-danger"}">
                    ${passed ? "LULUS" : "TIDAK LULUS"}
                 </span>`
              : ""
          }

          <div class="text-muted small mt-3">
            <div><strong>Mulai:</strong> ${data.start_time || "-"}</div>
            <div><strong>Selesai:</strong> ${data.end_time || "-"}</div>
            <div><strong>Status:</strong> ${data.status}</div>
            <div><strong>Attempt:</strong> ${data.attempt_number}</div>
          </div>
        </div>
      `;
    } catch (err) {
      console.error(err);
      box.innerHTML = `<div class="alert alert-danger">Gagal memuat hasil ujian.</div>`;
    }
  }

  /* =====================================
     PUBLIC API
  ======================================*/
  return {
    initListPage,
    initStartPage,
    initResultPage,
  };
})();
