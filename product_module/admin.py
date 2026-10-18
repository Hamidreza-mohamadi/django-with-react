from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError

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


class ProductVariantInline(admin.TabularInline):
    model = models.ProductVariant
    form = ProductVariantInlineForm
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
    # Price and inventory now belong to variants, not the catalog product.
    exclude = ("attributes", "price", "current_price", "inventory")

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
