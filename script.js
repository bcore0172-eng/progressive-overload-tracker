// Grab DOM elements
const form = document.getElementById('exercise-form');
const workoutList = document.getElementById('workout-history');
const filter = document.getElementById('exercise-filter');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');
const ctx = document.getElementById('progress-chart').getContext('2d');

let chart; // Chart.js instance

// ----------------------
// Use sample workouts for testing chart
// ----------------------
let workouts = JSON.parse(localStorage.getItem('workouts')) || [
    { date: "2026-01-05", exercise: "Bench Press", sets: 3, reps: 8, weight: 150, isPR: false },
    { date: "2026-01-06", exercise: "Bench Press", sets: 3, reps: 8, weight: 155, isPR: true },
    { date: "2026-01-05", exercise: "Squat", sets: 4, reps: 6, weight: 200, isPR: false }
];

let editIndex = null; // keeps track of which workout is being edited

// ----------------------
// Color mapping for exercises
// ----------------------
const exerciseColors = {}; // key: exercise name, value: color
const colorsPalette = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];

function getExerciseColor(exercise) {
    if (!exerciseColors[exercise]) {
        const availableColors = colorsPalette.filter(c => !Object.values(exerciseColors).includes(c));
        exerciseColors[exercise] = availableColors[0] || '#3b82f6';
    }
    return exerciseColors[exercise];
}

// ----------------------
// Chart Rendering
// ----------------------
function updateChart() {
    // ----------------------
    // Extract unique exercises from all workouts
    // ----------------------
    const exercises = [...new Set(workouts.map(w => w.exercise))]; // unique exercises

    // ----------------------
    // Create a dataset for each exercise
    // Each dataset is a separate line in the chart
    // ----------------------
    const datasets = exercises.map(exercise => {
        // Filter workouts for this exercise and sort by date
        const exerciseWorkouts = workouts
            .filter(w => w.exercise === exercise)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Map each workout to {x: date, y: weight} for Chart.js
        const data = exerciseWorkouts.map(w => ({
            x: new Date(w.date), // convert string to Date
            y: w.weight,
            isPR: w.isPR
        }));

        return {
            label: exercise, // line label
            data, // points for this exercise
            borderColor: getExerciseColor(exercise), // consistent color per exercise
            backgroundColor: 'rgba(0,0,0,0)', // no fill under line
            tension: 0.3, // smooth line
            pointRadius: 6, // circle size
            // Color PR points green, others use exercise color
            pointBackgroundColor: data.map(d => d.isPR ? '#076028ff' : getExerciseColor(exercise))
        };
    });

    // ----------------------
    // Destroy previous chart instance if it exists
    // ----------------------
    if (chart) chart.destroy();

    // ----------------------
    // Create new Chart.js instance
    // ----------------------
    chart = new Chart(ctx, {
        type: 'line', // line chart
        data: { datasets }, // datasets created above
        options: {
            responsive: true, // chart resizes automatically
            maintainAspectRatio: false, // height controlled by CSS
            parsing: { xAxisKey: 'x', yAxisKey: 'y' }, // parse x/y objects
            plugins: {
                tooltip: {
                    callbacks: {
                        // Customize tooltip text
                        label: (context) => {
                            const d = context.raw; // get {x, y, isPR}
                            return d.isPR ? `${d.y} lbs 🚀 PR` : `${d.y} lbs`;
                        }
                    }
                }
            },
            scales: {
                x: { type: 'time', time: { unit: 'day' } }, // X-axis is date
                y: { beginAtZero: false } // start Y-axis at minimum weight
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
    const date = new Date().toISOString().split('T')[0]; // current date

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
