import { supabase } from "./supabase.js";
// IMPORT THE NEW UPDATE FUNCTION
import { updateChartRealTime } from "./charts.js"; 

const gridContainer = document.getElementById("habitGrid");
const addBtn = document.getElementById("addHabitBtn");
const modal = document.getElementById("habitModal");
const modalTitle = document.getElementById("modalTitle");
const habitInput = document.getElementById("habitInput");
const habitGoalInput = document.getElementById("habitGoalInput");
const saveBtn = document.getElementById("saveHabitBtn");
const dailyRing = document.getElementById("dailyRingPath");
const dailyText = document.getElementById("dailyText");

let currentEditId = null;

// THEME
const themeToggle = document.getElementById("themeToggle");
const isDark = localStorage.getItem("theme") === "dark";
if(isDark) document.body.classList.add("dark");
if(themeToggle) {
  themeToggle.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  };
}

// DATE LOGIC
const now = new Date();
const params = new URLSearchParams(window.location.search);
const selMonth = params.get('month') ? parseInt(params.get('month')) : (now.getMonth() + 1);
const selYear = params.get('year') ? parseInt(params.get('year')) : now.getFullYear();
const daysInMonth = new Date(selYear, selMonth, 0).getDate();
const todayDate = new Date();
const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,"0")}-${String(todayDate.getDate()).padStart(2,"0")}`;

// MODAL
if(addBtn) {
  addBtn.onclick = () => {
    currentEditId = null;
    modalTitle.innerText = "New Habit";
    habitInput.value = "";
    habitGoalInput.value = "20";
    modal.style.display = "flex";
    habitInput.focus();
  };
}
window.closeModal = () => modal.style.display = "none";

if(saveBtn) {
  saveBtn.onclick = async () => {
    const name = habitInput.value;
    const goal = parseInt(habitGoalInput.value) || 20;
    if (!name) return;
    
    let error;
    if (currentEditId) {
      ({ error } = await supabase.from("habits").update({ name, goal }).eq("id", currentEditId));
    } else {
      ({ error } = await supabase.from("habits").insert({ name, goal }));
    }
    
    if(error) { alert("Error saving: " + error.message); }
    else { closeModal(); location.reload(); }
  };
}

window.deleteHabit = async (id) => {
  if(confirm("Delete this habit and all history?")) {
    await supabase.from("habits").delete().eq("id", id);
    location.reload();
  }
};

window.editHabit = async (id, name) => {
  currentEditId = id;
  modalTitle.innerText = "Edit Habit";
  habitInput.value = name;
  const { data } = await supabase.from("habits").select("goal").eq("id", id).single();
  habitGoalInput.value = data?.goal || 20;
  modal.style.display = "flex";
};

// DATA FETCH
const { data: habits, error: habitError } = await supabase.from("habits").select("*").order("created_at", { ascending: true });

if (habitError) {
  console.error("Supabase Error:", habitError);
  if(habitError.code === "42501" || habitError.message.includes("Policy")) {
    alert("⚠️ DATABASE LOCKED ⚠️\n\nYou must run the SQL commands in Supabase.");
  }
}

const { data: logs } = await supabase
  .from("habit_logs")
  .select("*")
  .gte("log_date", `${selYear}-${selMonth}-01`)
  .lte("log_date", `${selYear}-${selMonth}-${daysInMonth}`);

const logMap = {};
logs?.forEach(l => { logMap[`${l.habit_id}_${l.log_date}`] = l.value; });

updateDailyProgress();
renderGrid();

function renderGrid() {
  if(!gridContainer) return;
  const table = document.createElement("div");
  table.className = "habit-table";

  table.appendChild(createCell("Habit", "h-cell sticky-col"));
  table.appendChild(createCell("Streak", "h-cell"));
  table.appendChild(createCell("Progress", "h-cell"));
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(selYear, selMonth - 1, d);
    const dayOfWeek = dateObj.getDay();
    const dateStr = `${selYear}-${String(selMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    let classes = "h-cell";
    if(dayOfWeek === 0 || dayOfWeek === 6) classes += " weekend";
    if(dateStr === todayStr) classes += " today-col";
    table.appendChild(createCell(d, classes));
  }

  if (habits && habits.length > 0) {
    habits.forEach(habit => {
      const nameCell = document.createElement("div");
      nameCell.className = "row-name sticky-col h-cell";
      nameCell.innerHTML = `<span>${habit.name}</span>
        <div class="habit-menu-btn">
          <span onclick="editHabit('${habit.id}', '${habit.name}')">✎</span>
          <span onclick="deleteHabit('${habit.id}')" style="margin-left:5px; color:var(--danger);">🗑</span>
        </div>`;
      table.appendChild(nameCell);

      const streak = calculateStreak(habit.id);
      const flameColor = streak > 0 ? '' : 'gray-flame';
      table.appendChild(createCell(`<div class="streak-flame ${flameColor}">🔥 ${streak}</div>`, "h-cell"));

      const completedCount = countHabitDone(habit.id);
      const percent = Math.round((completedCount / daysInMonth) * 100);
      const barContainer = document.createElement("div");
      barContainer.style.display = "flex";
      barContainer.style.alignItems = "center";
      barContainer.innerHTML = `<div class="row-progress"><div class="row-fill" style="width: ${percent}%"></div></div><span class="progress-text">${percent}%</span>`;
      table.appendChild(barContainer);

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selYear}-${String(selMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const isChecked = logMap[`${habit.id}_${dateStr}`] >= 1;
        const dateObj = new Date(selYear, selMonth - 1, d);
        const isFuture = dateObj > todayDate;
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const isToday = dateStr === todayStr;

        let cellClass = "day-chk";
        if(isWeekend) cellClass += " weekend";
        if(isToday) cellClass += " today-col";

        const cell = document.createElement("div");
        cell.className = cellClass;

        const chkDiv = document.createElement("div");
        chkDiv.className = `custom-checkbox ${isChecked ? 'checked' : ''} ${isFuture ? 'disabled' : ''}`;
        chkDiv.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        
        if(!isFuture) {
          chkDiv.onclick = () => {
            const newState = !isChecked;
            toggleHabit(habit.id, dateStr, newState);
            chkDiv.classList.toggle('checked');
          };
        }
        cell.appendChild(chkDiv);
        table.appendChild(cell);
      }
    });
  } else {
    const emptyMsg = document.createElement("div");
    emptyMsg.style.gridColumn = "1 / -1";
    emptyMsg.style.padding = "20px";
    emptyMsg.style.textAlign = "center";
    emptyMsg.innerText = "No habits found. Click '+ New Habit' to start.";
    table.appendChild(emptyMsg);
  }

  gridContainer.innerHTML = "";
  gridContainer.appendChild(table);
}

