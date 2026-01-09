import { supabase } from "./supabase.js";

const lineCtx = document.getElementById("dailyProgressChart");
const pieCtx = document.getElementById("monthlyPieChart");

// State variables
let lineChart = null;
let pieChart = null;
let dailyTotals = [];
let habitCounts = {}; 
let habitColorMap = {}; // Stores permanent color for each habit ID
let totalHabitsCount = 0;
let daysInMonth = 0;

// Date Setup
const now = new Date();
const params = new URLSearchParams(window.location.search);
const selMonth = params.get('month') ? parseInt(params.get('month')) : (now.getMonth() + 1);
const selYear = params.get('year') ? parseInt(params.get('year')) : now.getFullYear();
daysInMonth = new Date(selYear, selMonth, 0).getDate();

/* =========================================================
   1. FETCH DATA
   ========================================================= */
const { data: habits } = await supabase.from("habits").select("id, name").order('id');
totalHabitsCount = habits ? habits.length : 0;

// --- GENERATE STABLE N COLORS FOR N HABITS ---
if (habits) {
  habits.forEach((h, index) => {
    // Use Golden Angle (137.5 degrees) to ensure distinct colors for any N
    const hue = (index * 137.508) % 360;
    // HSL: Hue, 70% Saturation, 60% Lightness (Nice pastel/vibrant balance)
    habitColorMap[h.id] = `hsla(${hue}, 70%, 60%, 1)`;
  });
}

const { data: logs } = await supabase
  .from("habit_logs")
  .select("log_date, value, habit_id")
  .gte("log_date", `${selYear}-${selMonth}-01`)
  .lte("log_date", `${selYear}-${selMonth}-${daysInMonth}`);

/* =========================================================
   2. PROCESS DATA
   ========================================================= */

// --- LINE CHART DATA ---
dailyTotals = new Array(daysInMonth + 1).fill(0); 
const uniqueEntries = new Set();

logs?.forEach(l => {
  if(!l.log_date) return;
  const entryKey = `${l.log_date}_${l.habit_id}`;
  
  if (l.value > 0 && !uniqueEntries.has(entryKey)) {
    const day = new Date(l.log_date).getDate();
    dailyTotals[day]++;
    uniqueEntries.add(entryKey);
  }
});

const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);
const lineData = [];
for(let d=1; d<=daysInMonth; d++) {
  let percentage = totalHabitsCount > 0 ? (dailyTotals[d] / totalHabitsCount) * 100 : 0;
  if (percentage > 100) percentage = 100;
  lineData.push(percentage);
}

// --- PIE CHART DATA ---
habitCounts = {};
habits?.forEach(h => habitCounts[h.id] = { name: h.name, count: 0 });

logs?.forEach(l => {
  if(l.value > 0 && habitCounts[l.habit_id]) {
    habitCounts[l.habit_id].count++;
  }
});

const getPieData = () => {
  const pLabels = [];
  const pData = [];
  const pColors = [];
  
  // Sort by ID or Count to keep order stable
  Object.keys(habitCounts).forEach(id => {
    const h = habitCounts[id];
    if(h.count > 0) {
      pLabels.push(h.name);
      pData.push(h.count);
      // Retrieve the permanent color for this ID
      pColors.push(habitColorMap[id]);
    }
  });
  return { labels: pLabels, data: pData, colors: pColors };
};

const initialPie = getPieData();

/* =========================================================
   3. RENDER CHARTS
   ========================================================= */

if(lineCtx) {
  const gradient = lineCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(79, 70, 229, 0.4)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

  lineChart = new Chart(lineCtx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Consistency (%)",
        data: lineData,
        fill: true,
        backgroundColor: gradient,
        borderColor: "#4f46e5",
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,               
        pointBackgroundColor: "#fff", 
        pointBorderColor: "#4f46e5",  
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#4f46e5",
        pointHoverBorderColor: "#fff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: { legend: { display: false } },
      layout: { padding: { left: 10, right: 10, top: 10, bottom: 0 } },
      scales: {
        y: { 
          beginAtZero: true, max: 100, display: true, 
          grid: { color: '#f3f4f6' }, ticks: { stepSize: 25 } 
        },
        x: { display: true, grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    }
  });
}

if(pieCtx) {
  pieChart = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: initialPie.labels,
      datasets: [{
        data: initialPie.data,
        backgroundColor: initialPie.colors, // Dynamic stable colors
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateScale: true,
        animateRotate: true,
        duration: 800,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
      }
    }
  });
}

/* =========================================================
   4. REAL-TIME UPDATE EXPORT
   ========================================================= */
export function updateChartRealTime(dateStr, isChecked, habitId) {
  const day = new Date(dateStr).getDate();
  
  // Update Line Data
  if (isChecked) dailyTotals[day]++;
  else dailyTotals[day]--;

  let newPercent = totalHabitsCount > 0 ? (dailyTotals[day] / totalHabitsCount) * 100 : 0;
  if (newPercent > 100) newPercent = 100;
  if (newPercent < 0) newPercent = 0;
  
  if(lineChart) {
    lineChart.data.datasets[0].data[day - 1] = newPercent;
    lineChart.update();
  }

  // Update Pie Data
  if(habitCounts[habitId]) {
    if(isChecked) habitCounts[habitId].count++;
    else habitCounts[habitId].count--;
  }

  if(pieChart) {
    const updatedPie = getPieData();
    pieChart.data.labels = updatedPie.labels;
    pieChart.data.datasets[0].data = updatedPie.data;
    pieChart.data.datasets[0].backgroundColor = updatedPie.colors; // Update colors to match labels
    pieChart.update();
  }
}