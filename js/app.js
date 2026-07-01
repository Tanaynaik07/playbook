import { login, logout, watchAuth } from "./firebase-config.js";
import * as DB from "./db.js";
import {
  renderFormFields, readForm, renderList, renderNotesGrid, escapeHtml,
  wireConditionalFields, formatCurrency,
} from "./render.js";
import {
  PROJECT_SECTIONS, KNOWLEDGE_SCHEMA, PLAYBOOK_SCHEMA, EXPENSES_SCHEMA, OVERVIEW_FIELDS, STAGES,
} from "./schema.js";

const app = document.getElementById("app");
const sidebar = document.getElementById("sidebar");
const authGate = document.getElementById("auth-gate");
const userBadge = document.getElementById("user-badge");

let currentUser = null;
let projectsCache = [];

// ---- Auth ---------------------------------------------------------------
document.getElementById("login-btn").addEventListener("click", () => login().catch(alert));
document.getElementById("logout-btn").addEventListener("click", () => logout());

watchAuth(async (user) => {
  currentUser = user;
  if (!user) {
    authGate.classList.remove("hidden");
    document.getElementById("shell").classList.add("hidden");
    return;
  }
  authGate.classList.add("hidden");
  document.getElementById("shell").classList.remove("hidden");
  userBadge.textContent = user.displayName || user.email;
  DB.setUid(user.uid);
  await refreshProjects();
  router();
});

async function refreshProjects() {
  projectsCache = await DB.listAll(DB.projectsPath(), "createdAt");
  renderSidebar();
}

// ---- Activity log ---------------------------------------------------------
// Every create/update/delete across the app writes one row here so nothing
// is silently lost. Failures here are logged but never block the real CRUD.
async function logActivity(action, sectionLabel, summary, context) {
  try {
    await DB.addItem(DB.logPath(), { action, section: sectionLabel, summary: summary || "", project: context || null });
  } catch (err) {
    console.error("Failed to write activity log", err);
  }
}

function renderSidebar() {
  const activeCount = projectsCache.filter((p) => p.status === "Active").length;
  const planningCount = projectsCache.filter((p) => p.status === "Planning").length;
  const archivedCount = projectsCache.filter((p) => p.status === "Archived").length;
  sidebar.innerHTML = `
    <div class="brand"><i class="ti ti-notebook"></i> Founder's Diary</div>
    <nav class="nav-top">
      <a href="#/dashboard" class="${loc() === "dashboard" ? "active" : ""}"><i class="ti ti-layout-dashboard"></i> Dashboard</a>
      <a href="#/" class="${loc() === "" ? "active" : ""}"><i class="ti ti-folder"></i> Projects</a>
      <a href="#/knowledge" class="${loc() === "knowledge" ? "active" : ""}"><i class="ti ti-bulb"></i> Knowledge Vault</a>
      <a href="#/playbook" class="${loc() === "playbook" ? "active" : ""}"><i class="ti ti-book"></i> Startup Playbook</a>
      <a href="#/calendar" class="${loc() === "calendar" ? "active" : ""}"><i class="ti ti-calendar" ></i> Calendar &amp; Goals</a>
      <a href="#/expenses" class="${loc() === "expenses" ? "active" : ""}"><i class="ti ti-cash"></i> Expenses</a>
      <a href="#/journal" class="${loc() === "journal" ? "active" : ""}"><i class="ti ti-pencil"></i> Daily Journal</a>
      <a href="#/timeline" class="${loc() === "timeline" ? "active" : ""}"><i class="ti ti-git-commit"></i> Timeline</a>
      <a href="#/log" class="${loc() === "log" ? "active" : ""}"><i class="ti ti-history"></i> Activity Log</a>
    </nav>
    <div class="nav-projects">
      <div class="nav-projects-head">Projects <span class="pill-counts"><span class="dot dot-green"></span>${activeCount} <span class="dot dot-amber"></span>${planningCount} <span class="dot dot-red"></span>${archivedCount}</span></div>
      ${projectsCache.map((p) => `<a class="proj-link" href="#/project/${p.id}"><span class="status-dot status-${(p.status || "Active").toLowerCase()}"></span>${escapeHtml(p.name || "Untitled")}</a>`).join("")}
      <button id="new-project-btn" class="ghost-btn small"><i class="ti ti-plus"></i> New project</button>
    </div>
  `;
  document.getElementById("new-project-btn").onclick = createProject;
}

