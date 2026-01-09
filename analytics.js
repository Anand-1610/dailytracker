import { supabase } from "./supabase.js";

const leaderboardContainer = document.getElementById("leaderboardList");

const now = new Date();
const params = new URLSearchParams(window.location.search);
const selMonth = params.get('month') ? parseInt(params.get('month')) : (now.getMonth() + 1);
const selYear = params.get('year') ? parseInt(params.get('year')) : now.getFullYear();
const daysInMonth = new Date(selYear, selMonth, 0).getDate();

const paramsMonth = params.get('month');
const paramsYear = params.get('year');

// Update Dropdowns logic moved here to run on every page load
const monthSelect = document.getElementById("month");
const yearSelect = document.getElementById("year");
const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

if(monthSelect && monthSelect.children.length === 0) {
  monthNames.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i + 1;
    opt.textContent = m;
    if (i + 1 === selMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  });
  
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === selYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  
  const updateUrl = () => {
    window.location.search = `?month=${monthSelect.value}&year=${yearSelect.value}`;
  };
  monthSelect.onchange = yearSelect.onchange = updateUrl;
}

// FETCH DATA FOR LEADERBOARD
const { data: logs } = await supabase
  .from("habit_logs")
  .select("value, log_date, habits(id, name, goal)")
  .gte("log_date", `${selYear}-${selMonth}-01`)
  .lte("log_date", `${selYear}-${selMonth}-${daysInMonth}`);

const habitStats = {}; 

logs?.forEach(l => {
  if (!l.habits) return; 
  const name = l.habits.name;
  const goal = l.habits.goal || 20;

  if (!habitStats[name]) habitStats[name] = { count: 0, goal: goal };
  if (l.value > 0) habitStats[name].count++;
});

// SORT & RENDER
const sortedHabits = Object.entries(habitStats)
  .map(([name, data]) => {
    const percent = Math.min(100, Math.round((data.count / data.goal) * 100));
    return { name, ...data, percent };
  })
  .sort((a, b) => b.percent - a.percent)
  .slice(0, 10);

let html = ``;

sortedHabits.forEach(h => {
  html += `
    <div class="habit-list-item">
      <div class="list-header">
        <span>${h.name}</span>
        <span>${h.percent}%</span>
      </div>
      <div class="list-meta">
        ${h.count} / ${h.goal} days
      </div>
      <div class="mini-progress">
        <div class="mini-fill" style="width: ${h.percent}%"></div>
      </div>
    </div>
  `;
});

if (sortedHabits.length === 0) html = `<div style="text-align:center; color:#999; font-size:0.8rem; padding:10px;">No activity yet.</div>`;
if(leaderboardContainer) leaderboardContainer.innerHTML = html;