(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        const panel = document.getElementById("product-attribute-fields");
        const categorySelect = document.getElementById("id_category");
        const payloadInput = document.getElementById("id_attribute_values_payload");
        const inputsContainer = document.getElementById("product-attribute-inputs");

        if (!panel || !categorySelect || !payloadInput || !inputsContainer) {
            return;
        }

        const endpoint = panel.dataset.url;
        const productId = panel.dataset.productId;
        let requestNumber = 0;

        function currentInputValues() {
            const values = {};
            inputsContainer.querySelectorAll("[data-attribute-id]").forEach(function (input) {
                values[input.dataset.attributeId] = input.value;
            });
            return values;
        }

        function syncPayload() {
            const payload = [];
            inputsContainer.querySelectorAll("[data-attribute-id]").forEach(function (input) {
                payload.push({
                    attribute_id: Number(input.dataset.attributeId),
                    value: input.value
                });
            });
            payloadInput.value = JSON.stringify(payload);
        }

        function renderAttributes(attributes, unsavedValues) {
            inputsContainer.replaceChildren();

            if (!attributes.length) {
                const message = document.createElement("p");
                message.className = "help";
                message.textContent = "برای دسته‌بندی‌های انتخاب‌شده ویژگی تعریف نشده است.";
                inputsContainer.appendChild(message);
                syncPayload();
                return;
            }

            attributes.forEach(function (attribute) {
                const row = document.createElement("div");
                row.className = "form-row";

                const label = document.createElement("label");
                label.htmlFor = "id_product_attribute_" + attribute.id;
                label.textContent = attribute.title;

                const input = document.createElement("input");
                input.type = "text";
                input.id = label.htmlFor;
                input.className = "vTextField";
                input.maxLength = 300;
                input.autocomplete = "off";
                input.dataset.attributeId = String(attribute.id);
                input.value = Object.prototype.hasOwnProperty.call(unsavedValues, String(attribute.id))
                    ? unsavedValues[String(attribute.id)]
                    : (attribute.value || "");

                input.addEventListener("input", syncPayload);
                row.appendChild(label);
                row.appendChild(input);
                inputsContainer.appendChild(row);
            });

            syncPayload();
        }

        async function loadAttributes() {
            const unsavedValues = currentInputValues();
            const thisRequest = ++requestNumber;
            const params = new URLSearchParams();

            Array.from(categorySelect.selectedOptions).forEach(function (option) {
                if (option.value) {
                    params.append("category_ids", option.value);
                }
            });
            if (productId) {
                params.set("product_id", productId);
            }

            if (!params.has("category_ids")) {
                renderAttributes([], {});
                return;
            }

            inputsContainer.textContent = "در حال بارگذاری ویژگی‌ها…";
            try {
                const response = await fetch(endpoint + "?" + params.toString(), {
                    headers: { "X-Requested-With": "XMLHttpRequest" },
                    credentials: "same-origin"
                });
                if (!response.ok) {
                    throw new Error("Could not load product attributes");
                }
                const data = await response.json();
                if (thisRequest !== requestNumber) {
                    return;
                }
                renderAttributes(data.attributes || [], unsavedValues);
            } catch (error) {
                if (thisRequest !== requestNumber) {
                    return;
                }
                inputsContainer.textContent = "بارگذاری ویژگی‌ها ناموفق بود. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.";
                payloadInput.value = "";
            }
        }

        if (window.django && django.jQuery) {
            django.jQuery(categorySelect).on("change.productAttributes", loadAttributes);
        } else {
            categorySelect.addEventListener("change", loadAttributes);
        }

        const form = categorySelect.closest("form");
        if (form) {
            form.addEventListener("submit", syncPayload);
        }

        loadAttributes();
    });
})();
