document.addEventListener("DOMContentLoaded", () => {

    const BASE = `/api/exam/courses/${COURSE_ID}/`;

    async function fetchJSON(url, options = {}) {
        try {
            const res = await fetch(url, {
                credentials: "same-origin",
                headers: { "Accept": "application/json", ...(options.headers || {}) },
                ...options
            });
            if (!res.ok) return null;
            return await res.json();
        } catch {
            return null;
        }
    }

    // =========================================
    // LOAD COURSE
    // =========================================
    fetchJSON(BASE).then(course => {
        if (!course) return;
        document.getElementById("course-title").textContent = course.title;
        document.getElementById("course-description").textContent = course.description || "";
        document.getElementById("course-level").textContent = course.level;
        document.getElementById("course-method").textContent = course.method;
        document.getElementById("course-quota").textContent = "Kuota: " + course.quota;
    });

    // =========================================
    // ROLE
    // =========================================
    let userRole = null;

    fetchJSON(BASE + "participants/").then(list => {
        const me = list?.find(p => p.user === USER_ID);
        userRole = me ? me.role : null;

        if (userRole === "trainer" || user_is_staff) {
            document.getElementById("btn-add-syllabus").classList.remove("d-none");
        }
    });

    // =========================================
    // SYLLABUS
    // =========================================
    const syId = document.getElementById("syllabus-id");
    const syTitle = document.getElementById("syllabus-title");
    const syDesc = document.getElementById("syllabus-desc");
    const syCategory = document.getElementById("syllabus-category");
    const sySubcat = document.getElementById("syllabus-subcategory");
    const syInformant = document.getElementById("syllabus-informant");
    const syStart = document.getElementById("syllabus-start");
    const syEnd = document.getElementById("syllabus-end");
    const syDuration = document.getElementById("syllabus-duration");
    const syOrder = document.getElementById("syllabus-order");

    const syModal = new bootstrap.Modal(document.getElementById("modalSyllabus"));
    const syList = document.getElementById("syllabus-list");

    function buildSchedule(s) {
        if (!s.start_time) return "";
        let start = new Date(s.start_time).toLocaleString();
        let end = s.end_time ? new Date(s.end_time).toLocaleString() : "";
        return `
            <div class="small text-muted">
                <i class="bi bi-clock"></i> ${start} — ${end} (${s.duration_minutes ?? 0} menit)
            </div>
        `;
    }

    function loadSyllabus() {
        syList.innerHTML = "Memuat...";
        fetchJSON(BASE + "syllabus/").then(items => {
            if (!items?.length) {
                syList.innerHTML = "Belum ada syllabus.";
                return;
            }

            syList.innerHTML = items.map(s => `
                <div class="card shadow-sm border-0 mb-3">
                    <div class="card-body">
                        
                        <h5 class="fw-semibold mb-1">${escapeHTML(s.title)}</h5>

                        ${s.informant ? `
                            <div class="small text-primary mb-1">
                                <i class="bi bi-person-video2"></i> ${escapeHTML(s.informant)}
                            </div>` : ""
                        }

                        <div class="text-muted small mb-2">
                            ${escapeHTML(s.description || "")}
                        </div>

                        ${buildSchedule(s)}

                        ${(userRole === "trainer" || user_is_staff) ? `
                            <div class="mt-2">
                                <button class="btn btn-sm btn-outline-primary"
                                    onclick="editSyllabus(
                                        ${s.id},
                                        '${escapeAttr(s.title)}',
                                        \`${escapeBacktick(s.description || "")}\`,
                                        '${escapeAttr(s.category || "")}',
                                        '${escapeAttr(s.sub_category || "")}',
                                        ${s.order},
                                        '${s.start_time || ""}',
                                        '${s.end_time || ""}',
                                        ${s.duration_minutes ?? 'null'},
                                        '${escapeAttr(s.informant || "")}'
                                    )">Edit</button>

                                <button class="btn btn-sm btn-outline-danger ms-1"
                                    onclick="deleteSyllabus(${s.id})">
                                    Hapus
                                </button>
                            </div>
                        ` : ""}

                    </div>
                </div>
            `).join("");
        });
    }
    loadSyllabus();

    document.getElementById("btn-add-syllabus").onclick = () => {
        syId.value = "";
        syTitle.value = "";
        syDesc.value = "";
        syCategory.value = "";
        sySubcat.value = "";
        syInformant.value = "";
        syStart.value = "";
        syEnd.value = "";
        syDuration.value = "";
        syOrder.value = "0";
        syModal.show();
    };

    window.editSyllabus = (id, title, desc, cat, subcat, order, start, end, duration, informant) => {
        syId.value = id;
        syTitle.value = title;
        syDesc.value = desc;
        syCategory.value = cat;
        sySubcat.value = subcat;
        syInformant.value = informant;
        syOrder.value = order;

        syStart.value = start ? formatLocal(start) : "";
        syEnd.value = end ? formatLocal(end) : "";
        syDuration.value = duration ?? "";

        syModal.show();
    };

    function formatLocal(dt) {
        let d = new Date(dt);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    document.getElementById("form-syllabus").onsubmit = (e) => {
        e.preventDefault();

        const id = syId.value;

        const payload = {
            title: syTitle.value,
            description: syDesc.value,
            category: syCategory.value,
            sub_category: sySubcat.value,
            order: Number(syOrder.value),
            start_time: syStart.value ? new Date(syStart.value).toISOString() : null,
            end_time: syEnd.value ? new Date(syEnd.value).toISOString() : null,
            duration_minutes: syDuration.value ? Number(syDuration.value) : null,
            informant: syInformant.value || null
        };

        const url = id
            ? `${BASE}syllabus/${id}/update/`
            : `${BASE}syllabus/create/`;

        fetchJSON(url, {
            method: id ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).then(() => {
            syModal.hide();
            loadSyllabus();
        });
    };

    window.deleteSyllabus = (id) => {
        if (!confirm("Hapus syllabus ini?")) return;
        fetchJSON(`${BASE}syllabus/${id}/delete/`, { method: "DELETE" })
            .then(() => loadSyllabus());
    };

    // =========================================
    // MATERIALS
    // =========================================
    function loadMaterials() {
        const el = document.getElementById("materials-list");
        el.innerHTML = "Memuat...";
        fetchJSON(BASE + "materials/").then(items => {
            if (!items?.length) {
                el.innerHTML = "Belum ada materi.";
                return;
            }
            el.innerHTML = items.map(m => `
                <div class="card border-0 shadow-sm mb-2">
                    <div class="card-body">
                        <h6>${escapeHTML(m.title)}</h6>
                        <p class="small">${escapeHTML(m.description || "")}</p>

                        ${m.file ? `<a href="${m.file}" target="_blank">Download File</a><br>` : ""}
                        ${m.video_url ? `<iframe width="100%" height="240" src="${m.video_url}"></iframe>` : ""}
                        ${m.url ? `<a href="${m.url}" target="_blank">Buka Link</a>` : ""}
                    </div>
                </div>
            `).join("");
        });
    }
    loadMaterials();

    // =========================================
    // TASKS
    // =========================================
    function loadTasks() {
        const el = document.getElementById("tasks-list");
        el.innerHTML = "Memuat...";
        fetchJSON(BASE + "tasks/").then(items => {
            if (!items?.length) {
                el.innerHTML = "Belum ada tugas.";
                return;
            }
            el.innerHTML = items.map(t => `
                <div class="card border-0 shadow-sm mb-2">
                    <div class="card-body">
                        <h6>${escapeHTML(t.title)}</h6>
                        <p class="small">${escapeHTML(t.description || "")}</p>
                        ${t.due_date ? `<span class="badge bg-warning text-dark">Deadline: ${t.due_date}</span>` : ""}
                    </div>
                </div>
            `).join("");
        });
    }
    loadTasks();

    // =========================================
    // EXAMS
    // =========================================
    function loadExams() {
        const el = document.getElementById("exams-list");
        el.innerHTML = "Memuat...";
        fetchJSON(BASE + "exams/").then(items => {
            if (!items?.length) {
                el.innerHTML = "Belum ada ujian.";
                return;
            }
            el.innerHTML = items.map(ex => `
                <div class="card border-0 shadow-sm mb-2">
                    <div class="card-body">
                        <h6>${escapeHTML(ex.title)}</h6>
                        <p class="small">${escapeHTML(ex.description || "")}</p>
                        ${
                            ex.start_date && ex.end_date
                            ? `<span class="badge bg-info text-dark">${ex.start_date} — ${ex.end_date}</span>`
                            : ""
                        }
                        <a href="/exams/${ex.id}/" class="btn btn-sm btn-primary mt-2">Buka Ujian</a>
                    </div>
                </div>
            `).join("");
        });
    }
    loadExams();

    // =========================================
    // HELPERS
    // =========================================
    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, m =>
            ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m])
        );
    }
    function escapeAttr(str) { return str.replace(/'/g, "\\'"); }
    function escapeBacktick(str) { return str.replace(/`/g, "\\`"); }

});
