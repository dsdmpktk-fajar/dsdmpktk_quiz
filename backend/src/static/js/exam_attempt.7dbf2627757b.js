// =========================================
// GLOBAL STATE
// =========================================
let questions = [];
let index = 0;
let answers = {};          // qid -> { selected_choices: [], text_answer: "", files: FileList }
let timerInterval = null;

let examDuration = null;
let examStart = null;

document.addEventListener("DOMContentLoaded", () => {

    const qbox = document.getElementById("question-box");
    const msg = document.getElementById("exam-msg");
    const timerBox = document.getElementById("timer");

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
    }

    // =========================================
    // LOAD TIMER DATA
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
    // COUNTDOWN TIMER
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
    // AUTO FINISH WHEN TIME EXPIRED
    // =========================================
    async function autoFinish() {
        await finalSubmit();   // Submit jawaban + file
        await finishExam();
        window.location.href = `/exams/${EXAM_ID}/attempt/${ATTEMPT_ID}/result/`;
    }

    // =========================================
    // RENDER QUESTION
    // =========================================
    function renderQuestion() {
        const q = questions[index];
        let html = `<h5>${index + 1}. ${q.text}</h5>`;

        // ---------- MCQ ----------
        if (q.question_type === "MCQ") {
            q.choices.forEach(c => {
                html += `
                    <div><input type="radio" name="answer" value="${c.id}"> ${c.text}</div>
                `;
            });
        }

        // ---------- CHECKBOX ----------
        if (q.question_type === "CHECK") {
            q.choices.forEach(c => {
                html += `
                    <div><input type="checkbox" name="answer" value="${c.id}"> ${c.text}</div>
                `;
            });
        }

        // ---------- TRUEFALSE ----------
        if (q.question_type === "TRUEFALSE") {
            q.choices.forEach(c => {
                html += `<div><input type="radio" name="answer" value="${c.id}"> ${c.text}</div>`;
            });
        }

        // ---------- DROPDOWN ----------
        if (q.question_type === "DROPDOWN") {
            html += `<select id="dropdown-answer" class="form-select"><option value="">--pilih--</option>`;
            q.choices.forEach(c => {
                html += `<option value="${c.id}">${c.text}</option>`;
            });
            html += `</select>`;
        }

        // ---------- TEXT ----------
        if (q.question_type === "TEXT") {
            html += `<textarea class="form-control" id="text-answer"></textarea>`;
        }

        // ---------- FILE UPLOAD (MULTIPLE) ----------
        if (q.question_type === "FILE") {
            const multiple = q.allow_multiple_files ? "multiple" : "";
            html += `
                <input type="file" id="file-answer" class="form-control" ${multiple}>
                <div class="small text-muted mt-2">Unggah file Anda.</div>
            `;
        }

        qbox.innerHTML = html;
        restoreAnswer(q);
    }

    // =========================================
    // SAVE CURRENT ANSWER
    // =========================================
    function saveCurrent() {
        const q = questions[index];
        const id = q.id;

        // MCQ / TRUEFALSE
        if (["MCQ", "TRUEFALSE"].includes(q.question_type)) {
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
    // RESTORE SAVED ANSWER
    // =========================================
    function restoreAnswer(q) {
        const saved = answers[q.id];
        if (!saved) return;

        // restore selected choices
        if (saved.selected_choices) {
            saved.selected_choices.forEach(cid => {
                const el = document.querySelector(`input[value="${cid}"]`);
                if (el) el.checked = true;
            });
        }

        // restore dropdown
        if (saved.selected_choices && document.getElementById("dropdown-answer")) {
            document.getElementById("dropdown-answer").value = saved.selected_choices[0] || "";
        }

        // restore text
        if (saved.text_answer && document.getElementById("text-answer")) {
            document.getElementById("text-answer").value = saved.text_answer;
        }

        // restore file placeholder
        if (q.question_type === "FILE" && saved.files) {
            qbox.innerHTML += `<div class="text-success mt-2">File telah dipilih.</div>`;
        }
    }

    // =========================================
    // AUTOSAVE (NO FILE)
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

    setInterval(autosave, 5000);

    // =========================================
    // FINAL SUBMIT (FILES INCLUDED)
    // =========================================
    async function finalSubmit() {
        saveCurrent();

        const fd = new FormData();
        fd.append("user_exam", ATTEMPT_ID);

        // answers (tanpa file)
        const answersArray = Object.entries(answers).map(([qid, obj]) => ({
            question: parseInt(qid),
            selected_choices: obj.selected_choices || [],
            text_answer: obj.text_answer || null
        }));

        fd.append("answers", JSON.stringify(answersArray));

        // FILES
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
    // BUTTONS
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
