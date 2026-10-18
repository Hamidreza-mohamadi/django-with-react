from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet

from . import models


class ProductVariantInlineForm(forms.ModelForm):
    class Meta:
        model = models.ProductVariant
        fields = ("sku", "price", "inventory", "attributes", "is_active")

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


class ProductVariantInline(admin.TabularInline):
    model = models.ProductVariant
    form = ProductVariantInlineForm
    formset = ProductVariantInlineFormSet
    extra = 1
    fields = ("sku", "price", "inventory", "attributes", "is_active")
    filter_horizontal = ("attributes",)
    show_change_link = True


@admin.register(models.Product)
class ProductAdmin(admin.ModelAdmin):
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


@admin.register(models.ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ("sku", "product", "price", "inventory", "is_active")
    list_filter = ("is_active",)
    search_fields = ("sku", "product__title")
    list_select_related = ("product",)
    filter_horizontal = ("attributes",)