// Mobile sidebar drawer: elements are static in index.html so listeners
// attached once here survive every renderSidebar() re-render.
const menuToggle = document.getElementById("menu-toggle");
const sidebarOverlay = document.getElementById("sidebar-overlay");
function closeSidebarDrawer() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("show");
}
if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    sidebarOverlay.classList.toggle("show");
  });
}
if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebarDrawer);
sidebar.addEventListener("click", (e) => { if (e.target.closest("a")) closeSidebarDrawer(); });

async function createProject() {
  const name = prompt("Project name?");
  if (!name) return;
  await DB.addItem(DB.projectsPath(), { name, description: "", stage: "Idea", priority: "Medium", revenue: 0, status: "Planning" });
  await logActivity("Created", "Project", name);
  await refreshProjects();
  router();
}

// ---- Router ---------------------------------------------------------------
function loc() { return (location.hash || "#/").slice(2); }
window.addEventListener("hashchange", router);

async function router() {
  if (!currentUser) return;
  renderSidebar();
  const parts = loc().split("/").filter(Boolean);
  if (parts[0] === "dashboard") return viewDashboard();
  if (parts[0] === "knowledge") return viewGlobalCollection(KNOWLEDGE_SCHEMA, DB.knowledgePath());
  if (parts[0] === "playbook") return viewGlobalCollection(PLAYBOOK_SCHEMA, DB.playbookPath());
  if (parts[0] === "calendar") return viewCalendar();
  if (parts[0] === "expenses") return viewExpenses();
  if (parts[0] === "journal") return viewJournal();
  if (parts[0] === "timeline") return viewTimeline(null);
  if (parts[0] === "log") return viewLog();
  if (parts[0] === "project" && parts[1]) return viewProject(parts[1], parts[2] || "overview");
  return viewHome();
}

// ---- Home (project list as cards) -----------------------------------------
function viewHome() {
  app.innerHTML = `
    <div class="page-head"><h1>Projects</h1><button class="primary-btn" id="add-proj"><i class="ti ti-plus"></i> New project</button></div>
    <div class="card-grid">
      ${projectsCache.map((p) => `
        <a class="project-card" href="#/project/${p.id}">
          <div class="project-card-top">
            <span class="status-dot status-${(p.status || "Active").toLowerCase()}"></span>
            <span class="stage-pill">${p.stage || "Idea"}</span>
          </div>
          <h3>${escapeHtml(p.name || "Untitled")}</h3>
          <p class="muted">${escapeHtml(p.description || "No description yet")}</p>
        </a>`).join("") || `<div class="empty">No projects yet. Create your first one.</div>`}
    </div>
  `;
  document.getElementById("add-proj").onclick = createProject;
}

