const CourseRequirements = (() => {

    const API = "/api/exam/courses";

    async function fetchJSON(url, options = {}) {
        const headers = options.headers || {};
        headers["Content-Type"] = "application/json";
        options.headers = headers;

        if (options.body && typeof options.body === "object") {
            options.body = JSON.stringify(options.body);
        }

        const res = await fetch(url, options);
        const data = await res.json();
        if (!res.ok) throw data;
        return data;
    }

    async function loadRequirements(courseId) {
        const container = document.querySelector("#requirements-area");

        try {
            const data = await fetchJSON(`${API}/${courseId}/requirements/`);

            if (!data.length) {
                container.innerHTML = `
                    <div class="alert alert-info">
                        Tidak ada persyaratan. Anda bisa langsung join course.
                    </div>
                    <a href="/courses/${courseId}/" class="btn btn-primary mt-3">Kembali ke Course</a>
                `;
                return;
            }

            container.innerHTML = `
                <h5>Daftar Syarat:</h5>
                <ul class="list-group mb-3">
                    ${data.map(r => `
                        <li class="list-group-item">
                            <strong>${r.title}</strong><br/>
                            <small>${r.description || ""}</small><br/>
                            <span class="badge bg-${statusColor(r.status)} mt-2">
                                ${r.status_label}
                            </span>
                        </li>
                    `).join("")}
                </ul>
            `;

            // tampilkan form
            document.querySelector("#submission-area").style.display = "block";

            renderForm(data);

        } catch (err) {
            container.innerHTML = `
                <div class="alert alert-danger">Gagal memuat persyaratan.</div>
            `;
        }
    }

    function renderForm(requirements) {
        const fields = document.querySelector("#requirements-fields");

        fields.innerHTML = requirements.map(req => `
            <div class="mb-3">
                <label class="form-label"><strong>${req.title}</strong></label>
                <textarea class="form-control" 
                    name="req_${req.id}" 
                    placeholder="Isi jawaban atau upload link dokumen"></textarea>
            </div>
        `).join("");

        document.querySelector("#requirements-form").addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const payload = [];

            requirements.forEach(r => {
                payload.push({
                    requirement: r.id,
                    answer: formData.get(`req_${r.id}`)
                });
            });

            try {
                const res = await fetchJSON(`${API}/${courseId}/requirements/submit/`, {
                    method: "POST",
                    body: { submissions: payload }
                });

                document.querySelector("#req-alert").innerHTML = `
                    <div class="alert alert-success">Berhasil mengirim. Menunggu persetujuan admin.</div>
                `;

            } catch (err) {
                document.querySelector("#req-alert").innerHTML = `
                    <div class="alert alert-danger">${err.detail || "Gagal submit."}</div>
                `;
            }
        });
    }

    function statusColor(status) {
        if (status === "approved") return "success";
        if (status === "rejected") return "danger";
        return "secondary";
    }

    return {
        init: loadRequirements,
    };
})();
