(function () {
  const categorySelect = document.getElementById("id_category");
  if (!categorySelect) return;
  const valuesUrl = "/admin/product_module/product/category-attribute-values/";
  const createUrl = "/admin/product_module/product/create-attribute-value/";
  const csrf = () => document.cookie.split("; ").find((v) => v.startsWith("csrftoken="))?.split("=")[1] || "";

  async function refreshValues() {
    const ids = Array.from(categorySelect.selectedOptions).map((o) => o.value);
    const url = new URL(valuesUrl, window.location.origin);
    ids.forEach((id) => url.searchParams.append("category_ids", id));
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) return;
    const data = await response.json();
    const allowed = new Set(data.values.map((v) => String(v.id)));
    document.querySelectorAll('select[id$="-attributes_from"], select[id$="-attributes_to"]').forEach((select) => {
      Array.from(select.options).forEach((option) => {
        if (option.selected || allowed.has(option.value)) option.hidden = false;
        else option.hidden = true;
      });
    });
    let action = document.getElementById("add-attribute-value-inline");
    if (!action) {
      action = document.createElement("button");
      action.id = "add-attribute-value-inline";
      action.type = "button";
      action.textContent = "افزودن مقدار ویژگی جدید";
      action.style.margin = "8px 0";
      categorySelect.closest(".form-row")?.after(action);
      action.addEventListener("click", async () => {
        const attributes = data.attributes || [];
        if (!attributes.length) { window.alert("ابتدا دسته‌بندی و ویژگی‌های آن را تنظیم کنید."); return; }
        const chosen = window.prompt("شناسه ویژگی را وارد کنید:\n" + attributes.map((a) => a.id + " - " + a.title).join("\n"));
        if (!chosen || !attributes.some((a) => String(a.id) === chosen.trim())) return;
        const value = window.prompt("مقدار جدید ویژگی:");
        if (!value?.trim()) return;
        const res = await fetch(createUrl, {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() },
          body: JSON.stringify({ attribute_id: Number(chosen), value: value.trim() })
        });
        const result = await res.json();
        if (!res.ok) { window.alert(result.error || "ساخت مقدار ویژگی ناموفق بود."); return; }
        document.querySelectorAll('select[id$="-attributes_from"]').forEach((select) => {
          const option = new Option(result.label, result.id);
          select.add(option);
        });
        window.alert("مقدار ساخته شد. آن را از فهرست مقادیر موجود به انتخاب‌شده منتقل کنید.");
        refreshValues();
      });
    }
  }
  categorySelect.addEventListener("change", refreshValues);
  refreshValues();
})();
