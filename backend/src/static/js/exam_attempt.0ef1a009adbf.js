// =========================================
// GLOBAL STATE
// =========================================
let questions = [];
let index = 0;
let answers = {};     // qid -> { selected_choices:[], text_answer:"", files: FileList }
let timerInterval = null;
let autosaveInterval = null;
let isSubmitting = false;

let examDuration = null;
let examStart = null;

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {

    const qbox = document.getElementById("question-box");
    const msg = document.getElementById("exam-msg");
    const timerBox = document.getElementById("timer");
    const navBox = document.getElementById("q-nav");
    const progressBox = document.getElementById("progress-container");

    // =========================================
    // CSRF helper
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
    // LOCK UI
    // =========================================
    function lockUI() {
        document.querySelectorAll("input, textarea, select, button")
            .forEach(el => el.disabled = true);
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
                `${String(h).padStart(2,"0")}:` +
                `${String(m).padStart(2,"0")}:` +
                `${String(s).padStart(2,"0")}`;
        }

        update();
        timerInterval = setInterval(update, 1000);
    }

    async function autoFinish() {
        await finalSubmit();
        await finishExam();
        window.location.href = `/exams/${EXAM_ID}/attempt/${ATTEMPT_ID}/result/`;
    }

    // =========================================
    // RENDER QUESTION
    // =========================================
    function renderQuestion() {
        const q = questions[index];
        let html = `<h5>${index + 1}. ${q.text}</h5>`;

        // ---- MCQ
        if (q.question_type === "MCQ" || q.question_type === "TRUEFALSE") {
            q.choices.forEach(c => {
                html += `<div>
                    <input type="radio" name="answer" value="${c.id}">
                    ${c.text}
                </div>`;
            });
        }

        // ---- CHECKBOX
        if (q.question_type === "CHECK") {
            q.choices.forEach(c => {
                html += `<div>
                    <input type="checkbox" name="answer" value="${c.id}">
                    ${c.text}
                </div>`;
            });
        }

        // ---- DROPDOWN
        if (q.question_type === "DROPDOWN") {
            html += `<select id="dropdown-answer" class="form-select">
                     <option value="">--pilih--</option>`;
            q.choices.forEach(c => {
                html += `<option value="${c.id}">${c.text}</option>`;
            });
            html += `</select>`;
        }

        // ---- TEXT
        if (q.question_type === "TEXT") {
            html += `<textarea class="form-control" id="text-answer"></textarea>`;
        }

        // ---- FILE
        if (q.question_type === "FILE") {
            const multiple = q.allow_multiple_files ? "multiple" : "";
            html += `
                <input type="file" id="file-answer" class="form-control" ${multiple}>
                <div class="small text-muted mt-2">Unggah file Anda.</div>
            `;
        }

        qbox.innerHTML = html;
        restoreAnswer(q);
        updateUIHighlight();
    }

    // =========================================
    // REQUIRED CHECK
    // =========================================
    function isRequiredAnswered(q) {
        const saved = answers[q.id];
        if (!q.required) return true;
        if (!saved) return false;

        if (["MCQ","TRUEFALSE"].includes(q.question_type))
            return saved.selected_choices?.length === 1;

        if (q.question_type === "CHECK")
            return saved.selected_choices?.length > 0;

        if (q.question_type === "DROPDOWN")
            return saved.selected_choices?.length === 1;

        if (q.question_type === "TEXT")
            return saved.text_answer?.trim().length > 0;

        if (q.question_type === "FILE")
            return saved.files?.length > 0;

        return true;
    }

    // =========================================
    // SAVE ANSWER
    // =========================================
    function saveCurrent() {
        const q = questions[index];
        const id = q.id;

        // MCQ
        if (["MCQ","TRUEFALSE"].includes(q.question_type)) {
            const sel = document.querySelector("input[name='answer']:checked");
            answers[id] = { selected_choices: sel ? [parseInt(sel.value)] : [] };
        }

        // CHECK
        if (q.question_type === "CHECK") {
            const sel = [...document.querySelectorAll("input[name='answer']:checked")]
                .map(x => parseInt(x.value));
            answers[id] = { selected_choices: sel };
        }

        // DROPDOWN
        if (q.question_type === "DROPDOWN") {
            const sel = document.getElementById("dropdown-answer").value;
            answers[id] = { selected_choices: sel ? [parseInt(sel)] : [] };
        }

        // TEXT
        if (q.question_type === "TEXT") {
            answers[id] = {
                text_answer: document.getElementById("text-answer").value
            };
        }

        // FILE
        if (q.question_type === "FILE") {
            const f = document.getElementById("file-answer");
            if (f && f.files.length > 0) {
                answers[id] = { files: f.files };
            }
        }
    }

    // =========================================
    // RESTORE
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

        if (saved.text_answer && document.getElementById("text-answer"))
            document.getElementById("text-answer").value = saved.text_answer;

        if (saved.selected_choices && document.getElementById("dropdown-answer"))
            document.getElementById("dropdown-answer").value = saved.selected_choices[0] || "";

        if (q.question_type === "FILE" && saved.files) {
            qbox.innerHTML += `<div class="text-success mt-2">File telah dipilih.</div>`;
        }
    }

    // =========================================
    // AUTOSAVE (NO FILES)
    // =========================================
    function autosave() {
        saveCurrent();

        let arr = Object.entries(answers).map(([qid, obj]) => ({
            question: parseInt(qid),
            selected_choices: obj.selected_choices || [],
            text_answer: obj.text_answer || null
        }));

        fetch(`/api/exam/exams/${EXAM_ID}/submit/`, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrf(),
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                user_exam: ATTEMPT_ID,
                answers: arr
            })
        }).catch(() => {});
    }

    autosaveInterval = setInterval(autosave, 5000);

    // =========================================
    // FINAL SUBMIT WITH FILES
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
                for (let f of obj.files) fd.append(`files_${qid}`, f);
            }
        });

        await fetch(`/api/exam/exams/${EXAM_ID}/submit/`, {
            method: "POST",
            headers: { "X-CSRFToken": csrf() },
            credentials: "same-origin",
            body: fd
        });
    }

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
    // PROGRESS BAR
    // =========================================
    function buildProgressBar() {
        progressBox.innerHTML = "";
        questions.forEach((q, i) => {
            const dot = document.createElement("button");
            dot.className = "btn btn-outline-secondary btn-sm me-1 mb-1";
            dot.style.width = "32px";
            dot.textContent = i + 1;
            dot.onclick = () => {
                saveCurrent();
                index = i;
                renderQuestion();
                updateUIHighlight();
            };
            progressBox.appendChild(dot);
        });
    }

    // =========================================
    // SIDEBAR NAVIGATION (grid)
    // =========================================
    function buildNavigation() {
        navBox.innerHTML = "";

        questions.forEach((q, i) => {
            const btn = document.createElement("button");
            btn.className = "btn btn-outline-secondary btn-sm";
            btn.style.width = "40px";
            btn.textContent = i + 1;
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
    // UPDATE VISUAL STATUS (sidebar + progress bar)
    // =========================================
    function updateUIHighlight() {

        const navItems = navBox.querySelectorAll("button");
        const progItems = progressBox.querySelectorAll("button");

        questions.forEach((q, i) => {
            const saved = answers[q.id];
            const answered = saved && (
                saved.text_answer?.trim() ||
                saved.selected_choices?.length ||
                saved.files?.length
            );

            const reqNotAnswered = q.required && !answered;

            let cls = "btn btn-outline-secondary btn-sm";
            if (i === index) cls = "btn btn-primary btn-sm";
            else if (reqNotAnswered) cls = "btn btn-danger btn-sm";
            else if (answered) cls = "btn btn-success btn-sm";

            if (navItems[i]) {
                navItems[i].className = cls;
                navItems[i].style.width = "40px";
            }
            if (progItems[i]) {
                progItems[i].className = cls;
                progItems[i].style.width = "32px";
            }
        });
    }

    // =========================================
    // BUTTONS
    // =========================================

    document.getElementById("btn-next").onclick = () => {
        saveCurrent();
        const q = questions[index];

        if (!isRequiredAnswered(q)) {
            msg.innerHTML = `<div class="alert alert-warning">Soal wajib belum dijawab.</div>`;
            return;
        }

        if (index < questions.length - 1) {
            index++;
            renderQuestion();
        }
    };

    document.getElementById("btn-prev").onclick = () => {
        saveCurrent();
        if (index > 0) {
            index--;
            renderQuestion();
        }
    };

    document.getElementById("btn-finish").onclick = async () => {

        if (isSubmitting) return;
        isSubmitting = true;

        saveCurrent();

        // check all required
        for (let q of questions) {
            if (!isRequiredAnswered(q)) {
                msg.innerHTML = `<div class="alert alert-warning">Masih ada soal wajib.</div>`;
                isSubmitting = false;
                return;
            }
        }

        lockUI();
        clearInterval(autosaveInterval);

        msg.innerText = "Menyimpan jawaban...";

        await finalSubmit();
        await finishExam();

        window.location.href =
            `/exams/${EXAM_ID}/attempt/${ATTEMPT_ID}/result/`;
    };

    // =========================================
    // INIT
    // =========================================
    loadQuestions();
    loadTimer();
});
