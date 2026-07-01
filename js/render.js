// Turns a field schema into form markup and list/table markup. Nothing here
// knows what "goals" or "lessons" are - it just reads field definitions.

// ---- Currency (INR) --------------------------------------------------
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
});
export function formatCurrency(n) {
  const num = Number(n) || 0;
  return inrFormatter.format(num);
}

export function renderFormFields(fields, existing = {}) {
  return fields.map((f) => {
    const val = existing[f.id] ?? "";
    const id = `f_${f.id}`;
    const showIfAttrs = f.showIf
      ? ` data-show-if-field="${f.showIf.field}" data-show-if-equals="${escapeHtml(f.showIf.equals)}"`
      : "";
    const isHiddenInitially = f.showIf && existing[f.showIf.field] !== f.showIf.equals;
    const hiddenClass = isHiddenInitially ? " hidden" : "";

    if (f.type === "textarea") {
      return `<label class="field${hiddenClass}"${showIfAttrs}><span>${f.label}</span><textarea id="${id}" data-field="${f.id}" rows="3">${escapeHtml(val)}</textarea></label>`;
    }
    if (f.type === "select") {
      const opts = f.options.map((o) => `<option value="${o}" ${o === val ? "selected" : ""}>${o}</option>`).join("");
      return `<label class="field${hiddenClass}"${showIfAttrs}><span>${f.label}</span><select id="${id}" data-field="${f.id}">${opts}</select></label>`;
    }
    if (f.type === "checkbox") {
      return `<label class="field field-inline${hiddenClass}"${showIfAttrs}><input type="checkbox" id="${id}" data-field="${f.id}" ${val ? "checked" : ""}/><span>${f.label}</span></label>`;
    }
    if (f.type === "number") {
      return `<label class="field${hiddenClass}"${showIfAttrs}><span>${f.label}</span><input type="number" id="${id}" data-field="${f.id}" value="${escapeHtml(val)}"/></label>`;
    }
    if (f.type === "currency") {
      return `<label class="field${hiddenClass}"${showIfAttrs}><span>${f.label}</span><div class="currency-input"><span class="currency-prefix">₹</span><input type="number" step="0.01" id="${id}" data-field="${f.id}" value="${escapeHtml(val)}"/></div></label>`;
    }
    if (f.type === "date") {
      return `<label class="field${hiddenClass}"${showIfAttrs}><span>${f.label}</span><input type="date" id="${id}" data-field="${f.id}" value="${escapeHtml(val)}"/></label>`;
    }
    return `<label class="field${hiddenClass}"${showIfAttrs}><span>${f.label}</span><input type="text" id="${id}" data-field="${f.id}" value="${escapeHtml(val)}"/></label>`;
  }).join("");
}

// Wires up show/hide behaviour for fields with a `showIf: { field, equals }`
// schema entry (e.g. a "Custom category" text box that only appears when
// Category === "Other"). Call this once after inserting form markup into
// the DOM - works for both the inline add-form and the edit dialog.
export function wireConditionalFields(formEl) {
  const conditional = formEl.querySelectorAll("[data-show-if-field]");
  if (!conditional.length) return;
  conditional.forEach((el) => {
    const triggerField = el.dataset.showIfField;
    const expected = el.dataset.showIfEquals;
    const trigger = formEl.querySelector(`[data-field="${triggerField}"]`);
    if (!trigger) return;
    const sync = () => el.classList.toggle("hidden", trigger.value !== expected);
    trigger.addEventListener("change", sync);
    sync();
  });
}

export function readForm(fields, formEl) {
  const data = {};
  fields.forEach((f) => {
    const el = formEl.querySelector(`[data-field="${f.id}"]`);
    if (!el) return;
    if (f.type === "checkbox") data[f.id] = el.checked;
    else if (f.type === "number" || f.type === "currency") data[f.id] = el.value === "" ? null : Number(el.value);
    else data[f.id] = el.value;
  });
  return data;
}

// A compact table: first two non-textarea fields as columns, rest hidden behind "expand"
export function renderList(fields, items, opts = {}) {
  if (!items.length) {
    return `<div class="empty">Nothing here yet. Add your first entry above.</div>`;
  }
  const cols = fields.filter((f) => f.type !== "textarea").slice(0, 4);
  const head = cols.map((c) => `<th>${c.label}</th>`).join("") + `<th></th>`;
  const rows = items.map((item) => {
    const cells = cols.map((c) => {
      if (c.type === "checkbox") {
        return `<td><input type="checkbox" data-toggle="${item.id}" data-field="${c.id}" ${item[c.id] ? "checked" : ""}/></td>`;
      }
      const v = item[c.id];
      if (v == null || v === "") return `<td><span class="muted">-</span></td>`;
      if (c.type === "currency") return `<td>${escapeHtml(formatCurrency(v))}</td>`;
      return `<td>${escapeHtml(String(v))}</td>`;
    }).join("");
    return `<tr data-id="${item.id}">
      ${cells}
      <td class="row-actions">
        <button class="icon-btn" data-edit="${item.id}" aria-label="Edit"><i class="ti ti-edit"></i></button>
        <button class="icon-btn" data-delete="${item.id}" aria-label="Delete"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`;
  }).join("");
  return `<table class="data-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

// A corkboard of sticky notes - used for sections marked layout:"notes"
// (Ideas, Knowledge Vault). Reuses the same data-edit/data-delete attributes
// as renderList so the existing event wiring works unchanged.
export function renderNotesGrid(fields, items) {
  if (!items.length) {
    return `<div class="empty">Nothing here yet. Add your first note above.</div>`;
  }
  const titleField = fields.find((f) => f.type === "text") || fields[0];
  const bodyField = fields.find((f) => f.type === "textarea");
  return `<div class="note-grid">${items.map((item) => `
    <div class="sticky-note" data-id="${item.id}">
      <div class="sticky-note-actions">
        <button class="icon-btn" data-edit="${item.id}" aria-label="Edit"><i class="ti ti-edit"></i></button>
        <button class="icon-btn" data-delete="${item.id}" aria-label="Delete"><i class="ti ti-trash"></i></button>
      </div>
      <div class="sticky-note-title">${escapeHtml(item[titleField.id] || "Untitled")}</div>
      ${bodyField && item[bodyField.id] ? `<div class="sticky-note-body">${escapeHtml(item[bodyField.id])}</div>` : ""}
      ${item.tags ? `<div class="sticky-note-tags">${String(item.tags).split(",").filter(Boolean).map((t) => `<span class="tag">${escapeHtml(t.trim())}</span>`).join("")}</div>` : ""}
    </div>`).join("")}</div>`;
}

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
