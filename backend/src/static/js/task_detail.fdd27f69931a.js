document.addEventListener("DOMContentLoaded", () => {

    const title = document.getElementById("task-title");
    const desc = document.getElementById("task-desc");
    const maxBox = document.getElementById("task-max");
    const countBox = document.getElementById("task-count");
    const listBox = document.getElementById("submissions-list");
    const form = document.getElementById("task-form");
    const msg = document.getElementById("submit-msg");

    function csrf() {
        const m = document.cookie.match(/csrftoken=([^;]+)/);
        return m ? m[1] : "";
    }

    // ================================================
    // LOAD TASK INFO
    // ================================================
    async function loadTask() {
        const res = await fetch(`/api/exam/tasks/${TASK_ID}/`);
        const data = await res.json();

        title.textContent = data.title;
        desc.textContent = data.description || "-";
        maxBox.textContent = data.max_submissions;
    }

    // ================================================
    // LOAD MY SUBMISSION
    // ================================================
    async function loadMySubmission() {
        const res = await fetch(`/api/exam/tasks/${TASK_ID}/my/`);
        const data = await res.json();

        if (!data) {
            countBox.textContent = "Belum submit";
            listBox.innerHTML = `<div class="text-muted">Belum ada submission.</div>`;
            return;
        }

        countBox.textContent = "Sudah submit";

        listBox.innerHTML = `
            <ul class="list-group">
                <li class="list-group-item">
                    <strong>Terakhir Submit:</strong> ${data.submitted_at}<br>
                    ${data.files.map(f => `
                        <a href="${f.file}" class="btn btn-sm btn-outline-secondary mt-2">Download File</a>
                    `).join("")}
                    ${data.score !== null ? `<div class="mt-2">Nilai: <strong>${data.score}</strong></div>` : ""}
                    ${data.remarks ? `<div class="mt-2">Catatan: ${data.remarks}</div>` : ""}
                </li>
            </ul>
        `;
    }

    // ================================================
    // SUBMIT TASK (CREATE / REPLACE)
    // ================================================
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        msg.textContent = "Mengirim...";
        msg.className = "text-muted";

        const fd = new FormData();
        fd.append("remarks", document.getElementById("answer-remarks").value);

        const files = document.getElementById("answer-files").files;
        for (let f of files) {
            fd.append("files", f);
        }

        const res = await fetch(`/api/exam/tasks/${TASK_ID}/submit/`, {
            method: "POST",
            headers: { "X-CSRFToken": csrf() },
            body: fd
        });

        const data = await res.json();

        if (!res.ok) {
            msg.textContent = data.detail || "Gagal submit.";
            msg.className = "text-danger";
            return;
        }

        msg.textContent = "Berhasil dikirim!";
        msg.className = "text-success";

        loadMySubmission();
    });

    loadTask();
    loadMySubmission();
});
