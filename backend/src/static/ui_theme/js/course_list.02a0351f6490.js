// static_src/js/course_list.js
document.addEventListener('DOMContentLoaded', function () {

    // ============================
    // API BASE (BENAR)
    // ============================
    const COURSES_API = "/api/exam/courses/";   // ← INILAH YANG BENAR

    const container = document.getElementById('courses-container');
    const loading = document.getElementById('courses-loading');
    const searchInput = document.getElementById('course-search');

    // --- Modal for join ---
    const joinModal = new bootstrap.Modal(document.getElementById('joinCourseModal'));
    const joinForm = document.getElementById('join-course-form');
    const joinCourseIdInput = document.getElementById('join-course-id');
    const joinTokenInput = document.getElementById('join-token');
    const joinMessage = document.getElementById('join-course-message');

    // ============================================================
    // CSRF TOKEN FIX (WAJIB AGAR JOIN TIDAK ERROR)
    // ============================================================
    function getCSRFToken() {
        const cookie = document.cookie.split("; ");
        for (let i = 0; i < cookie.length; i++) {
            const [name, value] = cookie[i].split("=");
            if (name === "csrftoken") return value;
        }
        return null;
    }

    // ============================================================
    // Helper fetch wrapper
    // ============================================================
    function fetchJSON(url, opts = {}) {
        opts.credentials = "same-origin";
        opts.headers = Object.assign({ "Accept": "application/json" }, opts.headers || {});
        return fetch(url, opts).then(async res => {
            let data = null;
            try { data = await res.json(); } catch (e) {}
            if (!res.ok) {
                throw data || { detail: "Error " + res.status };
            }
            return data;
        });
    }

    // ============================================================
    // Render courses
    // ============================================================
    function renderCourses(courses) {
        loading && loading.remove();
        container.innerHTML = "";

        if (!courses || courses.length === 0) {
            container.innerHTML = `<div class="col-12 text-center text-muted">Belum ada course.</div>`;
            return;
        }

        courses.forEach(course => {
            const col = document.createElement("div");
            col.className = "col-md-4 col-sm-6";

            col.innerHTML = `
                <div class="card h-100">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${course.title}</h5>
                        <p class="text-muted small">${(course.description || "").slice(0, 180)}</p>
                        <div class="mt-auto d-flex justify-content-between align-items-center">
                            <a href="/courses/${course.id}/" class="btn btn-outline-primary btn-sm">Lihat</a>
                            ${
                                course.joined
                                ? `<button class="btn btn-secondary btn-sm" disabled>Sudah Join</button>`
                                : `<button class="btn btn-primary btn-sm" data-course="${course.id}">Join</button>`
                            }
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(col);
        });

        // Event listener join
        document.querySelectorAll("button[data-course]").forEach(btn => {
            btn.addEventListener("click", () => {
                joinCourseIdInput.value = btn.dataset.course;
                joinTokenInput.value = "";
                joinMessage.innerHTML = "";
                joinModal.show();
            });
        });
    }

    // ============================================================
    // JOIN COURSE (PATCHED WITH CSRF)
    // ============================================================
    joinForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const courseId = joinCourseIdInput.value;
        const token = joinTokenInput.value.trim();

        fetchJSON(`${COURSES_API}${courseId}/join/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken()     // ← FIX TERPENTING
            },
            body: JSON.stringify({ token: token })
        })
        .then(data => {
            joinMessage.className = "text-success";
            joinMessage.textContent = data.detail || "Berhasil join!";

            loadCourses();
            setTimeout(() => joinModal.hide(), 1000);
        })
        .catch(err => {
            joinMessage.className = "text-danger";
            joinMessage.textContent = err.detail || "Gagal join";
        });
    });

    // ============================================================
    // Search
    // ============================================================
    let searchTimer = null;
    searchInput.addEventListener("input", function () {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            loadCourses(searchInput.value.trim());
        }, 400);
    });

    // ============================================================
    // Load courses
    // ============================================================
    function loadCourses(q = "") {
        container.innerHTML = `<div class="col-12 text-muted text-center">Memuat data…</div>`;

        let url = COURSES_API;
        if (q) url += `?search=${encodeURIComponent(q)}`;

        fetchJSON(url)
            .then(data => {
                const list = Array.isArray(data) ? data : data.results || [];
                renderCourses(list);
            })
            .catch(err => {
                container.innerHTML = `<div class="col-12 text-danger">${err.detail || "Gagal memuat data"}</div>`;
            });
    }

    // Initial load
    loadCourses();
});
