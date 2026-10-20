(function () {
  const categoryFrom = document.getElementById("id_category_from");
  const categoryTo = document.getElementById("id_category_to");
  const fallbackCategory = document.getElementById("id_category");
  if (!categoryFrom && !categoryTo && !fallbackCategory) return;

  const valuesUrl = "/admin/product_module/product/category-attribute-values/";
  const createUrl = "/admin/product_module/product/create-attribute-value/";
  const csrf = () => document.cookie.split("; ").find((v) => v.startsWith("csrftoken="))?.split("=")[1] || "";
  let currentData = { attributes: [], values: [] };

  function selectedCategories() {
    const selected = categoryTo
      ? Array.from(categoryTo.options).map((o) => o.value)
      : fallbackCategory
        ? Array.from(fallbackCategory.selectedOptions).map((o) => o.value)
        : [];
    return selected.filter(Boolean);
  }

  async function refreshValues() {
    const ids = selectedCategories();
    const url = new URL(valuesUrl, window.location.origin);
    ids.forEach((id) => url.searchParams.append("category_ids", id));
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) return;
    currentData = await response.json();
    const allowed = new Set(currentData.values.map((v) => String(v.id)));

    document.querySelectorAll('select[id$="-attributes_from"], select[id$="-attributes_to"]').forEach((select) => {
      Array.from(select.options).forEach((option) => {
        option.hidden = Boolean(option.value && !allowed.has(option.value) && !option.selected);
      });
    });

    let action = document.getElementById("add-attribute-value-inline");
    if (!action) {
      action = document.createElement("button");
      action.id = "add-attribute-value-inline";
      action.type = "button";
      action.textContent = "افزودن مقدار ویژگی جدید";
      action.style.margin = "8px 0";
      (categoryTo?.closest(".form-row") || fallbackCategory?.closest(".form-row") || categoryFrom?.closest(".form-row"))?.after(action);
      action.addEventListener("click", async () => {
        const attributes = currentData.attributes || [];
        if (!attributes.length) {
          window.alert("برای دسته‌بندی انتخاب‌شده ویژگی تعریف نشده است. ابتدا از بخش ویژگی‌های دسته‌بندی، ویژگی اضافه کنید.");
          return;
        }
        const chosen = window.prompt("شناسه ویژگی موردنظر را وارد کنید:\n" + attributes.map((a) => a.id + " - " + a.title).join("\n"));
        if (!chosen || !attributes.some((a) => String(a.id) === chosen.trim())) return;
        const value = window.prompt("مقدار جدید ویژگی:");
        if (!value?.trim()) return;
        const res = await fetch(createUrl, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() },
          body: JSON.stringify({
            attribute_id: Number(chosen),
            value: value.trim(),
            category_ids: selectedCategories().map(Number)
          })
        });
        const result = await res.json();
        if (!res.ok) {
          window.alert(result.error || "ساخت مقدار ویژگی ناموفق بود.");
          return;
        }
        document.querySelectorAll('select[id$="-attributes_to"]').forEach((select) => {
          const option = new Option(result.label, result.id, true, true);
          select.add(option);
          select.dispatchEvent(new Event("change", { bubbles: true }));
        });
        await refreshValues();
        window.alert("مقدار ویژگی ساخته شد و به فهرست انتخاب اضافه شد.");
      });
    }
  }

  [categoryFrom, categoryTo, fallbackCategory].filter(Boolean).forEach((el) => {
    el.addEventListener("change", () => window.setTimeout(refreshValues, 0));
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".selector-available .selector-chosen, .selector-available .selector-add, .selector-chosen .selector-removed, .selector-chosen .selector-clear")) {
      window.setTimeout(refreshValues, 80);
    }
  });
  refreshValues();
})();
