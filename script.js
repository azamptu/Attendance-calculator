
const subjectForm = document.getElementById("subjectForm");
const subjectList = document.getElementById("subjectList");
const targetInput = document.getElementById("overallTarget");

let subjects = JSON.parse(localStorage.getItem("attendanceSubjects")) || [];
let target = Number(localStorage.getItem("attendanceTarget")) || 75;
let editingId = null;

targetInput.value = target;

// Save data
function saveData() {
    localStorage.setItem("attendanceSubjects", JSON.stringify(subjects));
    localStorage.setItem("attendanceTarget", target);
}

// Calculate percentage
function calculatePercentage(present, total) {
    if (total === 0) return 0;
    return (present / total) * 100;
}

// Required classes
function requiredClasses(present, total, goal) {
    if (total === 0 || calculatePercentage(present, total) >= goal) {
        return 0;
    }

    return Math.ceil(
        (goal * total - 100 * present) / (100 - goal)
    );
}

// Allowed bunk
function allowedBunks(present, total, goal) {
    if (total === 0 || calculatePercentage(present, total) < goal) {
        return 0;
    }

    return Math.max(0, Math.floor((100 * present / goal) - total));
}

// Add or update subject
subjectForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("subjectName").value.trim();
    const total = Number(document.getElementById("totalClasses").value);
    const present = Number(document.getElementById("presentClasses").value);
    const subjectTarget = Number(document.getElementById("subjectTarget").value);

    if (
        !name ||
        !Number.isInteger(total) ||
        !Number.isInteger(present) ||
        total <= 0 ||
        present < 0 ||
        present > total ||
        !Number.isFinite(subjectTarget) ||
        subjectTarget <= 0 ||
        subjectTarget >= 100
    ) {
        alert("Please enter valid subject details and target.");
        return;
    }

    if (editingId !== null) {
        const subject = subjects.find(s => s.id === editingId);

        if (subject) {
            subject.name = name;
            subject.total = total;
            subject.present = present;
            subject.target = subjectTarget;
        }

        editingId = null;
        document.getElementById("submitBtn").textContent = "Add Subject";
        document.getElementById("cancelEdit").classList.add("hidden");

    } else {
        subjects.push({
            id: Date.now(),
            name,
            total,
            present,
            target: subjectTarget
        });
    }

    saveData();
    renderSubjects();
    subjectForm.reset();
});

// Overall target setting
targetInput.addEventListener("change", function() {
    const value = Number(this.value);

    if (!Number.isFinite(value) || value <= 0 || value >= 100) {
        alert("Overall target must be between 1 and 99.");
        this.value = target;
        return;
    }

    target = value;
    saveData();
    renderSubjects();
});

// Safe subject name display
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function(char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char];
    });
}

// Display subjects and overall attendance
function renderSubjects() {
    subjectList.innerHTML = "";

    document.getElementById("totalSubjects").textContent = subjects.length;
    document.getElementById("targetDisplay").textContent = target + "%";

    let totalClasses = 0;
    let totalPresent = 0;

    subjects.forEach(subject => {
        totalClasses += subject.total;
        totalPresent += subject.present;

        // Old saved subjects get default 75% target
        const subjectTarget = Number(subject.target) || 75;

        const percentage = calculatePercentage(subject.present, subject.total);
        const eligible = percentage >= subjectTarget;

        const required = requiredClasses(
            subject.present, subject.total, subjectTarget
        );

        const bunks = allowedBunks(
            subject.present, subject.total, subjectTarget
        );

        const color = eligible ? "green" :
            percentage >= subjectTarget - 10 ? "orange" : "red";

        const card = document.createElement("div");
        card.className = "subject-card";

        card.innerHTML = `
            <div class="subject-top">
                <h3>${escapeHTML(subject.name)}</h3>
                <span class="percentage">${percentage.toFixed(2)}%</span>
            </div>

            <p>Subject Target: ${subjectTarget}%</p>

            <div class="progress">
                <div class="progress-bar ${color}"
                     style="width: ${Math.min(percentage, 100)}%">
                </div>
            </div>

            <div class="details">
                <span>Total: ${subject.total}</span>
                <span>Present: ${subject.present}</span>
                <span>Absent: ${subject.total - subject.present}</span>
            </div>

            <p class="status ${eligible ? "good" : "bad"}">
                ${eligible ? "✓ Target achieved" : "⚠ Target not achieved"}
            </p>

            <p>
                ${eligible
                    ? "Allowed future bunks: " + bunks
                    : "Attend next " + required + " classes continuously to reach target."
                }
            </p>

            <button data-action="edit" data-id="${subject.id}">Edit</button>
            <button data-action="delete" data-id="${subject.id}" class="secondary">Delete</button>
        `;

        subjectList.appendChild(card);
    });

    // FINAL OVERALL ATTENDANCE
    const overall = calculatePercentage(totalPresent, totalClasses);
    const overallEligible = totalClasses > 0 && overall >= target;

    const overallRequired = requiredClasses(
        totalPresent, totalClasses, target
    );

    const overallBunks = allowedBunks(
        totalPresent, totalClasses, target
    );

    document.getElementById("overallAttendance").textContent =
        overall.toFixed(2) + "%";

    document.getElementById("overallDetails").textContent =
        `Present: ${totalPresent} | Absent: ${totalClasses - totalPresent} | Total: ${totalClasses}`;

    const statusElement = document.getElementById("overallStatus");
    const adviceElement = document.getElementById("overallAdvice");

    if (totalClasses === 0) {
        statusElement.textContent = "No attendance data";
        statusElement.className = "status";
        adviceElement.textContent = "";
    } else if (overallEligible) {
        statusElement.textContent = "✓ Overall target achieved";
        statusElement.className = "status good";
        adviceElement.textContent =
            "Allowed future bunks: " + overallBunks;
    } else {
        statusElement.textContent = "⚠ Overall target not achieved";
        statusElement.className = "status bad";
        adviceElement.textContent =
            "Attend next " + overallRequired +
            " classes continuously to reach overall target.";
    }

    if (subjects.length === 0) {
        subjectList.innerHTML =
            '<p class="empty">No subjects added yet.</p>';
    }
}

// Edit and Delete
subjectList.addEventListener("click", function(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const subject = subjects.find(s => s.id === id);

    if (!subject) return;

    if (button.dataset.action === "delete") {
        if (confirm("Are you sure you want to delete this subject?")) {
            subjects = subjects.filter(s => s.id !== id);

            if (editingId === id) {
                editingId = null;
                subjectForm.reset();
                document.getElementById("submitBtn").textContent = "Add Subject";
                document.getElementById("cancelEdit").classList.add("hidden");
            }

            saveData();
            renderSubjects();
        }
    }

    if (button.dataset.action === "edit") {
        editingId = id;

        document.getElementById("subjectName").value = subject.name;
        document.getElementById("totalClasses").value = subject.total;
        document.getElementById("presentClasses").value = subject.present;
        document.getElementById("subjectTarget").value = subject.target || 75;

        document.getElementById("submitBtn").textContent = "Update Subject";
        document.getElementById("cancelEdit").classList.remove("hidden");

        subjectForm.scrollIntoView({ behavior: "smooth" });
    }
});

// Cancel edit
document.getElementById("cancelEdit").addEventListener("click", function() {
    editingId = null;
    subjectForm.reset();

    document.getElementById("submitBtn").textContent = "Add Subject";
    this.classList.add("hidden");
});

// Initial display
renderSubjects();
