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
    const navBox = document.getElementById("navigation");


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
        buildNavigation();
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
    // LOCK UI WHEN DONE
    // =========================================
    function lockUI() {
        const inputs = qbox.querySelectorAll("input, textarea, select, button");
        inputs.forEach(inp => inp.disabled = true);

        document.getElementById("btn-next").disabled = true;
        document.getElementById("btn-prev").disabled = true;
        document.getElementById("btn-finish").disabled = true;

        msg.innerHTML = `
            <div class="alert alert-warning py-2 mt-3">
                Waktu ujian telah berakhir. Menyelesaikan ujian...
            </div>
        `;
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

            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);

            timerBox.textContent =
                `${String(h).padStart(2, "0")}:`+
                `${String(m).padStart(2, "0")}:`+
                `${String(s).padStart(2, "0")}`;
        }

        update();
        timerInterval = setInterval(update, 1000);
    }


    // =========================================
    // AUTO FINISH
    // =========================================
    async function autoFinish() {
        lockUI();
        await finalSubmit();
        await finishExam();
        window.location.href =
            `/exams/${EXAM_ID}/attempt/${ATTEMPT_ID}/result/`;
    }


    // =========================================
    // RENDER QUESTION
    // =========================================
    function renderQuestion() {
        const q = questions[index];
        let html = `<h5 class="mb-3">${q.text}</h5>`;

        // === MCQ ===
        if (q.question_type === "MCQ") {
            q.choices.forEach(c => {
                html += `
                    <div class="mb-2">
                        <label class="d-flex align-items-center gap-2">
                            <input type="radio" name="answer" value="${c.id}">
                            ${c.text}
                        </label>
                    </div>
                `;
            });
        }

        // === CHECKBOX ===
        if (q.question_type === "CHECK") {
            q.choices.forEach(c => {
                html += `
                    <div class="mb-2">
                        <label class="d-flex align-items-center gap-2">
                            <input type="checkbox" name="answer" value="${c.id}">
                            ${c.text}
                        </label>
                    </div>
                `;
            });
        }

        // === TRUEFALSE ===
        if (q.question_type === "TRUEFALSE") {
            q.choices.forEach(c => {
                html += `
                    <div class="mb-2">
                        <label class="d-flex align-items-center gap-2">
                            <input type="radio" name="answer" value="${c.id}">
                            ${c.text}
                        </label>
                    </div>
                `;
            });
        }

        // === DROPDOWN ===
        if (q.question_type === "DROPDOWN") {
            html += `<select id="dropdown-answer" class="form-select mb-3"><option value="">--pilih--</option>`;
            q.choices.forEach(c => {
                html += `<option value="${c.id}">${c.text}</option>`;
            });
            html += `</select>`;
        }

        // === TEXT ===
        if (q.question_type === "TEXT") {
            html += `<textarea id="text-answer" class="form-control mb-3" rows="4"></textarea>`;
        }

        // === FILE UPLOAD ===
        if (q.question_type === "FILE") {
            const multiple = q.allow_multiple_files ? "multiple" : "";
            html += `
                <input type="file" id="file-answer" class="form-control mb-2" ${multiple}>
                <div class="small text-muted">Unggah file sesuai instruksi.</div>
            `;
        }

        qbox.innerHTML = html;
        restoreAnswer(q);
        buildNavigation();  // refresh UI nav
        updateProgressBar();
    }


    // =========================================
    // NAVIGATION BUTTONS (NEW)
    // =========================================
    function buildNavigation() {
        navBox.innerHTML = "";

        questions.forEach((q, i) => {
            const btn = document.createElement("button");
            btn.textContent = i + 1;

            const saved = answers[q.id];

            if (i === index) {
                btn.className = "nav-item-current";
            } else if (saved && (saved.selected_choices?.length || saved.text_answer || saved.files)) {
                btn.className = "nav-item-answered";
            } else {
                btn.className = "nav-item-default";
            }

            btn.onclick = () => {
                saveCurrent();
                index = i;
                renderQuestion();
            };

            navBox.appendChild(btn);
        });
    }


    // =========================================
    // PROGRESS BAR
    // =========================================
    function updateProgressBar() {
        const bar = document.getElementById("progress-inner");
        if (!bar) return;

        const progress = ((index + 1) / questions.length) * 100;
        bar.style.width = progress + "%";
    }


    // =========================================
    // CHECK REQUIRED
    // =========================================
    function isRequiredAnswered(q) {
        const saved = answers[q.id];

        if (!q.required) return true;

        if (["MCQ","TRUEFALSE"].includes(q.question_type))
            return saved?.selected_choices?.length === 1;

        if (q.question_type === "CHECK")
            return saved?.selected_choices?.length > 0;

        if (q.question_type === "DROPDOWN")
            return saved?.selected_choices?.length === 1;

        if (q.question_type === "TEXT")
            return saved?.text_answer?.trim() !== "";

        if (q.question_type === "FILE")
            return saved?.files?.length > 0;

        return true;
    }


    // =========================================
    // SAVE CURRENT ANSWER
    // =========================================
    function saveCurrent() {
        const q = questions[index];
        const id = q.id;

        if (["MCQ","TRUEFALSE"].includes(q.question_type)) {
            const sel = document.querySelector("input[name='answer']:checked");
            answers[id] = { selected_choices: sel ? [parseInt(sel.value)] : [] };
        }

        if (q.question_type === "CHECK") {
            const sel = [...document.querySelectorAll("input[name='answer']:checked")]
                .map(x => parseInt(x.value));
            answers[id] = { selected_choices: sel };
        }

        if (q.question_type === "DROPDOWN") {
            const sel = document.getElementById("dropdown-answer").value;
            answers[id] = { selected_choices: sel ? [parseInt(sel)] : [] };
        }

        if (q.question_type === "TEXT") {
            const txt = document.getElementById("text-answer").value;
            answers[id] = { text_answer: txt };
        }

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
    // AUTOSAVE
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

    const autosaveInterval = setInterval(autosave, 5000);


    // =========================================
    // FINAL SUBMIT
    // =========================================
    async function finalSubmit() {
        saveCurrent();

        const fd = new FormData();
        fd.append("user_exam", ATTEMPT_ID);

        const answersArray = Object.entries(answers).map(([qid, obj]) => ({
            question: parseInt(qid),
            selected_choices: obj.selected_choices || [],
            text_answer: obj.text_answer || null
        }));

        fd.append("answers", JSON.stringify(answersArray));

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
    // BUTTON EVENTS
    // =========================================
    document.getElementById("btn-next").onclick = () => {
        saveCurrent();
        const q = questions[index];

        if (!isRequiredAnswered(q)) {
            msg.textContent = "Soal ini wajib dijawab.";
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

        lockUI();
        clearInterval(autosaveInterval);

        saveCurrent();

        for (let q of questions) {
            if (!isRequiredAnswered(q)) {
                msg.textContent = "Masih ada soal wajib yang belum dijawab.";
                isSubmitting = false;
                return;
            }
        }

        msg.textContent = "Menyimpan jawaban...";
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
