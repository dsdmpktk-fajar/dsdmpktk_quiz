document.addEventListener("DOMContentLoaded", () => {

    const titleBox = document.getElementById("course-title");
    const descBox = document.getElementById("course-description");

    const levelBox = document.getElementById("course-level");
    const methodBox = document.getElementById("course-method");
    const quotaBox = document.getElementById("course-quota");

    const joinBox = document.getElementById("course-join-box");

    const overviewBox = document.getElementById("overview-box");
    const reqStatusBox = document.getElementById("req-status");
    const reqFillBtn = document.getElementById("req-fill-btn");

    const syllabusList = document.getElementById("syllabus-list");
    const materialsList = document.getElementById("materials-list");
    const tasksList = document.getElementById("tasks-list");
    const examsList = document.getElementById("exams-list");

    function csrf() {
        const match = document.cookie.match(/csrftoken=([^;]+)/);
        return match ? match[1] : "";
    }

    // ============================================================
    // LOAD MAIN COURSE INFO
    // ============================================================
    async function loadCourse() {
        const res = await fetch(`/api/exam/courses/${COURSE_ID}/`);
        const data = await res.json();

        // Header
        titleBox.innerText = data.title;
        descBox.innerText = data.description || "-";

        levelBox.innerText = data.level;
        methodBox.innerText = data.method;
        quotaBox.innerText = `Quota: ${data.quota}`;

        renderJoinBox(data);
        renderOverview(data);
    }

    // ============================================================
    // JOIN BOX LOGIC
    // ============================================================
    function renderJoinBox(course) {
        if (course.joined) {
            joinBox.innerHTML = `
                <span class="badge bg-success">Anda sudah terdaftar sebagai peserta</span>
            `;
            return;
        }

        if (course.requires_approval) {
            joinBox.innerHTML = `
                <a class="btn btn-warning" href="/courses/${COURSE_ID}/requirements/">
                    Isi Persyaratan
                </a>
            `;
            return;
        }

        joinBox.innerHTML = `
            <div class="input-group" style="max-width:300px;">
                <input class="form-control form-control-sm" id="join-token-input" placeholder="Token course">
                <button class="btn btn-primary btn-sm" id="join-btn">Join</button>
            </div>
            <div id="join-message" class="small text-danger mt-1"></div>
        `;

        document.getElementById("join-btn").onclick = joinCourse;
    }

    async function joinCourse() {
        const token = document.getElementById("join-token-input").value;
        const msg = document.getElementById("join-message");

        const res = await fetch(`/api/exam/courses/${COURSE_ID}/join/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrf()
            },
            body: JSON.stringify({ token }),
            credentials: "same-origin"
        });

        const data = await res.json();

        if (!res.ok && data.requires_approval) {
            window.location.href = `/courses/${COURSE_ID}/requirements/`;
            return;
        }

        if (!res.ok) {
            msg.innerText = data.detail || "Gagal join.";
            return;
        }

        location.reload();
    }

    // ============================================================
    // OVERVIEW TAB
    // ============================================================
    function renderOverview(course) {
        overviewBox.innerHTML = `
            <div class="card border p-3">
                <strong>Level:</strong> ${course.level}<br>
                <strong>Metode:</strong> ${course.method}<br>
                <strong>Quota:</strong> ${course.quota}<br>
                <strong>Tanggal:</strong> ${course.start_date || "-"} → ${course.end_date || "-"}
            </div>
        `;
    }

    // ============================================================
    // REQUIREMENT TAB
    // ============================================================
    async function loadRequirementStatus() {
        const res = await fetch(`/api/exam/courses/${COURSE_ID}/requirements/`);
        const data = await res.json();

        reqFillBtn.href = `/courses/${COURSE_ID}/requirements/`;

        if (!data.templates.length) {
            reqStatusBox.innerHTML = `<div class="text-muted">Tidak ada persyaratan.</div>`;
            return;
        }

        if (!data.user_submission) {
            reqStatusBox.innerHTML = `
                <div class="alert alert-warning">Anda belum mengajukan persyaratan.</div>
            `;
            return;
        }

        const s = data.user_submission;

        let badge = `<span class="badge bg-secondary">Pending</span>`;
        if (s.status === "approved") badge = `<span class="badge bg-success">Approved</span>`;
        if (s.status === "rejected") badge = `<span class="badge bg-danger">Rejected</span>`;

        reqStatusBox.innerHTML = `
            <div class="card p-3">
                <div>Status: ${badge}</div>
                <small class="text-muted">Dikirim: ${s.submitted_at}</small>
                ${s.note ? `<div class="text-danger mt-2">Catatan: ${s.note}</div>` : ""}
            </div>
        `;
    }

    // ============================================================
    // SYLLABUS
    // ============================================================
    async function loadSyllabus() {
        const res = await fetch(`/api/exam/courses/${COURSE_ID}/syllabus/`);
        const data = await res.json();

        if (!data.length) {
            syllabusList.innerHTML = `<div class="text-muted">Belum ada syllabus.</div>`;
            return;
        }

        syllabusList.innerHTML = `
            <ul class="list-group">
                ${data.map(s => `
                    <li class="list-group-item">
                        <strong>${s.title}</strong><br>
                        <small class="text-muted">${s.category || ""} / ${s.sub_category || ""}</small>
                        <div class="small text-muted mt-1">${s.start_time || "-"} → ${s.end_time || "-"}</div>
                    </li>
                `).join("")}
            </ul>
        `;
    }

    // ============================================================
    // MATERIALS
    // ============================================================
    async function loadMaterials() {
        const res = await fetch(`/api/exam/courses/${COURSE_ID}/materials/`);
        const data = await res.json();

        if (!data.length) {
            materialsList.innerHTML = `<div class="text-muted">Belum ada materi.</div>`;
            return;
        }

        materialsList.innerHTML = `
            <ul class="list-group">
                ${data.map(m => `
                    <li class="list-group-item">
                        <strong>${m.title}</strong><br>
                        <small>${m.description || ""}</small>
                    </li>
                `).join("")}
            </ul>
        `;
    }

    // ============================================================
    // TASKS
    // ============================================================
    async function loadTasks() {
        const res = await fetch(`/api/exam/courses/${COURSE_ID}/tasks/`);
        const data = await res.json();

        if (!data.length) {
            tasksList.innerHTML = `<div class="text-muted">Belum ada tugas.</div>`;
            return;
        }

        tasksList.innerHTML = `
            <ul class="list-group">
                ${data.map(t => `
                    <li class="list-group-item">
                        <strong>${t.title}</strong><br>
                        <small>${t.description || ""}</small>
                    </li>
                `).join("")}
            </ul>
        `;
    }

    // ============================================================
    // EXAMS
    // ============================================================
    async function loadExams() {
        const res = await fetch(`/api/exam/courses/${COURSE_ID}/exams/`);
        const data = await res.json();

        if (!data.length) {
            examsList.innerHTML = `<div class="text-muted">Belum ada ujian.</div>`;
            return;
        }

        examsList.innerHTML = `
            <ul class="list-group">
                ${data.map(e => `
                    <li class="list-group-item">
                        <strong>${e.title}</strong><br>
                        <a href="/exams/${e.id}/start/" class="btn btn-primary btn-sm mt-2">Mulai</a>
                    </li>
                `).join("")}
            </ul>
        `;
    }


    // ============================================================
    // INIT
    // ============================================================
    loadCourse();
    loadRequirementStatus();
    loadSyllabus();
    loadMaterials();
    loadTasks();
    loadExams();
});