// ---- Project workspace ------------------------------------------------------
async function viewProject(projectId, sectionKey) {
  const project = await DB.getOne(DB.projectsPath(), projectId);
  if (!project) { location.hash = "#/"; return; }

  const tabs = [{ key: "overview", label: "Overview", icon: "ti-home" }]
    .concat(PROJECT_SECTIONS.map((s) => ({ key: s.key, label: s.label, icon: s.icon })))
    .concat([{ key: "timeline", label: "Timeline", icon: "ti-git-commit" }]);

  app.innerHTML = `
    <div class="page-head">
      <h1>${escapeHtml(project.name)}</h1>
      <span class="stage-pill">${project.stage}</span>
    </div>
    <div class="tabs">${tabs.map((t) => `<button class="tab ${t.key === sectionKey ? "active" : ""}" data-tab="${t.key}"><i class="ti ${t.icon}"></i> ${t.label}</button>`).join("")}</div>
    <div id="tab-body"></div>
  `;
  app.querySelectorAll(".tab").forEach((btn) => {
    btn.onclick = () => { location.hash = `#/project/${projectId}/${btn.dataset.tab}`; };
  });

  const body = document.getElementById("tab-body");
  if (sectionKey === "overview") return renderOverviewTab(body, projectId, project);
  if (sectionKey === "timeline") return renderTimelineTab(body, projectId, project.name);
  const section = PROJECT_SECTIONS.find((s) => s.key === sectionKey);
  if (!section) return;
  return renderSectionTab(body, section, DB.sectionPath(projectId, section.key), null, null, project.name);
}

function renderOverviewTab(body, projectId, project) {
  body.innerHTML = `
    <form id="overview-form" class="panel form-grid">
      ${renderFormFields(OVERVIEW_FIELDS, project)}
      <div class="form-actions">
        <button type="submit" class="primary-btn">Save</button>
        <button type="button" id="delete-project" class="danger-btn">Delete project</button>
      </div>
    </form>
  `;
  document.getElementById("overview-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = readForm(OVERVIEW_FIELDS, e.target);
    await DB.updateItem(DB.projectsPath(), projectId, data);
    await logActivity("Updated", "Project", data.name || project.name);
    await refreshProjects();
    router();
  });
  document.getElementById("delete-project").onclick = async () => {
    if (!confirm(`Delete "${project.name}" and all its data? This can't be undone.`)) return;
    await DB.removeItem(DB.projectsPath(), projectId);
    await logActivity("Deleted", "Project", project.name);
    await refreshProjects();
    location.hash = "#/";
  };
}

async function renderSectionTab(body, section, path, extraPanel, onChange, context) {
  body.innerHTML = `<div class="panel"><div class="loading">Loading…</div></div>`;
  const items = await DB.listAll(path, section.dateField || "createdAt");
  const listHtml = section.layout === "notes" ? renderNotesGrid(section.fields, items) : renderList(section.fields, items);
  const listWrapClass = section.layout === "notes" ? "note-board" : "panel";
  body.innerHTML = `
    ${extraPanel ? extraPanel(items) : ""}
    <form id="add-form" class="panel form-grid">
      ${renderFormFields(section.fields)}
      <div class="form-actions"><button type="submit" class="primary-btn"><i class="ti ti-plus"></i> Add</button></div>
    </form>
    <div class="${listWrapClass}">${listHtml}</div>
  `;
  wireConditionalFields(body.querySelector("#add-form"));
  wireSectionEvents(body, section, path, items, extraPanel, onChange, context);
}

function wireSectionEvents(body, section, path, items, extraPanel, onChange, context) {
  body.querySelector("#add-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = readForm(section.fields, e.target);
    await DB.addItem(path, data);
    await logActivity("Created", section.label, summarize(section, data), context);
    renderSectionTab(body, section, path, extraPanel, onChange, context);
    if (onChange) onChange();
  });
  body.querySelectorAll("[data-toggle]").forEach((el) => {
    el.addEventListener("change", async () => {
      const item = items.find((i) => i.id === el.dataset.toggle);
      await DB.updateItem(path, el.dataset.toggle, { [el.dataset.field]: el.checked });
      await logActivity("Updated", section.label, item ? summarize(section, item) : "", context);
      if (onChange) onChange();
    });
  });
  body.querySelectorAll("[data-delete]").forEach((el) => {
    el.addEventListener("click", async () => {
      if (!confirm("Delete this item?")) return;
      const item = items.find((i) => i.id === el.dataset.delete);
      await DB.removeItem(path, el.dataset.delete);
      await logActivity("Deleted", section.label, item ? summarize(section, item) : "", context);
      renderSectionTab(body, section, path, extraPanel, onChange, context);
      if (onChange) onChange();
    });
  });
  body.querySelectorAll("[data-edit]").forEach((el) => {
    el.addEventListener("click", () => {
      const item = items.find((i) => i.id === el.dataset.edit);
      openEditDialog(section.fields, item, async (data) => {
        await DB.updateItem(path, item.id, data);
        await logActivity("Updated", section.label, summarize(section, { ...item, ...data }), context);
        renderSectionTab(body, section, path, extraPanel, onChange, context);
        if (onChange) onChange();
      });
    });
  });
}