function createCell(content, className = "") {
  const div = document.createElement("div");
  div.className = className;
  if(typeof content === 'string' && content.includes('<')) div.innerHTML = content;
  else div.innerText = content;
  return div;
}

function countHabitDone(habitId) {
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${selYear}-${String(selMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if (logMap[`${habitId}_${date}`] >= 1) count++;
  }
  return count;
}

function calculateStreak(habitId) {
  let streak = 0;
  const todayD = todayDate.getDate(); 
  for(let d = todayD; d >= 1; d--) {
    const date = `${selYear}-${String(selMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if(logMap[`${habitId}_${date}`] >= 1) streak++;
    else if(d < todayD) break;
  }
  return streak;
}

function updateDailyProgress() {
  if(!dailyText || !dailyRing) return;
  if(!habits || habits.length === 0) { dailyText.innerText = "0/0"; return; }
  
  let doneToday = 0;
  habits.forEach(h => { if(logMap[`${h.id}_${todayStr}`] >= 1) doneToday++; });

  const total = habits.length;
  dailyText.innerText = `${doneToday}/${total}`;
  const percent = total === 0 ? 0 : (doneToday / total);
  dailyRing.style.strokeDashoffset = 100 - (percent * 100);
}

async function toggleHabit(habitId, date, checked) {
  const val = checked ? 1 : 0;
  // 1. Update Local Map
  logMap[`${habitId}_${date}`] = val;
  
  // 2. Update Header UI
  updateDailyProgress();
  
  // 3. Update Charts REAL-TIME
  updateChartRealTime(date, checked, habitId);

  // 4. Update Database
  // We specify 'onConflict' to ensure we update the existing row based on our new SQL constraint
  await supabase.from("habit_logs").upsert(
    { habit_id: habitId, log_date: date, value: val },
    { onConflict: 'habit_id, log_date' }
  );
}