// static/js/exam.js — FINAL VERSION (Stable & Fixed)

const ExamApp = (() => {
  const API_BASE = "/api/exam/exams";

  /* =========================================================================
      HELPERS
  ========================================================================= */
  function xhrJson(url, opts = {}) {
    opts.headers = opts.headers || {};
    opts.headers["X-Requested-With"] = "XMLHttpRequest";

    // Jika body object → JSON
    if (opts.body && typeof opts.body === "object") {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }

    opts.credentials = "same-origin"; // penting untuk auth

    return fetch(url, opts).then(async (res) => {
      const text = await res.text();
      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!res.ok) throw data;
      return data;
    });
  }

  function escapeHtml(v) {
    if (!v) return "";
    return String(v)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(dt) {
    return dt ? new Date(dt).toLocaleString() : "-";
  }

  /* =========================================================================
      LIST PAGE (Daftar Ujian)
  ========================================================================= */
  async function initListPage(tbodySelector, alertSelector) {
    const tbody = document.querySelector(tbodySelector);
    const alertArea = document.querySelector(alertSelector);

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
          <td>${escapeHtml(ex.title)}</td>
          <td>${escapeHtml(ex.description || "")}</td>
          <td>${ex.duration_minutes ? ex.duration_minutes + " menit" : "-"}</td>
          <td>${formatDate(ex.start_time)} — ${formatDate(ex.end_time)}</td>

          <td>
            <a href="/exams/${ex.id}/start/" class="btn btn-sm btn-primary">Detail / Mulai</a>

            ${
              ex.user_attempt
                ? `
                  <a href="/exams/${ex.id}/attempt/${ex.user_attempt}/result/"
                     class="btn btn-sm btn-outline-secondary ms-1">
                     Hasil
                  </a>
                `
                : `
                  <a href="/exams/${ex.id}/result/"
                     class="btn btn-sm btn-outline-secondary ms-1">
                     Hasil
                  </a>
                `
            }
          </td>
        `;

        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      alertArea.innerHTML = `<div class="alert alert-danger">Gagal memuat ujian.</div>`;
      tbody.innerHTML = `<tr><td colspan="5">Terjadi error.</td></tr>`;
    }
  }

  /* =========================================================================
      START PAGE
  ========================================================================= */
  async function initStartPage(examId) {
    try {
      const ex = await xhrJson(`${API_BASE}/${examId}/`);

      document.getElementById("exam-title").textContent = ex.title;
      document.getElementById("exam-desc").textContent = ex.description || "-";
      document.getElementById("exam-duration").textContent =
        ex.duration_minutes ? ex.duration_minutes + " menit" : "-";
      document.getElementById("exam-passing").textContent =
        ex.passing_grade ?? "-";

      document.getElementById("btn-start").onclick = async () => {
        document.getElementById("start-area").style.display = "none";
        document.getElementById("start-loading").style.display = "block";

        try {
          const resp = await xhrJson(`${API_BASE}/${examId}/start/`, {
            method: "POST",
          });

          const ueId =
            resp.user_exam_id ||
            resp.user_exam ||
            resp.id;

          window.location.href = `/exams/${examId}/attempt/${ueId}/`;
        } catch (e) {
          console.error(e);
          alert("Tidak bisa memulai ujian.");
          document.getElementById("start-area").style.display = "block";
          document.getElementById("start-loading").style.display = "none";
        }
      };
    } catch (err) {
      console.error(err);
      alert("Gagal memuat data ujian.");
    }
  }

  /* =========================================================================
      RESULT PAGE (Hasil Ujian)
  ========================================================================= */
  async function initResultPage(examId, attemptId) {
    const box = document.getElementById("result-box");

    try {
      const data = await xhrJson(`${API_BASE}/${examId}/my-result/`);

      const title = data.exam?.title || "Ujian";
      const score = (typeof data.score === "number")
        ? data.score.toFixed(2)
        : (data.score ?? "-");

      const rawScore = data.raw_score ?? "-";
      const hasPassing =
        data.passing_grade !== null && data.passing_grade > 0;

      const passed =
        hasPassing ? data.score >= data.passing_grade : null;

      box.innerHTML = `
        <div class="card p-4 shadow-sm">
          <h4 class="mb-3">${title}</h4>

          <div class="mb-2"><strong>Score:</strong> ${score}</div>
          <div class="mb-2"><strong>Raw Score:</strong> ${rawScore}</div>

          ${
            hasPassing
              ? `
                <div class="mb-2"><strong>Passing Grade:</strong> ${data.passing_grade}</div>
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

  /* =========================================================================
      PUBLIC API
  ========================================================================= */
  return {
    initListPage,
    initStartPage,
    initResultPage,
  };
})();