function openEditDialog(fields, item, onSave) {
  const dlg = document.createElement("dialog");
  dlg.className = "edit-dialog";
  dlg.innerHTML = `
    <form method="dialog" class="form-grid">
      <h3>Edit</h3>
      ${renderFormFields(fields, item)}
      <div class="form-actions">
        <button value="cancel" class="ghost-btn">Cancel</button>
        <button value="save" class="primary-btn">Save</button>
      </div>
    </form>
  `;
  document.body.appendChild(dlg);
  wireConditionalFields(dlg.querySelector("form"));
  dlg.addEventListener("close", async () => {
    if (dlg.returnValue === "save") await onSave(readForm(fields, dlg.querySelector("form")));
    dlg.remove();
  });
  dlg.showModal();
}

// ---- Global collections (Knowledge Vault, Startup Playbook) -----------------
async function viewGlobalCollection(schema, path) {
  app.innerHTML = `<div class="page-head"><h1>${schema.label}</h1></div><div id="tab-body"></div>`;
  const body = document.getElementById("tab-body");
  // renderSectionTab is schema-agnostic - a "section" and a "global schema" have the
  // same shape (fields + dateField), so this reuses all the same wiring.
  return renderSectionTab(body, schema, path);
}

// ---- Daily Journal ----------------------------------------------------------
async function viewJournal() {
  const items = await DB.listAll(DB.journalPath(), "createdAt");
  const projOptions = projectsCache.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
  app.innerHTML = `
    <div class="page-head"><h1>Daily Journal</h1></div>
    <form id="journal-form" class="panel form-grid">
      <label class="field"><span>Date</span><input type="date" id="j-date" value="${todayISO()}"/></label>
      <label class="field"><span>Entry</span><textarea id="j-body" rows="4" placeholder="Worked 4 hours. Built the landing page. Got rejected by two communities. Need better messaging."></textarea></label>
      <label class="field"><span>Mention projects (optional)</span><select id="j-projects" multiple size="4">${projOptions}</select></label>
      <div class="form-actions"><button type="submit" class="primary-btn"><i class="ti ti-plus"></i> Save entry</button></div>
    </form>
    <div class="journal-feed">
      ${items.map((it) => `
        <div class="journal-entry">
          <div class="journal-date">${it.date || ""}</div>
          <div class="journal-body">${escapeHtml(it.body)}</div>
          ${(it.projectIds || []).length ? `<div class="journal-tags">${it.projectIds.map((id) => `<span class="tag">${escapeHtml(projectName(id))}</span>`).join("")}</div>` : ""}
        </div>`).join("") || `<div class="empty">No journal entries yet. Write about today above.</div>`}
    </div>
  `;
  document.getElementById("journal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = document.getElementById("j-date").value;
    const body = document.getElementById("j-body").value.trim();
    if (!body) return;
    const projectIds = Array.from(document.getElementById("j-projects").selectedOptions).map((o) => o.value);
    await DB.addItem(DB.journalPath(), { date, body, projectIds });
    await logActivity("Created", "Journal", body.slice(0, 80));
    viewJournal();
  });
}

