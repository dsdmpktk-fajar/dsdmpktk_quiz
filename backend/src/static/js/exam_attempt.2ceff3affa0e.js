let questions = [];
let index = 0;
let answers = {};

document.addEventListener("DOMContentLoaded", () => {
    loadQuestions();
});

// =============================
// LOAD QUESTIONS
// =============================
async function loadQuestions() {
    const res = await fetch(`/api/exam/exams/${EXAM_ID}/questions/?user_exam=${ATTEMPT_ID}`);
    questions = await res.json();

    buildNavigation();
    renderQuestion();
}

// =============================
// NAV BUTTONS (versi lama)
// =============================
function buildNavigation() {
    const nav = document.getElementById("question-nav");
    nav.innerHTML = "";

    questions.forEach((q, i) => {
        const btn = document.createElement("button");
        btn.innerText = i + 1;
        btn.className = "btn btn-sm";

        btn.onclick = () => {
            saveCurrent();
            index = i;
            renderQuestion();
            highlightNav();
        };

        nav.appendChild(btn);
    });

    highlightNav();
}

function highlightNav() {
    const navButtons = document.querySelectorAll("#question-nav button");
    navButtons.forEach((b, i) => {
        b.classList.remove("btn-primary", "btn-danger");

        if (i === index) b.classList.add("btn-primary");
        else b.classList.add("btn-danger");
    });
}

// =============================
// RENDER QUESTION
// =============================
function renderQuestion() {
    const q = questions[index];
    let html = `<h5>${q.text}</h5>`;

    // MCQ
    if (q.question_type === "MCQ") {
        q.choices.forEach(c => {
            html += `<div><label><input type="radio" name="answer" value="${c.id}"> ${c.text}</label></div>`;
        });
    }

    // CHECK
    if (q.question_type === "CHECK") {
        q.choices.forEach(c => {
            html += `<div><label><input type="checkbox" name="answer" value="${c.id}"> ${c.text}</label></div>`;
        });
    }

    // TEXT
    if (q.question_type === "TEXT") {
        html += `<textarea id="text-answer" class="form-control"></textarea>`;
    }

    document.getElementById("question-box").innerHTML = html;

    restoreAnswer(q);
    highlightNav();
}

// =============================
// SAVE & RESTORE ANSWERS
// =============================
function saveCurrent() {
    const q = questions[index];
    const id = q.id;

    // MCQ
    if (["MCQ", "TRUEFALSE"].includes(q.question_type)) {
        const sel = document.querySelector("input[name='answer']:checked");
        answers[id] = { selected_choices: sel ? [parseInt(sel.value)] : [] };
    }

    // CHECK
    if (q.question_type === "CHECK") {
        const sel = [...document.querySelectorAll("input[name='answer']:checked")]
            .map(x => parseInt(x.value));
        answers[id] = { selected_choices: sel };
    }

    // TEXT
    if (q.question_type === "TEXT") {
        const val = document.getElementById("text-answer")?.value || "";
        answers[id] = { text_answer: val };
    }
}

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
}

// =============================
// NAVIGATION BUTTONS
// =============================
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
    saveCurrent();
    await finishExam();
    window.location.href = `/exams/${EXAM_ID}/attempt/${ATTEMPT_ID}/result/`;
};

// =============================
// FINISH
// =============================
async function finishExam() {
    await fetch(`/api/exam/exams/${EXAM_ID}/finish/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_exam: ATTEMPT_ID })
    });
}
