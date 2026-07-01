// Every section is defined once here. The generic renderer (render.js) reads
// this to build forms and lists automatically - add a field here and it
// shows up everywhere, no other file needs to change.

export const STAGES = ["Idea", "Validation", "MVP", "Launch", "Growth", "Retrospective"];
export const STATUSES = ["Active", "Planning", "Archived"];

// Sections that live inside a single project, e.g. users/{uid}/projects/{id}/sections/{key}/items
export const PROJECT_SECTIONS = [
  {
    key: "goals", label: "Goals", icon: "ti-target", dateField: null,
    fields: [
      { id: "type", label: "Type", type: "select", options: ["Long-term", "Monthly", "Weekly", "Today"] },
      { id: "text", label: "Goal", type: "text" },
      { id: "done", label: "Done", type: "checkbox" },
    ],
  },
  {
    key: "deadlines", label: "Deadlines", icon: "ti-calendar", dateField: "date",
    fields: [
      { id: "title", label: "Title", type: "text" },
      { id: "date", label: "Date", type: "date" },
      { id: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "roadmap", label: "Roadmap", icon: "ti-route", dateField: "date",
    fields: [
      { id: "title", label: "Item", type: "text" },
      { id: "status", label: "Status", type: "select", options: ["Planned", "In progress", "Done"] },
      { id: "date", label: "Target date", type: "date" },
    ],
  },
  {
    key: "tasks", label: "Tasks", icon: "ti-checkbox", dateField: "due",
    fields: [
      { id: "title", label: "Task", type: "text" },
      { id: "due", label: "Due", type: "date" },
      { id: "done", label: "Done", type: "checkbox" },
    ],
  },
  {
    key: "ideas", label: "Ideas", icon: "ti-bulb", dateField: null, layout: "notes",
    fields: [
      { id: "title", label: "Idea", type: "text" },
      { id: "notes", label: "Notes", type: "textarea" },
      { id: "tags", label: "Tags", type: "text" },
    ],
  },
  {
    key: "experiments", label: "Experiments", icon: "ti-flask", dateField: "date",
    fields: [
      { id: "title", label: "Experiment", type: "text" },
      { id: "date", label: "Date", type: "date" },
      { id: "hypothesis", label: "Hypothesis", type: "textarea" },
      { id: "method", label: "Method", type: "textarea" },
      { id: "expected", label: "Expected result", type: "textarea" },
      { id: "actual", label: "Actual result", type: "textarea" },
      { id: "conclusion", label: "Conclusion", type: "textarea" },
      { id: "nextStep", label: "Next step", type: "textarea" },
    ],
  },
  {
    key: "research", label: "Research", icon: "ti-search", dateField: null,
    fields: [
      { id: "title", label: "Title", type: "text" },
      { id: "type", label: "Type", type: "select", options: ["Competitor", "Video", "Article", "Tweet", "Reddit", "Idea"] },
      { id: "url", label: "URL", type: "text" },
      { id: "notes", label: "Notes", type: "textarea" },
      { id: "tags", label: "Tags", type: "text" },
    ],
  },
  {
    key: "users", label: "Users", icon: "ti-users", dateField: null,
    fields: [
      { id: "name", label: "Name", type: "text" },
      { id: "contact", label: "Contact", type: "text" },
      { id: "status", label: "Status", type: "select", options: ["Prospect", "Tester", "Customer", "Churned"] },
      { id: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "notes", label: "Meetings / Notes", icon: "ti-notes", dateField: "date",
    fields: [
      { id: "title", label: "Title", type: "text" },
      { id: "date", label: "Date", type: "date" },
      { id: "body", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "documents", label: "Documents", icon: "ti-file", dateField: null,
    fields: [
      { id: "title", label: "Title", type: "text" },
      { id: "type", label: "Type", type: "select", options: ["PDF", "Wireframe", "Image", "Logo", "Video", "Landing page"] },
      { id: "url", label: "URL / link", type: "text" },
      { id: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "lessons", label: "Lessons Learned", icon: "ti-school", dateField: "date",
    fields: [
      { id: "date", label: "Date", type: "date" },
      { id: "mistake", label: "Mistake", type: "text" },
      { id: "why", label: "Why it happened", type: "textarea" },
      { id: "avoid", label: "How to avoid it", type: "textarea" },
      { id: "tags", label: "Tags", type: "text" },
    ],
  },
  {
    key: "metrics", label: "Metrics", icon: "ti-chart-bar", dateField: "date",
    fields: [
      { id: "date", label: "Date", type: "date" },
      { id: "visitors", label: "Visitors", type: "number" },
      { id: "signups", label: "Signups", type: "number" },
      { id: "revenue", label: "Revenue", type: "currency" },
      { id: "users", label: "Users", type: "number" },
      { id: "returningUsers", label: "Returning users", type: "number" },
      { id: "expenses", label: "Expenses", type: "currency" },
    ],
  },
  {
    key: "decisions", label: "Decision Log", icon: "ti-gavel", dateField: "date",
    fields: [
      { id: "date", label: "Date", type: "date" },
      { id: "decision", label: "Decision", type: "text" },
      { id: "reason", label: "Reason", type: "textarea" },
      { id: "expected", label: "Expected outcome", type: "textarea" },
      { id: "result", label: "Result", type: "text" },
    ],
  },
];

// Groups sections into fewer top-level tabs so a project isn't 12 flat tabs
// wide. Purely a nav/presentation grouping - the underlying Firestore paths
// (users/{uid}/projects/{id}/sections/{key}/items) are untouched, so no data
// migration is needed and nothing here is a breaking change. Any section key
// not listed in a cluster just stays as its own standalone tab.
export const PROJECT_CLUSTERS = [
  {
    key: "planning", label: "Planning", icon: "ti-route",
    sections: ["goals", "deadlines", "roadmap", "tasks"],
  },
  {
    key: "ideas", label: "Ideas & Research", icon: "ti-bulb",
    sections: ["ideas", "research", "documents"],
  },
  {
    key: "people", label: "People & Notes", icon: "ti-users",
    sections: ["users", "notes"],
  },
  {
    key: "retro", label: "Retrospective", icon: "ti-school",
    sections: ["lessons", "decisions"],
  },
];

// Global (not project-scoped) collections
export const KNOWLEDGE_SCHEMA = {
  key: "knowledge", label: "Knowledge Vault", dateField: null, layout: "notes",
  fields: [
    { id: "title", label: "Title", type: "text" },
    { id: "category", label: "Category", type: "select", options: ["CTR", "Firebase", "Marketing", "SEO", "Prompt Engineering", "Other"] },
    { id: "body", label: "Notes", type: "textarea" },
    { id: "tags", label: "Tags", type: "text" },
  ],
};

export const PLAYBOOK_SCHEMA = {
  key: "playbook", label: "Startup Playbook", dateField: null,
  fields: [
    { id: "title", label: "Title", type: "text" },
    { id: "category", label: "Category", type: "text" },
    { id: "body", label: "Playbook entry", type: "textarea" },
  ],
};

export const EXPENSES_SCHEMA = {
  key: "expenses", label: "Expenses", dateField: "date",
  fields: [
    { id: "date", label: "Date", type: "date" },
    { id: "category", label: "Category", type: "select", options: ["Food", "Groceries", "Rent", "Bills & Utilities", "Transport", "Shopping", "Health", "Entertainment", "Hosting", "Tools & software", "Marketing", "Assets", "Contractors", "Other"] },
    { id: "categoryOther", label: "Custom category", type: "text", showIf: { field: "category", equals: "Other" } },
    { id: "amount", label: "Amount", type: "currency" },
    { id: "project", label: "Project (optional)", type: "text" },
    { id: "notes", label: "Notes", type: "text" },
  ],
};

export const OVERVIEW_FIELDS = [
  { id: "name", label: "Name", type: "text" },
  { id: "description", label: "Description", type: "textarea" },
  { id: "stage", label: "Current stage", type: "select", options: STAGES },
  { id: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High"] },
  { id: "revenue", label: "Revenue", type: "currency" },
  { id: "status", label: "Status", type: "select", options: STATUSES },
];