function projectName(id) {
  const p = projectsCache.find((p) => p.id === id);
  return p ? p.name : "Unknown";
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

// ---- Calendar & Goals ---------------------------------------------------
async function viewCalendar() {
  app.innerHTML = `<div class="page-head"><h1>Calendar &amp; Goals</h1></div><div id="tab-body"><div class="loading">Loading…</div></div>`;
  const body = document.getElementById("tab-body");
  let allDeadlines = [];
  for (const p of projectsCache) {
    const items = await DB.listAll(DB.sectionPath(p.id, "deadlines"), "date");
    items.forEach((it) => allDeadlines.push({ ...it, projectName: p.name }));
  }
  allDeadlines = allDeadlines.filter((d) => d.date).sort((a, b) => a.date.localeCompare(b.date));

  body.innerHTML = `
    <div class="panel">
      <h3>Upcoming deadlines</h3>
      ${allDeadlines.length ? `<table class="data-table"><thead><tr><th>Date</th><th>Title</th><th>Project</th><th></th></tr></thead><tbody>
        ${allDeadlines.map((d) => `<tr><td>${d.date}</td><td>${escapeHtml(d.title)}</td><td>${escapeHtml(d.projectName)}</td>
          <td><a class="ghost-btn small" target="_blank" href="${gcalLink(d)}"><i class="ti ti-calendar-plus"></i> Add to Google Calendar</a></td></tr>`).join("")}
      </tbody></table>` : `<div class="empty">No deadlines yet. Add some from a project's Deadlines tab.</div>`}
    </div>
    <p class="muted small">Note: this creates a one-click pre-filled Google Calendar event. Full two-way sync would need Google OAuth setup - a good phase-2 addition.</p>
  `;
}

function gcalLink(d) {
  const date = (d.date || todayISO()).replace(/-/g, "");
  const text = encodeURIComponent(d.title || "Deadline");
  const details = encodeURIComponent(d.notes || "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${date}/${date}&details=${details}`;
}

// ---- Expenses -----------------------------------------------------------
let expensePeriod = "month"; // week | month | year | all - persists while the tab is open
let trendChartInstance = null;
let categoryChartInstance = null;

async function viewExpenses() {
  app.innerHTML = `
    <div class="page-head"><h1>Expenses</h1></div>
    <div id="expense-insights"></div>
    <div id="tab-body"></div>
  `;
  const insightsEl = document.getElementById("expense-insights");
  const body = document.getElementById("tab-body");

  const refreshInsights = async () => {
    const items = await DB.listAll(DB.expensesPath(), "date");
    renderExpenseInsights(insightsEl, items);
  };

  await refreshInsights();
  return renderSectionTab(body, EXPENSES_SCHEMA, DB.expensesPath(), null, refreshInsights);
}

function periodLabel(p) {
  return { week: "This week", month: "This month", year: "This year", all: "All time" }[p];
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // week starts Monday
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - diff);
  return date;
}

function filterByPeriod(items, period) {
  const dated = items.filter((it) => it.date);
  if (period === "all") return dated;
  const now = new Date();
  if (period === "week") {
    const start = startOfWeek(now);
    const startISO = start.toISOString().slice(0, 10);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const endISO = end.toISOString().slice(0, 10);
    return dated.filter((it) => it.date >= startISO && it.date <= endISO);
  }
  if (period === "month") return dated.filter((it) => it.date.slice(0, 7) === todayISO().slice(0, 7));
  if (period === "year") return dated.filter((it) => it.date.slice(0, 4) === String(now.getFullYear()));
  return dated;
}

function sumAmount(items) {
  return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
}

function expenseLabel(it) {
  return it.category === "Other" && it.categoryOther ? it.categoryOther : (it.category || "Uncategorized");
}

