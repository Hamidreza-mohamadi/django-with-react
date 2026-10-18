import json

from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.urls import path, reverse

from . import models


class ProductAdminForm(forms.ModelForm):
    attribute_values_payload = forms.CharField(
        required=False,
        widget=forms.HiddenInput,
        label="مقادیر ویژگی‌های محصول",
    )

    class Meta:
        model = models.Product
        exclude = ("attributes",)

    def clean(self):
        cleaned_data = super().clean()
        raw_payload = cleaned_data.get("attribute_values_payload", "")
        if not raw_payload:
            # Allows the rest of the product form to work if JavaScript is disabled.
            cleaned_data["parsed_attribute_values"] = None
            return cleaned_data

        try:
            payload = json.loads(raw_payload)
        except (TypeError, ValueError):
            self.add_error(
                "attribute_values_payload",
                "داده‌های ویژگی‌ها معتبر نیستند؛ صفحه را تازه‌سازی و دوباره تلاش کنید.",
            )
            return cleaned_data

        if not isinstance(payload, list):
            self.add_error("attribute_values_payload", "ساختار ویژگی‌ها معتبر نیست.")
            return cleaned_data

        categories = cleaned_data.get("category")
        if categories is None:
            categories = self.instance.category.all()
        allowed_attribute_ids = set(
            models.Category.objects.filter(pk__in=categories)
            .values_list("attributes__id", flat=True)
        )
        allowed_attribute_ids.discard(None)

        parsed_values = {}
        for item in payload:
            if not isinstance(item, dict):
                self.add_error("attribute_values_payload", "یکی از مقادیر ویژگی معتبر نیست.")
                return cleaned_data
            try:
                attribute_id = int(item.get("attribute_id"))
            except (TypeError, ValueError):
                self.add_error("attribute_values_payload", "شناسه ویژگی معتبر نیست.")
                return cleaned_data

            value = item.get("value", "")
            if not isinstance(value, str) or len(value) > 300:
                self.add_error(
                    "attribute_values_payload",
                    "مقدار هر ویژگی باید متن و حداکثر ۳۰۰ کاراکتر باشد.",
                )
                return cleaned_data
            if attribute_id not in allowed_attribute_ids:
                self.add_error(
                    "attribute_values_payload",
                    "یکی از ویژگی‌ها متعلق به دسته‌بندی‌های انتخاب‌شده نیست.",
                )
                return cleaned_data
            if attribute_id in parsed_values:
                self.add_error(
                    "attribute_values_payload",
                    "برای هر ویژگی فقط یک مقدار وارد کنید.",
                )
                return cleaned_data
            parsed_values[attribute_id] = value.strip()

        cleaned_data["parsed_attribute_values"] = parsed_values
        return cleaned_data


class ProductAdmin(admin.ModelAdmin):
    form = ProductAdminForm
    list_display = ["title", "current_price", "is_active"]
    list_filter = ["is_active"]
    list_editable = ["is_active"]
    change_form_template = "admin/product_module/product/change_form.html"

    class Media:
        js = ("admin/js/product-attributes.js",)

    def get_urls(self):
        custom_urls = [
            path(
                "attribute-fields/",
                self.admin_site.admin_view(self.attribute_fields_view),
                name="product_module_product_attribute_fields",
            ),
        ]
        return custom_urls + super().get_urls()

    def attribute_fields_view(self, request):
        category_ids = request.GET.getlist("category_ids")
        categories = models.Category.objects.filter(pk__in=category_ids)
        attribute_ids = categories.values_list("attributes__id", flat=True).distinct()
        attributes = list(
            models.Attribute.objects.filter(pk__in=attribute_ids)
            .order_by("title")
            .values("id", "title")
        )

        product_id = request.GET.get("product_id")
        current_values = {}
        if product_id:
            product = models.Product.objects.filter(pk=product_id).first()
            if product:
                for value in product.attributes.select_related("attribute").order_by("pk"):
                    current_values.setdefault(value.attribute_id, value.value)

        for attribute in attributes:
            attribute["value"] = current_values.get(attribute["id"], "")

        return JsonResponse({"attributes": attributes})

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        extra_context = extra_context or {}
        extra_context["attribute_fields_url"] = reverse(
            "admin:product_module_product_attribute_fields"
        )
        return super().changeform_view(
            request, object_id, form_url, extra_context
        )

    def save_model(self, request, obj: models.Product, form, change):
        if not change:
            obj.admin = request.user
        return super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)

        payload = form.cleaned_data.get("parsed_attribute_values")
        if payload is None:
            return

        product = form.instance
        allowed_attribute_ids = set(
            models.Category.objects.filter(
                pk__in=product.category.values_list("pk", flat=True)
            ).values_list("attributes__id", flat=True)
        )
        allowed_attribute_ids.discard(None)

        # Remove values for attributes that are no longer allowed by the categories.
        stale_ids = list(
            product.attributes.exclude(
                attribute_id__in=allowed_attribute_ids
            ).values_list("pk", flat=True)
        )
        if stale_ids:
            product.attributes.remove(*stale_ids)

        # Each input maps to one AttributeValue. Existing shared values are reused;
        # blank inputs remove the product's relation without deleting shared records.
        for attribute_id, value in payload.items():
            product.attributes.remove(
                *product.attributes.filter(attribute_id=attribute_id)
            )
            if value:
                attribute_value, _ = models.AttributeValue.objects.get_or_create(
                    attribute_id=attribute_id,
                    value=value,
                )
                product.attributes.add(attribute_value)


admin.site.register(models.Product, ProductAdmin)
admin.site.register(models.Category)
admin.site.register(models.Brand)
admin.site.register(models.ProductVisit)
admin.site.register(models.ProductGallery)
admin.site.register(models.Discount)
admin.site.register(models.Attribute)


@admin.register(models.AttributeValue)
class AttributeValueAdmin(admin.ModelAdmin):
    list_display = ("value", "attribute")
    list_filter = ("attribute",)
    search_fields = ("value", "attribute__title")
