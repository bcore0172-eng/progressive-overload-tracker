// Grab DOM elements
const form = document.getElementById('exercise-form');
const workoutList = document.getElementById('workout-history');
const filter = document.getElementById('exercise-filter');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');
const ctx = document.getElementById('progress-chart').getContext('2d');

let chart; // Chart.js instance
let workouts = JSON.parse(localStorage.getItem('workouts')) || []; // load saved workouts
let editIndex = null; // keeps track of which workout is being edited

// ----------------------
// Chart Rendering
// ----------------------
function updateChart() {
    // Extract labels (dates) and data (weights) from workouts
    const labels = workouts.map(w => w.date);
    const data = workouts.map(w => w.weight);
    const pointColors = workouts.map(w => w.isPR ? '#076028ff' : '#5fc2f8ff'); // PR points in green

    // Destroy previous chart instance if exists to avoid overlaying
    if (chart) chart.destroy();

    // Create new chart
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Weight (lbs)',
                data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.2)',
                tension: 0.3, // smooth line
                pointRadius: 6,
                pointBackgroundColor: pointColors
            }]
        },
        options: {
            responsive: true, // allows chart to resize
            maintainAspectRatio: false, // lets CSS aspect-ratio control height
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const w = workouts[context.dataIndex];
                            return w.isPR ? `${w.weight} lbs 🚀 PR` : `${w.weight} lbs`;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: false } // start Y axis at minimum weight
            }
        }
    });
}

// ----------------------
// Update Exercise Filter Dropdown
// ----------------------
function updateFilter() {
    const exercises = [...new Set(workouts.map(w => w.exercise))]; // unique exercises
    filter.innerHTML = '<option value="">All</option>'; // reset options
    exercises.forEach(ex => {
        const option = document.createElement('option');
        option.value = ex;
        option.textContent = ex;
        filter.appendChild(option);
    });
}

// ----------------------
// Display Workouts in List
// ----------------------
function displayWorkouts() {
    workoutList.innerHTML = ''; // clear previous list
    const selected = filter.value;

    workouts.forEach((workout, index) => {
        // Skip if filtering and exercise doesn't match
        if (selected && workout.exercise !== selected) return;

        const li = document.createElement('li');
        li.textContent = `${workout.exercise}: ${workout.sets} x ${workout.reps} @ ${workout.weight} lbs`;

        // Add PR badge if applicable
        if (workout.isPR) {
            const badge = document.createElement('span');
            badge.textContent = ' 🚀 New PR!';
            badge.classList.add('pr-badge');
            li.appendChild(badge);
        }

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => {
            document.getElementById('exercise').value = workout.exercise;
            document.getElementById('sets').value = workout.sets;
            document.getElementById('reps').value = workout.reps;
            document.getElementById('weight').value = workout.weight;
            editIndex = index;
        };

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => {
            workouts.splice(index, 1); // remove from array
            localStorage.setItem('workouts', JSON.stringify(workouts)); // save
            updateFilter();
            displayWorkouts();
            updateChart();
        };

        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
        workoutList.appendChild(li);
    });
}

// ----------------------
// Handle Form Submission
// ----------------------
form.addEventListener('submit', (e) => {
    e.preventDefault(); // prevent page reload

    const exercise = document.getElementById('exercise').value;
    const sets = parseInt(document.getElementById('sets').value);
    const reps = parseInt(document.getElementById('reps').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const date = new Date().toISOString().split('T')[0];

    // Determine if this is a PR
    const maxWeight = workouts
        .filter(w => w.exercise === exercise)
        .reduce((max, w) => Math.max(max, w.weight), 0);

    const isPR = weight > maxWeight;
    const workout = { date, exercise, sets, reps, weight, isPR };

    // Either edit existing or add new
    if (editIndex !== null) {
        workouts[editIndex] = workout;
        editIndex = null;
    } else {
        workouts.push(workout);
    }

    localStorage.setItem('workouts', JSON.stringify(workouts));
    updateFilter();
    displayWorkouts();
    updateChart();
    form.reset();
});

// ----------------------
// Update workouts on filter change
// ----------------------
filter.addEventListener('change', displayWorkouts);

// ----------------------
// Export workouts as JSON
// ----------------------
exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(workouts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workouts.json';
    a.click();
});

// ----------------------
// Import workouts from JSON file
// ----------------------
importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const imported = JSON.parse(reader.result);
        if (Array.isArray(imported)) {
            workouts = imported;
            localStorage.setItem('workouts', JSON.stringify(workouts));
            updateFilter();
            displayWorkouts();
            updateChart();
        }
    };
    reader.readAsText(file);
});

// ----------------------
// Initial render on page load
// ----------------------
updateFilter();
displayWorkouts();
updateChart();