function groupByCategory(items) {
  const map = {};
  items.forEach((it) => {
    const label = expenseLabel(it);
    map[label] = (map[label] || 0) + (Number(it.amount) || 0);
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function trendBuckets(items, period) {
  const now = new Date();
  const byDate = (iso) => sumAmount(items.filter((it) => it.date === iso));

  if (period === "week") {
    const start = startOfWeek(now);
    const labels = [], values = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      labels.push(d.toLocaleDateString("en-IN", { weekday: "short" }));
      values.push(byDate(d.toISOString().slice(0, 10)));
    }
    return { labels, values };
  }
  if (period === "month") {
    const y = now.getFullYear(), m = now.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const labels = [], values = [];
    for (let day = 1; day <= daysInMonth; day++) {
      labels.push(String(day));
      values.push(byDate(`${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`));
    }
    return { labels, values };
  }
  if (period === "year") {
    const y = now.getFullYear();
    const labels = [], values = [];
    for (let m = 0; m < 12; m++) {
      const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;
      labels.push(new Date(y, m, 1).toLocaleDateString("en-IN", { month: "short" }));
      values.push(sumAmount(items.filter((it) => (it.date || "").startsWith(prefix))));
    }
    return { labels, values };
  }
  // all: bucket by every year-month present in the data
  const months = Array.from(new Set(items.map((it) => (it.date || "").slice(0, 7)).filter(Boolean))).sort();
  const labels = months.map((ym) => {
    const [y, m] = ym.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  });
  const values = months.map((ym) => sumAmount(items.filter((it) => (it.date || "").startsWith(ym))));
  return { labels, values };
}

function renderExpenseInsights(el, allItems) {
  const dated = allItems.filter((it) => it.date);
  const filtered = filterByPeriod(dated, expensePeriod);
  const allTimeTotal = sumAmount(dated);
  const periodTotal = sumAmount(filtered);
  const catTotals = groupByCategory(filtered);
  const trend = trendBuckets(filtered, expensePeriod);

  el.innerHTML = `
    <div class="panel expense-insights">
      <div class="period-tabs">
        ${["week", "month", "year", "all"].map((p) => `<button type="button" class="period-tab ${p === expensePeriod ? "active" : ""}" data-period="${p}">${periodLabel(p)}</button>`).join("")}
      </div>
      <div class="expense-summary">
        <div><span class="muted small">${periodLabel(expensePeriod)}</span><strong>${escapeHtml(formatCurrency(periodTotal))}</strong></div>
        <div><span class="muted small">All-time total</span><strong>${escapeHtml(formatCurrency(allTimeTotal))}</strong></div>
        <div><span class="muted small">Entries in period</span><strong>${filtered.length}</strong></div>
      </div>
      ${filtered.length ? `
      <div class="chart-grid">
        <div class="chart-box">
          <span class="muted small">Spending trend</span>
          <div class="chart-canvas-wrap"><canvas id="expense-trend-chart"></canvas></div>
        </div>
        <div class="chart-box">
          <span class="muted small">By category</span>
          <div class="chart-canvas-wrap"><canvas id="expense-category-chart"></canvas></div>
        </div>
      </div>` : `<div class="empty">No expenses in this period yet.</div>`}
    </div>
  `;

  el.querySelectorAll(".period-tab").forEach((btn) => {
    btn.onclick = () => { expensePeriod = btn.dataset.period; renderExpenseInsights(el, allItems); };
  });

  if (!filtered.length || !window.Chart) return;

  const styles = getComputedStyle(document.documentElement);
  const accent = (styles.getPropertyValue("--accent") || "#e08a3e").trim();
  const gridColor = (styles.getPropertyValue("--border") || "#333140").trim();
  const textColor = (styles.getPropertyValue("--text-muted") || "#96938f").trim();
  const palette = ["#e08a3e", "#6fae5a", "#6f9cae", "#c46f8a", "#e0c34e", "#8f6fae", "#d4675a", "#4ea88f"];

  if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }
  const trendCtx = document.getElementById("expense-trend-chart");
  if (trendCtx) {
    trendChartInstance = new Chart(trendCtx, {
      type: "line",
      data: {
        labels: trend.labels,
        datasets: [{
          label: "Spend", data: trend.values, borderColor: accent,
          backgroundColor: `${accent}33`, fill: true, tension: 0.3, pointRadius: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, callback: (v) => `₹${v}` } },
        },
      },
    });
  }

  if (categoryChartInstance) { categoryChartInstance.destroy(); categoryChartInstance = null; }
  const catCtx = document.getElementById("expense-category-chart");
  if (catCtx) {
    categoryChartInstance = new Chart(catCtx, {
      type: "doughnut",
      data: {
        labels: catTotals.map(([k]) => k),
        datasets: [{ data: catTotals.map(([, v]) => v), backgroundColor: palette }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: textColor, font: { size: 10 }, boxWidth: 10 } } },
      },
    });
  }
}

