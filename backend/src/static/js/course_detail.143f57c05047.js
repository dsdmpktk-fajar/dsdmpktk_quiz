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

    // ==========================
    // LOAD SYLLABUS
    // ==========================
    fetchJSON(BASE + "syllabus/").then(items => {
        const el = document.getElementById("syllabus-list");
        el.innerHTML = items.map(s => `
            <div class="card mb-2">
                <div class="card-body">
                    <strong>${s.title}</strong><br/>
                    <small>${s.description || ""}</small>
                </div>
            </div>
        `).join("") || "Belum ada syllabus.";
    });

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
