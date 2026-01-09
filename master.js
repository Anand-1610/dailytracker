import { supabase } from "./supabase.js";

/* =========================================================
   THEME LOGIC
   ========================================================= */
const themeToggle = document.getElementById("themeToggle");
const isDark = localStorage.getItem("theme") === "dark";
if(isDark) document.body.classList.add("dark");

if(themeToggle) {
  themeToggle.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
    location.reload(); 
  };
}

// Chart Colors
const getColor = (alpha = 0.5) => isDark ? `rgba(129, 140, 248, ${alpha})` : `rgba(79, 70, 229, ${alpha})`;
const getBorder = () => isDark ? '#818cf8' : '#4f46e5';
const getText = () => isDark ? '#94a3b8' : '#64748b';

/* =========================================================
   1. VOICE SUMMARY
   ========================================================= */
function speakSummary(daysPassed, monthName) {
  if ('speechSynthesis' in window) {
    setTimeout(() => {
      const text = `Welcome back. We are ${daysPassed} days into ${monthName}. Here is your real-time analysis.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1; 
      window.speechSynthesis.speak(utterance);
    }, 1000);
  }
}

/* =========================================================
   2. DATA FETCHING (Real-Time Current Month)
   ========================================================= */
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const dateStr = `${year}-${month}-01`; 

const daysPassed = now.getDate(); 
const monthName = now.toLocaleString('default', { month: 'long' });

speakSummary(daysPassed, monthName);

const { data: habits } = await supabase.from("habits").select("*");
const { data: logs } = await supabase
  .from("habit_logs")
  .select("log_date, value, habit_id")
  .gte("log_date", dateStr);

/* =========================================================
   3. DATA PROCESSING
   ========================================================= */
const habitStats = {}; 
const dayOfWeekStats = [0,0,0,0,0,0,0]; // Sun=0, Sat=6

if(habits) {
  habits.forEach(h => {
    habitStats[h.id] = { name: h.name, total: 0, history: new Set() };
  });
}

logs?.forEach(l => {
  if (habitStats[l.habit_id] && l.value > 0) {
    habitStats[l.habit_id].total++;
    habitStats[l.habit_id].history.add(l.log_date);
    
    const dayIndex = new Date(l.log_date).getDay();
    dayOfWeekStats[dayIndex]++;
  }
});

let overallPerformance = 0; 
let validHabitCount = 0;

Object.values(habitStats).forEach(stat => {
  stat.percentage = (stat.total / daysPassed) * 100;
  if(stat.percentage > 100) stat.percentage = 100;
  
  overallPerformance += stat.percentage;
  validHabitCount++;
});

overallPerformance = validHabitCount > 0 ? (overallPerformance / validHabitCount) : 0;

/* =========================================================
   4. RENDER: AI INSIGHTS
   ========================================================= */
const aiContainer = document.getElementById("aiInsights");
if(aiContainer) {
  const pros = Object.values(habitStats).filter(h => h.percentage >= 80);
  const lagging = Object.values(habitStats).filter(h => h.percentage < 40);
  let insightHTML = "";

  if (pros.length > 0) {
    insightHTML += `
    <div style="padding:15px; background:rgba(16, 185, 129, 0.1); border-left:4px solid #10b981; border-radius:6px;">
      <strong style="color:#047857; display:block; margin-bottom:5px;">🏆 Strong Habits</strong>
      <span style="color:var(--text-main); font-size:0.9rem;">You are nailing <strong>${pros.map(h=>h.name).join(", ")}</strong> with >80% consistency.</span>
    </div>`;
  }
  if (lagging.length > 0) {
    insightHTML += `
    <div style="padding:15px; background:rgba(239, 68, 68, 0.1); border-left:4px solid #ef4444; border-radius:6px;">
      <strong style="color:#b91c1c; display:block; margin-bottom:5px;">⚠️ At Risk</strong>
      <span style="color:var(--text-main); font-size:0.9rem;"><strong>${lagging.map(h=>h.name).join(", ")}</strong> are falling behind. Focus here tomorrow.</span>
    </div>`;
  }
  if(validHabitCount === 0) insightHTML = `<div style="color:var(--text-muted);">No data for ${monthName} yet.</div>`;
  aiContainer.innerHTML = insightHTML;
}

/* =========================================================
   5. RENDER: RADAR CHART
   ========================================================= */
const ctxRadar = document.getElementById("radarChart");
if(ctxRadar && validHabitCount > 0) {
  new Chart(ctxRadar, {
    type: 'radar',
    data: {
      labels: Object.values(habitStats).map(h => h.name),
      datasets: [{
        label: `Consistency (%)`,
        data: Object.values(habitStats).map(h => h.percentage),
        fill: true,
        backgroundColor: getColor(0.2),
        borderColor: getBorder(),
        pointBackgroundColor: getBorder(),
        pointBorderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      elements: { line: { borderWidth: 3 } },
      scales: {
        r: {
          angleLines: { color: isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)' },
          grid: { color: isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)' },
          pointLabels: { font: { size: 12, weight: 'bold' }, color: getText() },
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: { display: false }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/* =========================================================
   6. RENDER: DAY OF WEEK CHART
   ========================================================= */
const ctxDay = document.getElementById("dayOfWeekChart");
if(ctxDay) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  new Chart(ctxDay, {
    type: 'bar',
    data: {
      labels: dayNames,
      datasets: [{
        label: 'Habits Completed',
        data: dayOfWeekStats,
        backgroundColor: dayOfWeekStats.map(v => {
            const max = Math.max(...dayOfWeekStats);
            return v === max && max > 0 ? (isDark ? '#10b981' : '#059669') : getColor(0.6);
        }),
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { display: false }, ticks: { color: getText() } },
        x: { grid: { display: false }, ticks: { color: getText() } }
      }
    }
  });
}

/* =========================================================
   7. IMPACT ANALYSIS
   ========================================================= */
const correlationContainer = document.getElementById("correlationGrid");
const habitIds = Object.keys(habitStats);
let corrHTML = "";

if (daysPassed >= 3) {
  habitIds.forEach(idA => {
    const nameA = habitStats[idA].name;
    const historyA = habitStats[idA].history;
    if(historyA.size === 0) return; 

    let bestPair = null;
    let maxScore = 0;

    habitIds.forEach(idB => {
      if (idA === idB) return;
      const historyB = habitStats[idB].history;
      if(historyB.size === 0) return;

      const datesA = Array.from(historyA);
      let shared = 0;
      datesA.forEach(date => { if (historyB.has(date)) shared++; });

      const strength = (shared / datesA.length) * 100;
      if (strength > maxScore && strength >= 50) { 
        maxScore = strength;
        bestPair = habitStats[idB].name;
      }
    });

    if (bestPair) {
      corrHTML += `
        <div style="border:1px solid var(--border); padding:15px; border-radius:8px; background:var(--card-bg);">
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">Strong Link</div>
          <div style="font-size:0.95rem; color:var(--text-main);">When you <strong style="color:var(--primary);">${nameA}</strong>...</div>
          <div style="font-size:0.95rem; color:var(--text-main);">You usually <strong style="color:#10b981;">${bestPair}</strong></div>
          <div style="margin-top:8px; height:4px; background:var(--bg); border-radius:2px; overflow:hidden;">
            <div style="height:100%; width:${maxScore}%; background:var(--primary);"></div>
          </div>
        </div>`;
    }
  });
}
if(correlationContainer) correlationContainer.innerHTML = corrHTML || `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);">No patterns found yet.</div>`;

/* =========================================================
   8. JOURNAL LOGIC & HISTORY
   ========================================================= */
const journalDate = document.getElementById("journalDate");
const journalInput = document.getElementById("journalInput");
const journalMood = document.getElementById("journalMood");
const saveBtn = document.getElementById("saveJournalBtn");
const display = document.getElementById("savedNoteDisplay");
const historyBtn = document.getElementById("historyBtn");
const historyList = document.getElementById("historyList");

if(journalDate) {
  // Set default to today
  journalDate.value = new Date().toISOString().split('T')[0];

  const loadNote = async () => {
    const date = journalDate.value;
    const { data } = await supabase.from("daily_notes").select("*").eq("log_date", date).single();
    if(data) {
      journalInput.value = data.note || "";
      if(journalMood) journalMood.value = data.mood || "neutral";
      if(display) { display.style.display = "block"; display.innerHTML = `<strong>Note on ${date}:</strong><br>${data.note}`; }
    } else {
      journalInput.value = "";
      if(journalMood) journalMood.value = "neutral";
      if(display) display.style.display = "none";
    }
  };
  journalDate.onchange = loadNote;
  loadNote();

  if(saveBtn) {
    saveBtn.onclick = async () => {
      const date = journalDate.value;
      const note = journalInput.value;
      const mood = journalMood ? journalMood.value : "neutral";

      if(!note) return;

      // GET USER ID (Required for the composite unique key)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to save notes.");
        return;
      }

      // Upsert using the new composite constraint
      const { error } = await supabase.from("daily_notes").upsert(
        { 
          user_id: user.id, // Explicitly link to user
          log_date: date, 
          note: note, 
          mood: mood 
        }, 
        // Supabase will automatically detect the (user_id, log_date) constraint
      );

      if(error) alert("Error saving note: " + error.message);
      else { 
        alert("Note saved!"); 
        loadNote(); 
      }
    };
  }

  // --- HISTORY LOGIC ---
  if(historyBtn) {
    historyBtn.onclick = async () => {
      // Toggle
      if(historyList.style.display === "block") {
        historyList.style.display = "none";
        historyBtn.innerText = "📜 View Month History";
        historyBtn.style.background = "transparent";
        historyBtn.style.color = "var(--primary)";
        return;
      }

      historyList.style.display = "block";
      historyList.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:10px;">Loading...</div>`;
      historyBtn.innerText = "🔼 Hide History";
      historyBtn.style.background = "var(--primary)";
      historyBtn.style.color = "#fff";

      // Fetch Month Logs
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: notes } = await supabase
        .from("daily_notes")
        .select("*")
        .gte("log_date", startOfMonth)
        .lte("log_date", endOfMonth)
        .order("log_date", { ascending: false });

      if(!notes || notes.length === 0) {
        historyList.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:10px;">No notes found for this month.</div>`;
        return;
      }

      // Render
      let html = "";
      notes.forEach(n => {
        const d = new Date(n.log_date);
        const dayStr = d.toLocaleDateString('default', { weekday: 'short', day: '2-digit', month: 'short' });
        const moodMap = { "happy": "🔥", "neutral": "😐", "stressed": "😫", "sick": "🤒" };
        const icon = moodMap[n.mood] || "📝";

        html += `
          <div style="background:var(--bg); border-radius:8px; padding:12px; margin-bottom:10px; border-left: 3px solid var(--primary);">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:var(--text-muted); margin-bottom:6px;">
              <span style="font-weight:600;">${dayStr}</span>
              <span style="font-size:1.1rem;">${icon}</span>
            </div>
            <div style="font-size:0.9rem; color:var(--text-main); white-space:pre-wrap; line-height:1.4;">${n.note}</div>
          </div>
        `;
      });
      historyList.innerHTML = html;
    };
  }
}