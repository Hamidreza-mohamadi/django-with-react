import json

from django import forms
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path
from django.views.decorators.http import require_GET, require_POST
from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet

from . import models


class ProductVariantInlineForm(forms.ModelForm):
    class Meta:
        model = models.ProductVariant
        fields = ("sku", "is_active", "price", "discounted", "inventory", "attributes")

    def clean(self):
        cleaned = super().clean()
        values = cleaned.get("attributes")
        if values is not None:
            attribute_ids = list(values.values_list("attribute_id", flat=True))
            if len(attribute_ids) != len(set(attribute_ids)):
                raise ValidationError("برای هر ویژگی در یک تنوع فقط یک مقدار انتخاب کنید.")
        return cleaned


class ProductVariantInlineFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()
        if any(form.errors for form in self.forms):
            return

        category_ids = self.data.getlist("category")
        if not category_ids and self.instance.pk:
            category_ids = list(self.instance.category.values_list("pk", flat=True))

        allowed_attribute_ids = set(
            models.Category.objects.filter(pk__in=category_ids)
            .values_list("attributes__id", flat=True)
        )
        allowed_attribute_ids.discard(None)
        seen_combinations = set()

        for form in self.forms:
            if not getattr(form, "cleaned_data", None) or form.cleaned_data.get("DELETE"):
                continue
            if not form.has_changed() and not form.instance.pk:
                continue

            values = list(form.cleaned_data.get("attributes") or [])
            invalid_ids = {value.attribute_id for value in values} - allowed_attribute_ids
            if invalid_ids:
                raise ValidationError(
                    "هر ویژگی از تنوع باید در ویژگی‌های دسته‌بندی‌های محصول تعریف شده باشد."
                )

            combination = tuple(sorted(value.pk for value in values))
            if combination in seen_combinations:
                raise ValidationError("ترکیب ویژگی‌های دو تنوع نباید تکراری باشد.")
            seen_combinations.add(combination)


class ProductVariantInline(admin.StackedInline):
    model = models.ProductVariant
    form = ProductVariantInlineForm
    formset = ProductVariantInlineFormSet
    extra = 1
    fields = ("sku", "price", "discount_percent", "inventory", "attributes", "is_active")
    filter_horizontal = ("attributes",)
    show_change_link = True


@admin.register(models.Product)
class ProductAdmin(admin.ModelAdmin):
    class Media:
        js = ("product_module/admin_variant_attributes.js",)

    def get_urls(self):
        custom = [
            path("category-attribute-values/", self.admin_site.admin_view(self.category_attribute_values), name="product-category-attribute-values"),
            path("create-attribute-value/", self.admin_site.admin_view(self.create_attribute_value), name="product-create-attribute-value"),
        ]
        return custom + super().get_urls()

    @require_GET
    def category_attribute_values(self, request):
        category_ids = request.GET.getlist("category_ids")
        attributes = models.Attribute.objects.filter(id__in=models.Category.objects.filter(pk__in=category_ids).values_list("attributes__id", flat=True)).distinct().order_by("title")
        values = models.AttributeValue.objects.filter(attribute__in=attributes).select_related("attribute").order_by("attribute__title", "value")
        return JsonResponse({
            "attributes": [{"id": item.pk, "title": item.title} for item in attributes],
            "values": [{"id": item.pk, "attribute_id": item.attribute_id, "value": item.value} for item in values],
        })

    @require_POST
    def create_attribute_value(self, request):
        try:
            payload = json.loads(request.body or "{}")
            attribute_id = int(payload.get("attribute_id"))
            value = str(payload.get("value", "")).strip()
            category_ids = [int(item) for item in payload.get("category_ids", [])]
        except (ValueError, TypeError, json.JSONDecodeError):
            return JsonResponse({"error": "درخواست نامعتبر است."}, status=400)
        if not value or len(value) > 300:
            return JsonResponse({"error": "مقدار ویژگی باید بین ۱ تا ۳۰۰ نویسه باشد."}, status=400)
        if not models.Category.objects.filter(pk__in=category_ids, attributes__pk=attribute_id).exists():
            return JsonResponse({"error": "این ویژگی در دسته‌بندی انتخاب‌شده تعریف نشده است."}, status=400)
        attribute = models.Attribute.objects.get(pk=attribute_id)
        item, created = models.AttributeValue.objects.get_or_create(attribute=attribute, value=value)
        return JsonResponse({"id": item.pk, "label": str(item), "created": created})

    list_display = ("title", "is_active", "created_date")
    list_filter = ("is_active", "category")
    search_fields = ("title", "slug")
    filter_horizontal = ("category", "favorited_by")
    inlines = (ProductVariantInline,)

    def save_model(self, request, obj, form, change):
        if not change:
            obj.admin = request.user
        super().save_model(request, obj, form, change)


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

