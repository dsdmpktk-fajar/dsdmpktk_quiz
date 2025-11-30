document.addEventListener("DOMContentLoaded", async () => {
    const box = document.getElementById("result-box");

    const res = await fetch(`/api/exam/exams/${EXAM_ID}/my-result/`);
    const data = await res.json();

    if (!res.ok) {
        box.innerHTML = `<div class="text-danger">${data.detail || "Gagal mengambil hasil."}</div>`;
        return;
    }

    box.innerHTML = `
        <div class="card p-4">
            <h4>Score: ${data.score.toFixed(2)}</h4>
            <div><strong>Raw Score:</strong> ${data.raw_score}</div>
        </div>
    `;
});
