document.addEventListener("DOMContentLoaded", () => {

    const msg = document.getElementById("start-msg");

    function csrf() {
        const m = document.cookie.match(/csrftoken=([^;]+)/);
        return m ? m[1] : "";
    }

    async function loadExam() {
        const res = await fetch(`/api/exam/exams/${EXAM_ID}/`);
        const data = await res.json();

        document.getElementById("exam-title").innerText = data.title;
        document.getElementById("exam-desc").innerText = data.description || "-";
        document.getElementById("exam-duration").innerText = data.duration_minutes || "-";
        document.getElementById("exam-passing").innerText = data.passing_grade || "-";
        document.getElementById("exam-attempt").innerText = data.user_attempt || "0";
    }

    document.getElementById("btn-start-exam").onclick = async () => {
        msg.innerHTML = "";

        const res = await fetch(`/api/exam/exams/${EXAM_ID}/start/`, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrf(),
                "Content-Type": "application/json"
            },
            credentials: "same-origin"
        });

        const data = await res.json();

        if (!res.ok) {
            msg.innerText = data.detail || "Tidak bisa memulai ujian.";
            return;
        }

        // Redirect ke halaman attempt
        window.location.href = `/exams/${EXAM_ID}/attempt/${data.user_exam_id}/`;
    };

    loadExam();
});
