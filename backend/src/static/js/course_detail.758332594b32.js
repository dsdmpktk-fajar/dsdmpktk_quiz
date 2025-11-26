document.addEventListener("DOMContentLoaded", function () {

    const BASE = "/api/exam/courses/" + COURSE_ID + "/";

    function fetchJSON(url) {
        return fetch(url, { credentials: "same-origin" })
            .then(async res => {
                let data = null;
                try { data = await res.json(); } catch {}
                return data;
            });
    }

    // ============================
    // LOAD COURSE DETAIL
    // ============================
    fetchJSON(BASE).then(course => {
        document.getElementById("course-title").textContent = course.title;
        document.getElementById("course-description").textContent = course.description || "";
        document.getElementById("course-level").textContent = course.level || "";
        document.getElementById("course-method").textContent = course.method || "";
        document.getElementById("course-quota").textContent = "Kuota: " + course.quota;
    });

    // ============================
    // ROLE CHECK
    // ============================
    let userRole = null;

    fetchJSON(BASE + "participants/").then(list => {
        const me = list?.find(p => p.user === USER_ID);

        if (me && (me.role === "trainer" || user_is_staff)) {
            document.getElementById("btn-add-syllabus").classList.remove("d-none");
        }

        userRole = me ? me.role : null;
    });

    // ============================
    // LIST SYLLABUS
    // ============================
    function loadSyllabus() {
        fetchJSON(BASE + "syllabus/").then(items => {
            const el = document.getElementById("syllabus-list");

            if (!items || items.length === 0) {
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
                                        onclick="editSyllabus(${s.id}, '${s.title.replace(/'/g, "\\'")}', \`${(s.description||"").replace(/`/g,"\\`")}\`)">
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

    // =============================
    // SYLLABUS MODAL
    // =============================
    const syllabusModal = new bootstrap.Modal(document.getElementById("modalSyllabus"));
    const formSyllabus = document.getElementById("form-syllabus");

    const inputId = document.getElementById("syllabus-id");
    const inputTitle = document.getElementById("syllabus-title");
    const inputDesc = document.getElementById("syllabus-desc");
    const msgSyllabus = document.getElementById("syllabus-message");

    document.getElementById("btn-add-syllabus").onclick = () => {
        inputId.value = "";
        inputTitle.value = "";
        inputDesc.value = "";
        msgSyllabus.innerHTML = "";
        syllabusModal.show();
    };

    window.editSyllabus = (id, title, desc) => {
        inputId.value = id;
        inputTitle.value = title;
        inputDesc.value = desc;
        msgSyllabus.innerHTML = "";
        syllabusModal.show();
    };

    formSyllabus.addEventListener("submit", function (e) {
        e.preventDefault();

        const id = inputId.value;
        const payload = {
            title: inputTitle.value,
            description: inputDesc.value,
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
        .then(() => {
            syllabusModal.hide();
            loadSyllabus();
        });
    });

    window.deleteSyllabus = (id) => {
        if (!confirm("Hapus syllabus ini?")) return;

        fetch(`${BASE}syllabus/${id}/delete/`, {
            method: "DELETE",
            credentials: "same-origin"
        })
        .then(() => loadSyllabus());
    };

    // ============================
    // MATERIALS LIST
    // ============================
    function loadMaterials() {
        fetchJSON(BASE + "materials/").then(items => {
            const el = document.getElementById("materials-list");

            if (!items || items.length === 0) {
                el.innerHTML = `<div class="text-muted">Belum ada materi.</div>`;
                return;
            }

            el.innerHTML = items.map(m => `
                <div class="card mb-2">
                    <div class="card-body">
                        <strong>${m.title}</strong>
                        <p>${m.description || ""}</p>

                        ${
                            m.file
                            ? `<a href="${m.file}" target="_blank">Download File</a><br/>`
                            : ""
                        }

                        ${
                            m.video_url
                            ? `<iframe width="100%" height="250" src="${m.video_url}" frameborder="0" allowfullscreen></iframe>`
                            : ""
                        }

                        ${m.url ? `<a href="${m.url}" target="_blank">Buka Link</a>` : ""}
                    </div>
                </div>
            `).join("");
        });
    }
    loadMaterials();

});
