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

  function variantSelects() {
    return Array.from(document.querySelectorAll('select[id$="-attributes_to"]'));
  }

  function selectedValueIds(select) {
    return Array.from(select.options).filter((option) => option.selected && option.value).map((option) => String(option.value));
  }

  function allOptionsFor(select) {
    const from = document.getElementById(select.id.replace(/-to$/, "-from"));
    const options = [...Array.from(select.options)];
    if (from) options.push(...Array.from(from.options));
    return options.filter((option) => option.value);
  }

  function syncVariantSelect(select, chosenIds) {
    const from = document.getElementById(select.id.replace(/-to$/, "-from"));
    const all = allOptionsFor(select);
    const wanted = new Set(chosenIds.map(String));
    [select, from].filter(Boolean).forEach((side) => {
      Array.from(side.options).forEach((option) => { option.selected = wanted.has(String(option.value)); });
    });
    if (from) {
      const chosen = all.filter((option) => wanted.has(String(option.value)));
      chosen.forEach((option) => {
        if (!Array.from(select.options).some((item) => item.value === option.value)) {
          select.add(new Option(option.text, option.value));
        }
      });
      Array.from(select.options).forEach((option) => { option.selected = wanted.has(String(option.value)); });
      Array.from(from.options).forEach((option) => { option.selected = !wanted.has(String(option.value)); });
    }
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function renderVariantInputs(select) {
    const selector = select.closest(".selector");
    if (!selector || !currentData.attributes.length) {
      const old = document.getElementById(select.id + "-dynamic-attributes");
      if (old) old.remove();
      return;
    }

    selector.style.display = "none";
    let panel = document.getElementById(select.id + "-dynamic-attributes");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = select.id + "-dynamic-attributes";
      panel.className = "dynamic-variant-attributes";
      panel.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:10px 0;padding:12px;border:1px solid #ddd;border-radius:6px;";
      selector.parentNode.insertBefore(panel, selector.nextSibling);
    }

    const options = allOptionsFor(select);
    const selected = selectedValueIds(select);
    const selectedByAttribute = new Map();
    options.filter((option) => selected.includes(String(option.value))).forEach((option) => {
      const item = currentData.values.find((value) => String(value.id) === String(option.value));
      if (item) selectedByAttribute.set(String(item.attribute_id), String(item.id));
    });

    panel.replaceChildren();
    currentData.attributes.forEach((attribute) => {
      const wrapper = document.createElement("div");
      const label = document.createElement("label");
      label.textContent = attribute.title;
      label.style.cssText = "display:block;font-weight:600;margin-bottom:5px;";
      const input = document.createElement("select");
      input.className = "dynamic-variant-attribute";
      input.style.cssText = "width:100%;max-width:100%;";
      input.dataset.attributeId = String(attribute.id);
      input.add(new Option("---------", ""));
      currentData.values.filter((value) => String(value.attribute_id) === String(attribute.id)).forEach((value) => {
        input.add(new Option(value.value, String(value.id)));
      });
      input.value = selectedByAttribute.get(String(attribute.id)) || "";
      input.addEventListener("change", () => {
        const chosen = new Map();
        panel.querySelectorAll("select.dynamic-variant-attribute").forEach((field) => {
          if (field.value) chosen.set(field.dataset.attributeId, field.value);
        });
        syncVariantSelect(select, Array.from(chosen.values()));
      });
      const add = document.createElement("button");
      add.type = "button";
      add.textContent = "+ مقدار جدید";
      add.style.cssText = "display:block;margin-top:5px;";
      add.addEventListener("click", async () => {
        const value = window.prompt("مقدار جدید برای «" + attribute.title + "»:");
        if (!value?.trim()) return;
        const response = await fetch(createUrl, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() },
          body: JSON.stringify({
            attribute_id: Number(attribute.id),
            value: value.trim(),
            category_ids: selectedCategories().map(Number)
          })
        });
        const result = await response.json();
        if (!response.ok) {
          window.alert(result.error || "ساخت مقدار ویژگی ناموفق بود.");
          return;
        }
        await refreshValues();
        const refreshed = panel.querySelector('select[data-attribute-id="' + attribute.id + '"]');
        if (refreshed) {
          refreshed.value = String(result.id);
          refreshed.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      wrapper.append(label, input, add);
      panel.append(wrapper);
    });
  }

  async function refreshValues() {
    const ids = selectedCategories();
    const url = new URL(valuesUrl, window.location.origin);
    ids.forEach((id) => url.searchParams.append("category_ids", id));
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) return;
    currentData = await response.json();

    const allowed = new Set(currentData.values.map((value) => String(value.id)));
    variantSelects().forEach((select) => {
      const from = document.getElementById(select.id.replace(/-to$/, "-from"));
      [select, from].filter(Boolean).forEach((side) => {
        Array.from(side.options).forEach((option) => {
          if (option.value) option.hidden = !allowed.has(String(option.value)) && !option.selected;
        });
      });
      renderVariantInputs(select);
    });
  }

  [categoryFrom, categoryTo, fallbackCategory].filter(Boolean).forEach((element) => {
    element.addEventListener("change", () => window.setTimeout(refreshValues, 0));
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".selector-available .selector-chosen, .selector-available .selector-add, .selector-chosen .selector-removed, .selector-chosen .selector-clear")) {
      window.setTimeout(refreshValues, 80);
    }
  });

  const observer = new MutationObserver(() => {
    variantSelects().forEach((select) => {
      if (!document.getElementById(select.id + "-dynamic-attributes")) renderVariantInputs(select);
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  refreshValues();
})();