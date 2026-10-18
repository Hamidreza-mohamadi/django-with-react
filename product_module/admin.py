from django import forms
from django.contrib import admin

from . import models


class ProductAdminForm(forms.ModelForm):
    class Meta:
        model = models.Product
        exclude = ("attributes",)


class ProductAttributeInlineForm(forms.ModelForm):
    class Meta:
        model = models.ProductAttribute
        fields = ("attribute", "value")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        attribute_id = None
        if self.instance and self.instance.pk:
            attribute_id = self.instance.attribute_id
        elif self.is_bound:
            attribute_id = self.data.get(self.add_prefix("attribute"))

        values = models.AttributeValue.objects.none()
        if attribute_id:
            values = models.AttributeValue.objects.filter(
                attribute_id=attribute_id
            ).select_related("attribute").order_by("value")
        self.fields["value"].queryset = values

    def clean(self):
        cleaned_data = super().clean()
        attribute = cleaned_data.get("attribute")
        value = cleaned_data.get("value")
        if attribute and value and value.attribute_id != attribute.pk:
            self.add_error("value", "مقدار انتخاب‌شده متعلق به این ویژگی نیست.")
        return cleaned_data


class ProductAttributeInline(admin.TabularInline):
    model = models.ProductAttribute
    form = ProductAttributeInlineForm
    fields = ("attribute", "value")
    readonly_fields = ("attribute",)
    extra = 0
    can_delete = False
    verbose_name = "ویژگی محصول"
    verbose_name_plural = "ویژگی‌های محصول"


class ProductAdmin(admin.ModelAdmin):
    form = ProductAdminForm
    inlines = (ProductAttributeInline,)
    list_display = ["title", "current_price", "is_active"]
    list_filter = ["is_active"]
    list_editable = ["is_active"]

    def save_model(self, request, obj: models.Product, form, change):
        if not change:
            obj.admin = request.user
        return super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        product = form.instance
        models.sync_product_attribute_slots(product)

        # Keep the existing API serializers and filters compatible while the
        # admin edits the normalized, per-product attribute slots.
        product.attributes.clear()
        selected_value_ids = product.attribute_slots.exclude(
            value__isnull=True
        ).values_list("value_id", flat=True)
        product.attributes.add(*selected_value_ids)


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


@admin.register(models.ProductAttribute)
class ProductAttributeAdmin(admin.ModelAdmin):
    list_display = ("product", "attribute", "value")
    list_filter = ("attribute",)
    search_fields = ("product__title", "attribute__title", "value__value")
