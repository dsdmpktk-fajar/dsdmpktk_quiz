document.addEventListener("DOMContentLoaded", function () {

    const BASE = "/api/exam/courses/" + COURSE_ID + "/";
    

    function fetchJSON(url) {
        return fetch(url, { credentials: "same-origin" })
            .then(res => res.json());
    }

    // ==========================
    // LOAD COURSE DETAIL
    // ==========================
    fetchJSON(BASE).then(course => {
        document.getElementById("course-title").textContent = course.title;
        document.getElementById("course-description").textContent = course.description || "";
        document.getElementById("course-level").textContent = course.level;
        document.getElementById("course-method").textContent = course.method;
        document.getElementById("course-quota").textContent = "Kuota: " + course.quota;
    });

    // ==========================
    // JOIN STATUS
    // ==========================
    fetchJSON(BASE + "participants/").then(participants => {

        const me = participants.find(p => p.user === USER_ID); // OPTIONAL jika user id tersedia
        const joinSection = document.getElementById("join-section");

        joinSection.innerHTML = "";

        if (me) {
            joinSection.innerHTML = `<div class="alert alert-success">Anda sudah tergabung dalam course ini.</div>`;
        } else {
            joinSection.innerHTML = `
                <button id="btn-join" class="btn btn-primary">Join Course</button>
                <input id="join-token" placeholder="Token" class="form-control mt-2" />
            `;

            document.getElementById("btn-join").onclick = () => {
                const token = document.getElementById("join-token").value;
                fetch(BASE + "join/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                    credentials: "same-origin"
                })
                .then(res => res.json())
                .then(data => {
                    alert(data.detail || "Berhasil join");
                    location.reload();
                });
            };
        }
    });

    // =========================
    // SYLLABUS CRUD (FINAL VERSION)
    // =========================

    const syllabusModal = new bootstrap.Modal(document.getElementById("modalSyllabus"));
    const formSyllabus = document.getElementById("form-syllabus");

    const inputId = document.getElementById("syllabus-id");
    const inputTitle = document.getElementById("syllabus-title");
    const inputDesc = document.getElementById("syllabus-desc");
    const inputCat = document.getElementById("syllabus-category");
    const inputSub = document.getElementById("syllabus-subcategory");
    const msgSyllabus = document.getElementById("syllabus-message");

    let userRole = null;

    // Detect role user dalam course
    fetchJSON(BASE + "participants/").then(list => {
        const me = list.find(p => p.user === USER_ID);

        if (me && (me.role === "trainer" || user_is_staff)) {
            document.getElementById("btn-add-syllabus").classList.remove("d-none");
        }

        userRole = me ? me.role : null;
    });

    // ===============================
    // LOAD SYLLABUS LIST
    // ===============================
    function loadSyllabus() {
        fetchJSON(BASE + "syllabus/").then(items => {
            const el = document.getElementById("syllabus-list");

            if (!items.length) {
                el.innerHTML = `<div class="text-muted">Belum ada syllabus.</div>`;
                return;
            }

            el.innerHTML = items.map(s => `
                <div class="card mb-2">
                    <div class="card-body">
                        <strong>${s.title}</strong><br/>
                        <small>${s.description || ""}</small>

                        ${
                            (userRole === "trainer" || user_is_staff)
                            ? `
                                <div class="mt-2">
                                    <button class="btn btn-sm btn-outline-primary me-2"
                                        onclick="editSyllabus(${s.id}, '${s.title.replace(/'/g, "\\'")}', \`${(s.description||"").replace(/`/g,"\\`")}\`, '${s.category||""}', '${s.sub_category||""}')">
                                        Edit
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteSyllabus(${s.id})">
                                        Hapus
                                    </button>
                                </div>
                            `
                            : ""
                        }
                    </div>
                </div>
            `).join("");
        });
    }
    loadSyllabus();


    // ===============================
    // ADD SYLLABUS
    // ===============================
    document.getElementById("btn-add-syllabus").onclick = () => {
        inputId.value = "";
        inputTitle.value = "";
        inputDesc.value = "";
        inputCat.value = "";
        inputSub.value = "";
        msgSyllabus.innerHTML = "";

        document.getElementById("syllabusModalTitle").innerText = "Tambah Syllabus";
        syllabusModal.show();
    };


    // ===============================
    // EDIT SYLLABUS
    // ===============================
    window.editSyllabus = (id, title, desc, cat, sub) => {
        inputId.value = id;
        inputTitle.value = title;
        inputDesc.value = desc;
        inputCat.value = cat;
        inputSub.value = sub;
        msgSyllabus.innerHTML = "";

        document.getElementById("syllabusModalTitle").innerText = "Edit Syllabus";
        syllabusModal.show();
    };


    // ===============================
    // SUBMIT (Add or Edit)
    // ===============================
    formSyllabus.addEventListener("submit", function (e) {
        e.preventDefault();

        const id = inputId.value;
        const payload = {
            title: inputTitle.value,
            description: inputDesc.value,
            category: inputCat.value,
            sub_category: inputSub.value,
        };

        const url = id
            ? `${BASE}syllabus/${id}/update/`
            : `${BASE}syllabus/create/`;

        fetch(url, {
            method: id ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "same-origin"
        })
        .then(r => r.json())
        .then(data => {
            if (data.detail && data.detail.includes("Tidak diizinkan")) {
                msgSyllabus.innerHTML = `<span class="text-danger">${data.detail}</span>`;
                return;
            }

            syllabusModal.hide();
            loadSyllabus();
        });
    });


    // ===============================
    // DELETE SYLLABUS
    // ===============================
    window.deleteSyllabus = (id) => {
        if (!confirm("Hapus syllabus ini?")) return;

        fetch(`${BASE}syllabus/${id}/delete/`, {
            method: "DELETE",
            credentials: "same-origin"
        })
        .then(r => r.json())
        .then(() => loadSyllabus());
    };


    // ==========================
    // LOAD MATERIALS
    // ==========================
    fetchJSON(BASE + "materials/").then(items => {
        const el = document.getElementById("materials-list");
        el.innerHTML = items.map(m => `
            <div class="card mb-2">
                <div class="card-body">
                    <strong>${m.title}</strong>
                    <p>${m.description || ""}</p>
                    ${m.file ? `<a href="${m.file}" target="_blank">Download File</a>` : ""}
                    ${m.video_url ? `<div><iframe width="100%" src="${m.video_url}"></iframe></div>` : ""}
                </div>
            </div>
        `).join("") || "Belum ada materi.";
    });

    // ==========================
    // LOAD TASKS
    // ==========================
    fetchJSON(BASE + "tasks/").then(items => {
        const el = document.getElementById("tasks-list");
        el.innerHTML = items.map(t => `
            <div class="card mb-2">
                <div class="card-body">
                    <strong>${t.title}</strong>
                    <p>${t.description || ""}</p>
                    <span class="badge bg-warning">Deadline: ${t.due_date}</span>
                </div>
            </div>
        `).join("") || "Belum ada tugas.";
    });

    // ==========================
    // LOAD EXAMS
    // ==========================
    fetchJSON(BASE + "exams/").then(items => {
        const el = document.getElementById("exams-list");
        el.innerHTML = items.map(ex => `
            <div class="card mb-2">
                <div class="card-body">
                    <strong>${ex.title}</strong>
                    <p>${ex.description || ""}</p>
                    <a href="/exams/${ex.id}/" class="btn btn-primary btn-sm">Lihat Ujian</a>
                </div>
            </div>
        `).join("") || "Belum ada ujian.";
    });

});
