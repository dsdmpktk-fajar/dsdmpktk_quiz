// static/js/course_list.js
document.addEventListener('DOMContentLoaded', function () {
  const apiBase = '/api/exam/courses/'; // default placeholder (ubah ke '/api/courses/' di project-mu)
  // NOTE: Ganti berikut sesuai endpoint course API
  const COURSES_API = '/api/exam/courses'; // <-- **UBAH** ini ke '/api/courses/' atau prefix yang benar

  const container = document.getElementById('courses-container');
  const loading = document.getElementById('courses-loading');
  const searchInput = document.getElementById('course-search');

  // Modal elements
  const joinModal = new bootstrap.Modal(document.getElementById('joinCourseModal'));
  const joinForm = document.getElementById('join-course-form');
  const joinCourseIdInput = document.getElementById('join-course-id');
  const joinTokenInput = document.getElementById('join-token');
  const joinMessage = document.getElementById('join-course-message');

  // Quick helper for fetch JSON with credentials (so session cookie works)
  function fetchJSON(url, opts = {}) {
    opts.credentials = 'same-origin';
    opts.headers = Object.assign({'Accept': 'application/json'}, opts.headers || {});
    return fetch(url, opts).then(res => {
      if (!res.ok) {
        return res.json().catch(()=>{ throw { status: res.status, message: res.statusText }});
      }
      return res.json();
    });
  }

  function renderCourses(courses) {
    loading && loading.remove();
    container.innerHTML = '';
    if (!courses || courses.length === 0) {
      container.innerHTML = '<div class="col-12 text-muted">Belum ada course.</div>';
      return;
    }

    courses.forEach(course => {
      const col = document.createElement('div');
      col.className = 'col-md-4 col-sm-6';

      const card = document.createElement('div');
      card.className = 'card h-100';

      const body = document.createElement('div');
      body.className = 'card-body d-flex flex-column';

      const title = document.createElement('h5');
      title.className = 'card-title';
      title.textContent = course.title || 'Untitled';

      const desc = document.createElement('p');
      desc.className = 'card-text text-muted small';
      desc.textContent = (course.description || '').slice(0, 180);

      const meta = document.createElement('div');
      meta.className = 'mt-auto d-flex justify-content-between align-items-center';

      const btnGroup = document.createElement('div');

      const btnDetail = document.createElement('a');
      btnDetail.href = '/courses/' + course.id + '/';
      btnDetail.className = 'btn btn-outline-primary btn-sm me-2';
      btnDetail.textContent = 'Lihat';

      const btnJoin = document.createElement('button');
      btnJoin.className = 'btn btn-primary btn-sm';
      btnJoin.textContent = course.joined ? 'Sudah Bergabung' : 'Join';
      if (!course.joined) {
        btnJoin.addEventListener('click', () => openJoinModal(course.id));
      } else {
        btnJoin.disabled = true;
      }

      btnGroup.appendChild(btnDetail);
      btnGroup.appendChild(btnJoin);
      meta.appendChild(btnGroup);

      body.appendChild(title);
      body.appendChild(desc);
      body.appendChild(meta);

      card.appendChild(body);
      col.appendChild(card);
      container.appendChild(col);
    });
  }

  function openJoinModal(courseId) {
    joinCourseIdInput.value = courseId;
    joinTokenInput.value = '';
    joinMessage.textContent = '';
    joinModal.show();
  }

  joinForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const courseId = joinCourseIdInput.value;
    const token = joinTokenInput.value.trim();

    const payload = token ? JSON.stringify({ token }) : JSON.stringify({});
    fetchJSON(`/api/courses/join/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    }).then(resp => {
      // API may return detail + participant id
      joinMessage.className = 'text-success';
      joinMessage.textContent = resp.detail || 'Berhasil bergabung.';
      // refresh list to reflect joined status
      loadCourses();
      setTimeout(()=> joinModal.hide(), 900);
    }).catch(err => {
      joinMessage.className = 'text-danger';
      if (err && err.detail) {
        joinMessage.textContent = err.detail;
      } else {
        joinMessage.textContent = 'Gagal bergabung. Cek token atau koneksi.';
      }
    });
  });

  // Debounced search
  let searchTimer = null;
  searchInput.addEventListener('input', function () {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      loadCourses(searchInput.value.trim());
    }, 400);
  });

  // Load courses from API
  function loadCourses(q='') {
    container.innerHTML = '<div class="col-12 text-center text-muted">Memuat daftar course…</div>';
    // Build query params if search present
    const url = new URL(window.location.origin + '/api/courses/');
    if (q) url.searchParams.set('q', q);

    fetchJSON(url.toString()).then(data => {
      // Expect data as list (or paginated: {results: [...]})
      const courses = Array.isArray(data) ? data : (data.results || []);
      renderCourses(courses);
    }).catch(err => {
      container.innerHTML = `<div class="col-12 text-danger">Gagal memuat course. (${err.status||''})</div>`;
      console.error('Error loading courses', err);
    });
  }

  // initial load
  loadCourses();
});
