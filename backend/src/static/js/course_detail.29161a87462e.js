// ==========================================================
// COURSE DETAIL PAGE — FINAL VERSION
// Compatible with your backend (exam)
// ==========================================================

document.addEventListener("DOMContentLoaded", function () {

    // ------------------------------
    // CONFIG
    // ------------------------------
    const BASE = `/api/exam/courses/${COURSE_ID}/`;

    async function fetchJSON(url, options = {}) {
        try {
            const res = await fetch(url, {
                credentials: "same-origin",
                headers: { "Accept": "application/json", ...(options.headers || {}) },
                ...options
            });

            // backend error (500/404/etc)
            if (!res.ok) {
                console.error("API ERROR:", res.status, url);
                return null;
            }

            return await res.json();
        } catch (err) {
            console.error("FETCH ERROR:", err, url);
            return null;
        }
    }

    // ==========================================================
    // 1. LOAD COURSE DETAIL
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
    // 2. CHECK USER ROLE
    // ==========================================================
    let userRole = null;

    fetchJSON(BASE + "participants/").then(list => {
        if (!list) return;

        const me = list.find(p => p.user === USER_ID);
        userRole = me ? me.role : null;

        if (me && (me.role === "trainer" || user_is_staff)) {
            document.getElementById("btn-add-syllabus").classList.remove("d-none");
            // nanti tambahkan tombol create materials, tasks, exam
        }
    });

    // ==========================================================
    // 3. SYLLABUS — LIST + CRUD
    // ==========================================================
    const syllabusList = document.getElementById("syllabus-list");
    const syllabusModal = new bootstrap.Modal(document.getElementById("modalSyllabus"));
    const syllabusForm = document.getElementById("form-syllabus");
    const syllabusId = document.getElementById("syllabus-id");
    const syllabusTitle = document.getElementById("syllabus-title");
    const syllabusDesc = document.getElementById("syllabus-desc");
    const syllabusMsg = document.getElementById("syllabus-message");

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
                        <h6 class="mb-1">${escapeHTML(s.title)}</h6>
                        <p class="mb-1 small">${escapeHTML(s.description || "")}</p>

                        ${(userRole === "trainer" || user_is_staff)
                        ? `
                          <button class="btn btn-sm btn-outline-primary me-2"
                              onclick="editSyllabus(${s.id},
                                                    '${escapeAttr(s.title)}',
                                                    \`${escapeBacktick(s.description || "")}\`)">
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

    // button add syllabus
    document.getElementById("btn-add-syllabus").onclick = () => {
        syllabusId.value = "";
        syllabusTitle.value = "";
        syllabusDesc.value = "";
        syllabusMsg.innerHTML = "";
        syllabusModal.show();
    };

    // global edit function
    window.editSyllabus = (id, title, desc) => {
        syllabusId.value = id;
        syllabusTitle.value = title;
        syllabusDesc.value = desc;
        syllabusMsg.innerHTML = "";
        syllabusModal.show();
    };

    // save syllabus
    syllabusForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const id = syllabusId.value;
        const payload = {
            title: syllabusTitle.value,
            description: syllabusDesc.value
        };

        const url = id
            ? `${BASE}syllabus/${id}/update/`
            : `${BASE}syllabus/create/`;

        fetchJSON(url, {
            method: id ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).then(res => {
            if (!res) {
                syllabusMsg.innerHTML = `<span class="text-danger">Gagal menyimpan.</span>`;
                return;
            }
            syllabusModal.hide();
            loadSyllabus();
        });
    });

    // delete syllabus
    window.deleteSyllabus = (id) => {
        if (!confirm("Hapus syllabus ini?")) return;

        fetchJSON(`${BASE}syllabus/${id}/delete/`, {
            method: "DELETE"
        }).then(() => loadSyllabus());
    };

    // ==========================================================
    // 4. MATERIALS LIST
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
    // 5. TASKS LIST
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
    // 6. EXAMS LIST
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
                            ? `<span class="badge bg-info text-dark">
                                ${ex.start_date} — ${ex.end_date}
                               </span>`
                            : ""
                        }
                        <div class="mt-2">
                            <a href="/exams/${ex.id}/" class="btn btn-sm btn-primary">Lihat Ujian</a>
                        </div>
                    </div>
                </div>
            `).join("");
        });
    }
    loadExams();


    // ==========================================================
    // SMALL HELPERS
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
