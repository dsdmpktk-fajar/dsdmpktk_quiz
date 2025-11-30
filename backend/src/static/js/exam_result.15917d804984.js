document.addEventListener("DOMContentLoaded", async () => {
    const box = document.getElementById("result-box");

    async function loadResult() {
        try {
            const res = await fetch(`/api/exam/exams/${EXAM_ID}/my-result/`);
            const data = await res.json();

            if (!res.ok) {
                box.innerHTML = `<div class="alert alert-danger">${data.detail || "Gagal mengambil hasil."}</div>`;
                return;
            }

            const passed = 
                data.passing_grade !== null &&
                data.score >= data.passing_grade;

            box.innerHTML = `
                <div class="card p-4 shadow-sm">
                    <h4 class="mb-3">${data.exam_title || "Ujian"}</h4>

                    <div class="mb-2"><strong>Score:</strong> ${data.score.toFixed(2)}</div>
                    <div class="mb-2"><strong>Raw Score:</strong> ${data.raw_score}</div>
                    
                    ${
                        data.passing_grade !== null
                            ? `<div class="mb-2"><strong>Passing Grade:</strong> ${data.passing_grade}</div>
                               <div class="mb-3">
                                   <span class="badge ${passed ? "bg-success" : "bg-danger"}">
                                       ${passed ? "LULUS" : "TIDAK LULUS"}
                                   </span>
                               </div>`
                            : ""
                    }

                    <div class="text-muted small mt-3">
                        <div><strong>Mulai:</strong> ${data.start_time || "-"}</div>
                        <div><strong>Selesai:</strong> ${data.end_time || "-"}</div>
                        <div><strong>Status:</strong> ${data.status}</div>
                        <div><strong>Attempt:</strong> ${data.attempt_number}</div>
                    </div>
                </div>
            `;

        } catch (err) {
            console.error(err);
            box.innerHTML = `<div class="alert alert-danger">Gagal memuat hasil.</div>`;
        }
    }

    loadResult();
});
