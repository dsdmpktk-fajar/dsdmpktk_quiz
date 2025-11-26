// ==========================================================
// COURSE DETAIL PAGE — FINAL VERSION
// ==========================================================

document.addEventListener("DOMContentLoaded", function () {

    const BASE = `/api/exam/courses/${COURSE_ID}/`;

    async function fetchJSON(url, options = {}) {
        try {
            const res = await fetch(url, {
                credentials: "same-origin",
                headers: { "Accept": "application/json", ...(options.headers || {}) },
                ...options
            });

            if (!res.ok) {
                console.error("API ERROR:", res.status, url);
                return null;
            }

            return await res.json();
        } catch (err) {
            console.error("FETCH ERROR:", err);
            return null;
        }
    }

    // ==========================================================
    // LOAD COURSE DETAIL
    // ==========================================================
    fetchJSON(BASE).then(course => {
        if (!course) return;

        document.getElementById("course-title").textContent = course.title;
        document.getElementById("course-description").textContent = course.description || "";
        document.getElementById("course-level").textContent = course.level || "-";
        document.getElementById("course-method").textContent = course.method || "-";
        document.getElementById("course-quota").textContent = "Kuota: " + course.quota;
    });

    // ==========================================================
    // ROLE CHECK
    // ==========================================================
    let userRole = null;

    fetchJSON(BASE + "participants/").then(list => {
        if (!list) return;

        const me = list.find(p => p.user === USER_ID);
        userRole = me ? me.role : null;

        if (me && (me.role === "trainer" || user_is_staff)) {
            document.getElementById("btn-add-syllabus").classList.remove("d-none");
        }
    });

    // ==========================================================
    // SYLLABUS CRUD
    // ==========================================================
    const syllabusModal = new bootstrap.Modal(document.getElementById("modalSyllabus"));
    const syllabusList = document.getElementById("syllabus-list");

    const syllabusForm = document.getElementById("form-syllabus");
    const syllabusId = document.getElementById("syllabus-id");
    const syllabusTitle = document.getElementById("syllabus-title");
    const syllabusDesc = document.getElementById("syllabus-desc");
    const syllabusCategory = document.getElementById("syllabus-category");
    const syllabusSubcategory = document.getElementById("syllabus-subcategory");
    const syllabusOrder = document.getElementById("syllabus-order");
    const syllabusMsg = document.getElementById("syllabus-message");

    // Load Syllabus
    function loadSyllabus() {
        syllabusList.innerHTML = `<div class="text-muted">Memuat...</div>`;

        fetchJSON(BASE + "syllabus/").then(items => {
            if (!items || items.length === 0) {
                syllabusList.innerHTML = `<div class="text-muted">Belum ada syllabus.</div>`;
                return;
            }

            syllabusList.innerHTML = items.map(s => `
                <div class="card mb-2">
                    <div class="card-body">
                        <h6>${escapeHTML(s.title)}</h6>
                        <p class="small">${escapeHTML(s.description || "")}</p>

                        ${
                            (userRole === "trainer" || user_is_staff)
                            ? `
                              <button class="btn btn-sm btn-outline-primary me-2"
                                  onclick="editSyllabus(${s.id},
                                                        '${escapeAttr(s.title)}',
                                                        \`${escapeBacktick(s.description || "")}\`,
                                                        '${escapeAttr(s.category || "")}',
                                                        '${escapeAttr(s.sub_category || "")}',
                                                        ${s.order ?? 0})">
                                  Edit
                              </button>
                              <button class="btn btn-sm btn-outline-danger"
                                  onclick="deleteSyllabus(${s.id})">
                                  Hapus
                              </button>
                            `
                            : ""
                        }
                    </div>
                </div>
            `).join("");
        });
    }
    loadSyllabus();

    // Button add syllabus
    document.getElementById("btn-add-syllabus").onclick = () => {
        syllabusId.value = "";
        syllabusTitle.value = "";
        syllabusDesc.value = "";
        syllabusCategory.value = "";
        syllabusSubcategory.value = "";
        syllabusOrder.value = 0;
        syllabusMsg.innerHTML = "";
        syllabusModal.show();
    };

    // Edit syllabus handler
    window.editSyllabus = (id, title, desc, category, subcat, order) => {
        syllabusId.value = id;
        syllabusTitle.value = title;
        syllabusDesc.value = desc;
        syllabusCategory.value = category;
        syllabusSubcategory.value = subcat;
        syllabusOrder.value = order ?? 0;
        syllabusMsg.innerHTML = "";
        syllabusModal.show();
    };

    // Submit syllabus
    syllabusForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const id = syllabusId.value;
        const payload = {
            title: syllabusTitle.value,
            description: syllabusDesc.value,
            category: syllabusCategory.value,
            sub_category: syllabusSubcategory.value,
            order: Number(syllabusOrder.value)
        };

        const url = id
            ? `${BASE}syllabus/${id}/update/`
            : `${BASE}syllabus/create/`;

        fetchJSON(url, {
            method: id ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).then(() => {
            syllabusModal.hide();
            loadSyllabus();
        });
    });

    window.deleteSyllabus = (id) => {
        if (!confirm("Hapus syllabus ini?")) return;
        fetchJSON(`${BASE}syllabus/${id}/delete/`, { method: "DELETE" })
            .then(() => loadSyllabus());
    };

    // ==========================================================
    // MATERIALS LIST
    // ==========================================================
    function loadMaterials() {
        const el = document.getElementById("materials-list");
        el.innerHTML = `<div class="text-muted">Memuat...</div>`;

        fetchJSON(BASE + "materials/").then(items => {
            if (!items || items.length === 0) {
                el.innerHTML = `<div class="text-muted">Belum ada materi.</div>`;
                return;
            }

            el.innerHTML = items.map(m => `
                <div class="card mb-2">
                    <div class="card-body">
                        <h6>${escapeHTML(m.title)}</h6>
                        <p>${escapeHTML(m.description || "")}</p>

                        ${m.file ? `<a href="${m.file}" target="_blank">Download File</a><br/>` : ""}
                        ${m.video_url ? `<iframe width="100%" height="250" src="${m.video_url}" frameborder="0"></iframe>` : ""}
                        ${m.url ? `<a href="${m.url}" target="_blank">Buka Link</a>` : ""}
                    </div>
                </div>
            `).join("");
        });
    }
    loadMaterials();

    // ==========================================================
    // TASKS LIST
    // ==========================================================
    function loadTasks() {
        const el = document.getElementById("tasks-list");
        el.innerHTML = `<div class="text-muted">Memuat...</div>`;

        fetchJSON(BASE + "tasks/").then(items => {
            if (!items || items.length === 0) {
                el.innerHTML = `<div class="text-muted">Belum ada tugas.</div>`;
                return;
            }

            el.innerHTML = items.map(t => `
                <div class="card mb-2">
                    <div class="card-body">
                        <h6>${escapeHTML(t.title)}</h6>
                        <p>${escapeHTML(t.description || "")}</p>
                        ${t.due_date ? `<span class="badge bg-warning text-dark">Deadline: ${t.due_date}</span>` : ""}
                    </div>
                </div>
            `).join("");
        });
    }
    loadTasks();

    // ==========================================================
    // EXAMS LIST
    // ==========================================================
    function loadExams() {
        const el = document.getElementById("exams-list");
        el.innerHTML = `<div class="text-muted">Memuat...</div>`;

        fetchJSON(BASE + "exams/").then(items => {
            if (!items || items.length === 0) {
                el.innerHTML = `<div class="text-muted">Belum ada ujian.</div>`;
                return;
            }

            el.innerHTML = items.map(ex => `
                <div class="card mb-2">
                    <div class="card-body">
                        <h6>${escapeHTML(ex.title)}</h6>
                        <p>${escapeHTML(ex.description || "")}</p>

                        ${
                            ex.start_date && ex.end_date
                            ? `<span class="badge bg-info text-dark">${ex.start_date} — ${ex.end_date}</span>`
                            : ""
                        }

                        <div class="mt-2">
                            <a href="/exams/${ex.id}/" class="btn btn-sm btn-primary">Buka Ujian</a>
                        </div>
                    </div>
                </div>
            `).join("");
        });
    }
    loadExams();

    // ==========================================================
    // ESCAPE HELPERS
    // ==========================================================
    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, function (m) {
            return ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[m];
        });
    }
    function escapeAttr(str) {
        return str.replace(/'/g, "\\'");
    }
    function escapeBacktick(str) {
        return str.replace(/`/g, "\\`");
    }

});
