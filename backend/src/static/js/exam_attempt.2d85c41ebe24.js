// =========================================
// GLOBAL STATE
// =========================================
let questions = [];
let index = 0;
let answers = {};          
let timerInterval = null;
let isSubmitting = false;

let examDuration = null;
let examStart = null;

document.addEventListener("DOMContentLoaded", () => {

    const qbox = document.getElementById("question-box");
    const msg = document.getElementById("exam-msg");
    const timerBox = document.getElementById("timer");
    const nav = document.getElementById("question-nav");

    // =========================================
    // CSRF
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

        renderQuestion();
        renderNav();
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
    // COUNTDOWN
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

            const h = Math.floor(diff / 1000 / 3600);
            const m = Math.floor((diff / 1000 % 3600) / 60);
            const s = Math.floor(diff / 1000 % 60);

            timerBox.textContent =
                `${String(h).padStart(2,"0")}:`+
                `${String(m).padStart(2,"0")}:`+
                `${String(s).padStart(2,"0")}`;
        }

        update();
        timerInterval = setInterval(update, 1000);
    }

    // =========================================
    // DISABLE UI WHEN TIMEOUT
    // =========================================
    function lockUI() {
        const inputs = qbox.querySelectorAll("input, textarea, select, button");
        inputs.forEach(inp => inp.disabled = true);

        msg.innerHTML = `
            <div class="alert alert-warning py-2 mt-3">
                Waktu ujian telah habis. Menyelesaikan ujian...
            </div>
        `;
    }

    // =========================================
    // AUTO FINISH WHEN TIMEOUT
    // =========================================
    async function autoFinish() {
        lockUI();
        await finalSubmit();
        await finishExam();
        window.location.href = `/exams/${EXAM_ID}/attempt/${ATTEMPT_ID}/result/`;
    }

    // =========================================
    // RENDER QUESTION
    // =========================================
    function renderQuestion() {
        const q = questions[index];

        let html = `<div class="question-text mb-3">${q.text}</div>`;

        // ----- MCQ -----
        if (q.question_type === "MCQ") {
            q.choices.forEach(c => {
                html += `
                    <div class="mb-1">
                        <label>
                            <input type="radio" name="answer" value="${c.id}">
                            ${c.text}
                        </label>
                    </div>`;
            });
        }

        // ----- Checkboxes -----
        if (q.question_type === "CHECK") {
            q.choices.forEach(c => {
                html += `
                    <div class="mb-1">
                        <label>
                            <input type="checkbox" name="answer" value="${c.id}">
                            ${c.text}
                        </label>
                    </div>`;
            });
        }

        // ----- True/False -----
        if (q.question_type === "TRUEFALSE") {
            q.choices.forEach(c => {
                html += `
                    <div class="mb-1">
                        <label>
                            <input type="radio" name="answer" value="${c.id}"> ${c.text}
                        </label>
                    </div>`;
            });
        }

        // ----- Dropdown -----
        if (q.question_type === "DROPDOWN") {
            html += `<select id="dropdown-answer" class="form-select">
                        <option value="">--pilih--</option>`;
            q.choices.forEach(c => {
                html += `<option value="${c.id}">${c.text}</option>`;
            });
            html += `</select>`;
        }

        // ----- Text -----
        if (q.question_type === "TEXT") {
            html += `<textarea id="text-answer" class="form-control" rows="4"></textarea>`;
        }

        // ----- File -----
        if (q.question_type === "FILE") {
            html += `
                <input type="file" id="file-answer" class="form-control" 
                       ${q.allow_multiple_files ? "multiple" : ""}>
                <div class="small text-muted mt-2">Unggah file Anda.</div>
            `;
        }

        qbox.innerHTML = html;
        restoreAnswer(q);
        highlightNav();
    }

    // =========================================
    // RENDER RIGHT-SIDE NAVIGATION
    // =========================================
    function renderNav() {
        nav.innerHTML = "";

        questions.forEach((q, i) => {
            const btn = document.createElement("button");
            btn.className = "qnav-item";
            btn.textContent = i + 1;

            btn.onclick = () => {
                saveCurrent();
                index = i;
                renderQuestion();
            };

            nav.appendChild(btn);
        });
    }

    function highlightNav() {
        const items = nav.querySelectorAll(".qnav-item");
        items.forEach((b, i) => {
            b.classList.toggle("active", i === index);
        });
    }

    // =========================================
    // SAVE ANSWER
    // =========================================
    function saveCurrent() {
        const q = questions[index];
        const id = q.id;

        // MCQ / TRUEFALSE
        if (["MCQ","TRUEFALSE"].includes(q.question_type)) {
            const sel = document.querySelector("input[name='answer']:checked");
            answers[id] = { selected_choices: sel ? [parseInt(sel.value)] : [] };
        }

        // CHECKBOX
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
            const txt = document.getElementById("text-answer").value;
            answers[id] = { text_answer: txt };
        }

        // FILE
        if (q.question_type === "FILE") {
            const fileInput = document.getElementById("file-answer");
            if (fileInput && fileInput.files.length > 0) {
                answers[id] = { files: fileInput.files };
            }
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

        if (saved.text_answer && document.getElementById("text-answer")) {
            document.getElementById("text-answer").value = saved.text_answer;
        }

        if (saved.selected_choices && document.getElementById("dropdown-answer")) {
            document.getElementById("dropdown-answer").value = saved.selected_choices[0] || "";
        }
    }

    // =========================================
    // AUTOSAVE (NO FILE)
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

    const autosaveInterval = setInterval(autosave, 4000);

    // =========================================
    // FINAL SUBMIT (WITH FILES)
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
    // BUTTON NEXT/PREV/FINISH
    // =========================================
    document.getElementById("btn-next").onclick = () => {
        saveCurrent();
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
