// =========================================
// GLOBAL STATE
// =========================================
let questions = [];
let index = 0;
let answers = {}; // qid => { selected_choices:[], text_answer:"", files: FileList }
let timerInterval = null;

let isSubmitting = false;

let examDuration = null;
let examStart = null;

document.addEventListener("DOMContentLoaded", () => {

    const qbox = document.getElementById("question-box");
    const msg = document.getElementById("exam-msg");
    const timerBox = document.getElementById("timer");
    const navBox = document.getElementById("q-nav");
    const progressBox = document.getElementById("progress-container");

    // =========================================
    // CSRF Token
    // =========================================
    function csrf() {
        const m = document.cookie.match(/csrftoken=([^;]+)/);
        return m ? m[1] : "";
    }

    // =========================================
    // LOAD QUESTIONS
    // =========================================
    async function loadQuestions() {
        const res = await fetch(`/api/exam/exams/${EXAM_ID}/questions/?user_exam=${ATTEMPT_ID}`);
        questions = await res.json();

        if (!questions.length) {
            qbox.innerHTML = "<div class='text-danger'>Tidak ada soal.</div>";
            return;
        }

        buildNavigation();
        buildProgressBar();
        renderQuestion();
        updateUIHighlight();
    }

    // =========================================
    // LOAD TIMER
    // =========================================
    async function loadTimer() {
        const res = await fetch(`/api/exam/exams/${EXAM_ID}/results/`);
        const list = await res.json();

        const attempt = list.find(x => x.id === ATTEMPT_ID);
        if (!attempt) return;

        examStart = attempt.start_time;
        examDuration = attempt.exam.duration_minutes;

        startTimer();
    }

    // =========================================
    // TIMER
    // =========================================
    function startTimer() {
        function update() {
            const start = new Date(examStart);
            const now = new Date();
            const end = new Date(start.getTime() + examDuration * 60000);
            const diff = end - now;

            if (diff <= 0) {
                clearInterval(timerInterval);
                timerBox.textContent = "00:00:00";
                lockUI();
                autoFinish();
                return;
            }

            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);

            timerBox.textContent =
                `${String(h).padStart(2, "0")}:` +
                `${String(m).padStart(2, "0")}:` +
                `${String(s).padStart(2, "0")}`;
        }

        update();
        timerInterval = setInterval(update, 1000);
    }

    // =========================================
    // LOCK UI WHEN TIMEOUT
    // =========================================
    function lockUI() {
        const inputs = qbox.querySelectorAll("input, textarea, select, button");
        inputs.forEach(i => i.disabled = true);

        document.getElementById("btn-next").disabled = true;
        document.getElementById("btn-prev").disabled = true;
        document.getElementById("btn-finish").disabled = true;

        msg.innerHTML = `
            <div class="alert alert-warning py-2">
                Waktu habis. Mengirim jawaban...
            </div>
        `;
    }

    async function autoFinish() {
        await finalSubmit();
        await finishExam();
        window.location.href = `/exams/${EXAM_ID}/attempt/${ATTEMPT_ID}/result/`;
    }

    // =========================================
    // BUILD NAVIGATION (SIDEBAR)
    // =========================================
    function buildNavigation() {
        navBox.innerHTML = "";

        questions.forEach((q, i) => {
            const btn = document.createElement("button");
            btn.className = "list-group-item list-group-item-action";
            btn.textContent = `Soal ${i + 1}`;
            btn.dataset.index = i;

            btn.onclick = () => {
                saveCurrent();
                index = i;
                renderQuestion();
                updateUIHighlight();
            };

            navBox.appendChild(btn);
        });
    }

    // =========================================
    // BUILD PROGRESS BAR
    // =========================================
    function buildProgressBar() {
        progressBox.innerHTML = `<div class="d-flex flex-wrap gap-2"></div>`;
        const wrap = progressBox.querySelector("div");

        questions.forEach((q, i) => {
            const b = document.createElement("button");
            b.className = "btn btn-sm btn-light border";
            b.style.width = "36px";
            b.textContent = i + 1;
            b.dataset.index = i;

            b.onclick = () => {
                saveCurrent();
                index = i;
                renderQuestion();
                updateUIHighlight();
            };

            wrap.appendChild(b);
        });
    }

    // =========================================
    // UPDATE NAV + PROGRESS STATE
    // =========================================
    function updateUIHighlight() {
        const navItems = navBox.querySelectorAll("button");
        const progItems = progressBox.querySelectorAll("button");

        questions.forEach((q, i) => {
            const answered = answers[q.id] &&
                (
                    (answers[q.id].selected_choices && answers[q.id].selected_choices.length > 0) ||
                    (answers[q.id].text_answer && answers[q.id].text_answer.trim() !== "") ||
                    (answers[q.id].files && answers[q.id].files.length > 0)
                );

            const reqNotAnswered = q.required && !answered;

            // sidebar
            if (i === index) {
                navItems[i].className = "list-group-item list-group-item-action active";
            } else if (answered) {
                navItems[i].className = "list-group-item list-group-item-action list-group-item-success";
            } else if (reqNotAnswered) {
                navItems[i].className = "list-group-item list-group-item-action list-group-item-danger";
            } else {
                navItems[i].className = "list-group-item list-group-item-action";
            }

            // progress bar
            if (i === index) {
                progItems[i].className = "btn btn-sm btn-primary";
            } else if (answered) {
                progItems[i].className = "btn btn-sm btn-success";
            } else if (reqNotAnswered) {
                progItems[i].className = "btn btn-sm btn-danger";
            } else {
                progItems[i].className = "btn btn-sm btn-light border";
            }
        });
    }

    // =========================================
    // RENDER QUESTION
    // =========================================
    function renderQuestion() {
        const q = questions[index];
        let html = `<h5>${index + 1}. ${q.text}</h5>`;

        if (q.question_type === "MCQ") {
            q.choices.forEach(c => {
                html += `
                    <div><input type="radio" name="answer" value="${c.id}"> ${c.text}</div>
                `;
            });
        }

        if (q.question_type === "CHECK") {
            q.choices.forEach(c => {
                html += `
                    <div><input type="checkbox" name="answer" value="${c.id}"> ${c.text}</div>
                `;
            });
        }

        if (q.question_type === "TRUEFALSE") {
            q.choices.forEach(c => {
                html += `<div><input type="radio" name="answer" value="${c.id}"> ${c.text}</div>`;
            });
        }

        if (q.question_type === "DROPDOWN") {
            html += `<select id="dropdown-answer" class="form-select"><option value="">--pilih--</option>`;
            q.choices.forEach(c => {
                html += `<option value="${c.id}">${c.text}</option>`;
            });
            html += `</select>`;
        }

        if (q.question_type === "TEXT") {
            html += `<textarea id="text-answer" class="form-control"></textarea>`;
        }

        if (q.question_type === "FILE") {
            const multiple = q.allow_multiple_files ? "multiple" : "";
            html += `
                <input type="file" id="file-answer" class="form-control" ${multiple}>
                <div class="small mt-2 text-muted">Upload file</div>
            `;
        }

        qbox.innerHTML = html;
        restoreAnswer(q);
        updateUIHighlight();
    }

    // =========================================
    // SAVE ANSWER
    // =========================================
    function saveCurrent() {
        const q = questions[index];
        const id = q.id;

        if (["MCQ", "TRUEFALSE"].includes(q.question_type)) {
            const sel = document.querySelector("input[name='answer']:checked");
            answers[id] = { selected_choices: sel ? [parseInt(sel.value)] : [] };
        }

        if (q.question_type === "CHECK") {
            const sel = [...document.querySelectorAll("input[name='answer']:checked")]
                .map(x => parseInt(x.value));
            answers[id] = { selected_choices: sel };
        }

        if (q.question_type === "DROPDOWN") {
            const val = document.getElementById("dropdown-answer").value;
            answers[id] = { selected_choices: val ? [parseInt(val)] : [] };
        }

        if (q.question_type === "TEXT") {
            const val = document.getElementById("text-answer").value;
            answers[id] = { text_answer: val };
        }

        if (q.question_type === "FILE") {
            const f = document.getElementById("file-answer").files;
            if (f.length > 0) answers[id] = { files: f };
        }
    }

    // =========================================
    // RESTORE ANSWER
    // =========================================
    function restoreAnswer(q) {
        const saved = answers[q.id];
        if (!saved) return;

        if (saved.selected_choices) {
            saved.selected_choices.forEach(cid => {
                const el = document.querySelector(`input[value="${cid}"]`);
                if (el) el.checked = true;
            });
        }

        if (document.getElementById("dropdown-answer")) {
            document.getElementById("dropdown-answer").value =
                saved.selected_choices ? saved.selected_choices[0] : "";
        }

        if (saved.text_answer && document.getElementById("text-answer")) {
            document.getElementById("text-answer").value = saved.text_answer;
        }

        if (q.question_type === "FILE" && saved.files) {
            qbox.innerHTML += `<div class="text-success mt-2">File telah dipilih.</div>`;
        }
    }

    // =========================================
    // CHECK REQUIRED
    // =========================================
    function isRequiredAnswered(q) {
        const saved = answers[q.id];
        if (!q.required) return true;

        if (["MCQ", "TRUEFALSE"].includes(q.question_type)) {
            return saved && saved.selected_choices && saved.selected_choices.length === 1;
        }
        if (q.question_type === "CHECK") {
            return saved && saved.selected_choices && saved.selected_choices.length > 0;
        }
        if (q.question_type === "DROPDOWN") {
            return saved && saved.selected_choices && saved.selected_choices.length === 1;
        }
        if (q.question_type === "TEXT") {
            return saved && saved.text_answer && saved.text_answer.trim() !== "";
        }
        if (q.question_type === "FILE") {
            return saved && saved.files && saved.files.length > 0;
        }

        return true;
    }

    function showRequiredWarning() {
        msg.innerHTML = `
            <div class="alert alert-danger py-2 mt-2">
                Harap isi soal wajib sebelum lanjut.
            </div>
        `;
    }

    // =========================================
    // AUTOSAVE (tanpa file)
    // =========================================
    function autosave() {
        saveCurrent();

        const arr = Object.entries(answers).map(([qid, obj]) => ({
            question: parseInt(qid),
            selected_choices: obj.selected_choices || [],
            text_answer: obj.text_answer || null
        }));

        fetch(`/api/exam/exams/${EXAM_ID}/submit/`, {
            method: "POST",
            headers: { "X-CSRFToken": csrf(), "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
                user_exam: ATTEMPT_ID,
                answers: arr
            })
        }).catch(() => {});
    }

    const autosaveInterval = setInterval(autosave, 5000);

    // =========================================
    // FINAL SUBMIT — includes FILES
    // =========================================
    async function finalSubmit() {
        saveCurrent();

        const fd = new FormData();
        fd.append("user_exam", ATTEMPT_ID);

        const arr = Object.entries(answers).map(([qid, obj]) => ({
            question: parseInt(qid),
            selected_choices: obj.selected_choices || [],
            text_answer: obj.text_answer || null
        }));

        fd.append("answers", JSON.stringify(arr));

        Object.entries(answers).forEach(([qid, obj]) => {
            if (obj.files) {
                for (let f of obj.files) {
                    fd.append(`files_${qid}`, f);
                }
            }
        });

        await fetch(`/api/exam/exams/${EXAM_ID}/submit/`, {
            method: "POST",
            headers: { "X-CSRFToken": csrf() },
            credentials: "same-origin",
            body: fd
        });
    }

    // =========================================
    // FINISH EXAM
    // =========================================
    async function finishExam() {
        await fetch(`/api/exam/exams/${EXAM_ID}/finish/`, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrf(),
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({ user_exam: ATTEMPT_ID })
        });
    }

    // =========================================
    // NAV BUTTONS
    // =========================================
    document.getElementById("btn-next").onclick = () => {
        saveCurrent();
        const q = questions[index];

        if (!isRequiredAnswered(q)) {
            showRequiredWarning();
            return;
        }

        if (index < questions.length - 1) {
            index++;
            renderQuestion();
        }
    };

    document.getElementById("btn-prev").onclick = () => {
        if (index > 0 && !isSubmitting) {
            saveCurrent();
            index--;
            renderQuestion();
        }
    };

    document.getElementById("btn-finish").onclick = async () => {
        if (isSubmitting) return;
        isSubmitting = true;

        saveCurrent();

        for (let q of questions) {
            if (!isRequiredAnswered(q)) {
                showRequiredWarning();
                isSubmitting = false;
                return;
            }
        }

        lockUI();
        clearInterval(autosaveInterval);

        msg.innerText = "Menyimpan jawaban...";
        await finalSubmit();
        await finishExam();

        window.location.href = `/exams/${EXAM_ID}/attempt/${ATTEMPT_ID}/result/`;
    };

    // =========================================
    // INIT
    // =========================================
    loadQuestions();
    loadTimer();
});
