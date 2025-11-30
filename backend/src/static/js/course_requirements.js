document.addEventListener("DOMContentLoaded", () => {

    const templateList = document.getElementById("req-template-list");
    const reqFormContainer = document.getElementById("req-form-container");
    const reqFields = document.getElementById("req-fields");
    const reqMessage = document.getElementById("req-message");
    const statusBox = document.getElementById("req-status-box");

    // CSRF for fetch
    function getCSRF() {
        const name = "csrftoken=";
        const decoded = decodeURIComponent(document.cookie);
        const parts = decoded.split("; ");

        for (let p of parts) {
            if (p.startsWith(name)) return p.substring(name.length);
        }
        return "";
    }

    // Fetch requirements
    async function loadRequirements() {
        templateList.innerHTML = `<div class="text-muted">Memuat persyaratan...</div>`;

        const res = await fetch(`/api/exam/courses/${COURSE_ID}/requirements/`, {
            credentials: "same-origin"
        });
        const data = await res.json();

        renderTemplates(data.templates);
        renderStatus(data.user_submission);
        renderForm(data.templates, data.user_submission);
    }

    // Render template list
    function renderTemplates(templates) {
        if (!templates.length) {
            templateList.innerHTML = `<div class="alert alert-info">Course ini tidak memiliki persyaratan.</div>`;
            return;
        }

        templateList.innerHTML = `
            <h5 class="mb-2">Daftar Persyaratan</h5>
            <ul class="list-group">
                ${templates
                    .map(
                        (t) => `
                    <li class="list-group-item">
                        <strong>${t.field_name}</strong>
                        <span class="text-muted">(${t.field_type})</span>
                        ${t.required ? `<span class="badge bg-danger ms-2">Wajib</span>` : ""}
                    </li>`
                    )
                    .join("")}
            </ul>
        `;
    }

    // Render status (approved/pending/rejected)
    function renderStatus(submission) {
        if (!submission) {
            statusBox.innerHTML = `
                <div class="alert alert-warning">
                    Anda belum mengajukan persyaratan.
                </div>`;
            return;
        }

        let badge = `<span class="badge bg-secondary">Pending</span>`;
        if (submission.status === "approved") badge = `<span class="badge bg-success">Approved</span>`;
        if (submission.status === "rejected") badge = `<span class="badge bg-danger">Rejected</span>`;

        statusBox.innerHTML = `
            <div class="alert alert-light border">
                Status pengajuan: ${badge}
                <br>
                <small class="text-muted">Dikirim pada: ${submission.submitted_at}</small>
                ${submission.note ? `<div class="mt-2 text-danger">Catatan: ${submission.note}</div>` : ""}
            </div>
        `;
    }

    // Render form (hidden if approved)
    function renderForm(templates, submission) {
        if (!templates.length) {
            reqFormContainer.style.display = "none";
            return;
        }

        // Kalau sudah approved → tidak boleh kirim lagi
        if (submission && submission.status === "approved") {
            reqFormContainer.style.display = "none";
            return;
        }

        reqFields.innerHTML = "";

        templates.forEach((t) => {
            let field = `<div class="mb-3">
                <label class="form-label">${t.field_name}`;
            if (t.required) field += ` <span class="text-danger">*</span>`;
            field += `</label>`;

            if (t.field_type === "text") {
                field += `<textarea class="form-control" name="req_${t.id}" rows="3"></textarea>`;
            } else if (t.field_type === "number") {
                field += `<input type="number" class="form-control" name="req_${t.id}">`;
            } else if (t.field_type === "select") {
                field += `<select class="form-select" name="req_${t.id}">
                            <option value="">-- pilih --</option>
                            ${t.options.map((o) => `<option value="${o}">${o}</option>`).join("")}
                          </select>`;
            } else if (t.field_type === "file") {
                field += `<input type="file" class="form-control" name="file_${t.id}">`;
            }

            field += `</div>`;
            reqFields.insertAdjacentHTML("beforeend", field);
        });

        reqFormContainer.style.display = "block";
    }

    // Handle Submit
    document.getElementById("req-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        reqMessage.innerHTML = ``;

        const fd = new FormData();
        const answers = [];

        const inputs = reqFields.querySelectorAll("textarea, input, select");

        inputs.forEach((inp) => {
            const name = inp.name;

            if (name.startsWith("req_")) {
                const rid = parseInt(name.replace("req_", ""));
                answers.push({
                    requirement: rid,
                    value_text: inp.value,
                });
            } else if (name.startsWith("file_")) {
                const rid = parseInt(name.replace("file_", ""));
                if (inp.files.length > 0) {
                    fd.append(`file_${rid}`, inp.files[0]);
                }
                answers.push({
                    requirement: rid,
                    value_file: null, // akan ditimpa oleh FormData
                });
            }
        });

        fd.append("answers", JSON.stringify(answers));

        const res = await fetch(`/api/exam/courses/${COURSE_ID}/requirements/submit/`, {
            method: "POST",
            body: fd,
            headers: {
                "X-CSRFToken": getCSRF(),
            },
            credentials: "same-origin",
        });

        const data = await res.json();

        if (!res.ok) {
            reqMessage.innerHTML = `<div class="alert alert-danger">${data.detail || "Gagal mengirim persyaratan."}</div>`;
            return;
        }

        reqMessage.innerHTML = `<div class="alert alert-success">Berhasil dikirim. Menunggu persetujuan admin.</div>`;
        loadRequirements();
    });

    loadRequirements();
});