// ---- Timeline (computed, git-log style) ---------------------------------
async function viewTimeline() {
  const body = pageHeadEl("Timeline");
  return renderTimelineTab(body, null, null);
}

function pageHeadEl(title) {
  app.innerHTML = `<div class="page-head"><h1>${title}</h1></div><div id="tab-body"></div>`;
  return document.getElementById("tab-body");
}

async function renderTimelineTab(body, projectId, projectName) {
  body.innerHTML = `<div class="panel"><div class="loading">Loading…</div></div>`;
  const dated = PROJECT_SECTIONS.filter((s) => s.dateField);
  const targets = projectId ? [{ id: projectId, name: projectName }] : projectsCache;
  const events = [];
  for (const p of targets) {
    for (const s of dated) {
      const items = await DB.listAll(DB.sectionPath(p.id, s.key));
      items.forEach((it) => {
        const date = it[s.dateField];
        if (!date) return;
        events.push({ date, project: p.name, section: s.label, summary: summarize(s, it) });
      });
    }
    const journal = await DB.listAll(DB.journalPath());
    journal.filter((j) => (j.projectIds || []).includes(p.id)).forEach((j) => {
      events.push({ date: j.date, project: p.name, section: "Journal", summary: j.body.slice(0, 80) });
    });
  }
  events.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  body.innerHTML = `
    <div class="panel timeline-panel">
      ${events.length ? `<div class="git-log">
        ${events.map((e) => `
          <div class="git-log-entry">
            <div class="git-log-date">${e.date}</div>
            <div class="git-log-dot"></div>
            <div class="git-log-content">
              <span class="tag">${e.section}</span> ${escapeHtml(e.summary)}
              ${projectId ? "" : `<span class="muted"> · ${escapeHtml(e.project)}</span>`}
            </div>
          </div>`).join("")}
      </div>` : `<div class="empty">No dated events yet. As you add deadlines, experiments, lessons, decisions, and journal entries, they'll appear here in order.</div>`}
    </div>
  `;
}

function summarize(section, item) {
  const primary = section.fields.find((f) => f.type === "text") || section.fields[0];
  return item[primary.id] || section.label;
}

// ---- Activity Log (git-log style, records every create/update/delete) ----
async function viewLog() {
  const body = pageHeadEl("Activity Log");
  body.innerHTML = `<div class="panel"><div class="loading">Loading…</div></div>`;
  const items = await DB.listAll(DB.logPath(), "createdAt");
  body.innerHTML = `
    <div class="panel">
      ${items.length ? `<div class="git-log">
        ${items.map((e) => `
          <div class="git-log-entry">
            <div class="git-log-date">${formatLogTime(e.createdAt)}</div>
            <div class="git-log-dot log-dot-${(e.action || "").toLowerCase()}"></div>
            <div class="git-log-content">
              <span class="tag log-tag-${(e.action || "").toLowerCase()}">${escapeHtml(e.action || "")}</span>
              <span class="log-section">${escapeHtml(e.section || "")}</span>
              ${e.summary ? ` — ${escapeHtml(e.summary)}` : ""}
              ${e.project ? `<span class="muted"> · ${escapeHtml(e.project)}</span>` : ""}
            </div>
          </div>`).join("")}
      </div>` : `<div class="empty">No activity yet. Every entry you create, edit, or delete anywhere in the app shows up here.</div>`}
    </div>
  `;
}

function formatLogTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ---- Dashboard ------------------------------------------------------------
async function viewDashboard() {
  app.innerHTML = `<div class="page-head"><h1>Dashboard</h1></div><div id="tab-body"><div class="loading">Loading…</div></div>`;
  const body = document.getElementById("tab-body");

  const active = projectsCache.filter((p) => p.status === "Active");
  const planning = projectsCache.filter((p) => p.status === "Planning");
  const archived = projectsCache.filter((p) => p.status === "Archived");
  const focus = active[0] || projectsCache[0];

  let todaysGoals = [];
  if (focus) {
    const goals = await DB.listAll(DB.sectionPath(focus.id, "goals"));
    todaysGoals = goals.filter((g) => g.type === "Today" && !g.done);
  }

  let upcoming = [];
  for (const p of projectsCache) {
    const items = await DB.listAll(DB.sectionPath(p.id, "deadlines"));
    items.forEach((it) => it.date && upcoming.push({ ...it, projectName: p.name }));
  }
  upcoming = upcoming.filter((d) => d.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

  const streaks = await DB.listAll(DB.streaksPath());

  body.innerHTML = `
    <div class="dash-grid">
      <div class="panel dash-focus">
        <h3><i class="ti ti-flame"></i> Current focus</h3>
        <p class="focus-name">${focus ? escapeHtml(focus.name) : "No projects yet"}</p>
      </div>
      <div class="panel">
        <h3>Today's goals</h3>
        ${todaysGoals.length ? `<ul class="check-list">${todaysGoals.map((g) => `<li>${escapeHtml(g.text)}</li>`).join("")}</ul>` : `<div class="empty">No "Today" goals set for the focus project.</div>`}
      </div>
      <div class="panel">
        <h3>Upcoming</h3>
        ${upcoming.length ? `<ul class="upcoming-list">${upcoming.map((u) => `<li><span class="tag">${u.date}</span> ${escapeHtml(u.title)} <span class="muted">· ${escapeHtml(u.projectName)}</span></li>`).join("")}</ul>` : `<div class="empty">Nothing upcoming.</div>`}
      </div>
      <div class="panel">
        <h3>Streaks</h3>
        <div class="streak-row">
          ${streaks.map((s) => `<div class="streak-pill"><span>${escapeHtml(s.name)}</span><strong>${s.count || 0}d</strong></div>`).join("")}
        </div>
        <form id="streak-form" class="inline-form">
          <input type="text" id="streak-name" placeholder="New streak (e.g. Coding)"/>
          <button type="submit" class="ghost-btn small"><i class="ti ti-plus"></i></button>
        </form>
      </div>
      <div class="panel">
        <h3>Projects</h3>
        <div class="status-counts">
          <div><span class="status-dot status-active"></span> Active <strong>${active.length}</strong></div>
          <div><span class="status-dot status-planning"></span> Planning <strong>${planning.length}</strong></div>
          <div><span class="status-dot status-archived"></span> Archived <strong>${archived.length}</strong></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("streak-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("streak-name").value.trim();
    if (!name) return;
    await DB.addItem(DB.streaksPath(), { name, count: 0, lastDate: null });
    viewDashboard();
  });
  body.querySelectorAll(".streak-pill").forEach((el, i) => {
    el.style.cursor = "pointer";
    el.title = "Click to check in for today";
    el.addEventListener("click", async () => {
      const s = streaks[i];
      const today = todayISO();
      if (s.lastDate === today) return;
      await DB.updateItem(DB.streaksPath(), s.id, { count: (s.count || 0) + 1, lastDate: today });
      viewDashboard();
    });
  });
}