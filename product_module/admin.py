from django import forms
from django.contrib import admin

from . import models


class ProductAdminForm(forms.ModelForm):
    class Meta:
        model = models.Product
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        category_field_name = self.add_prefix("category")
        if self.is_bound:
            if hasattr(self.data, "getlist"):
                category_ids = self.data.getlist(category_field_name)
            else:
                category_id = self.data.get(category_field_name)
                category_ids = [category_id] if category_id else []
        elif self.instance and self.instance.pk:
            category_ids = self.instance.category.values_list("pk", flat=True)
        else:
            category_ids = []

        allowed_attribute_ids = models.Category.objects.filter(
            pk__in=category_ids
        ).values_list("attributes__id", flat=True)

        self.fields["attributes"].queryset = models.AttributeValue.objects.filter(
            attribute_id__in=allowed_attribute_ids
        ).select_related("attribute").order_by("attribute__title", "value")

    def clean(self):
        cleaned_data = super().clean()
        categories = cleaned_data.get("category")
        values = cleaned_data.get("attributes")
        if categories is None or values is None:
            return cleaned_data

        allowed_attribute_ids = set(
            models.Category.objects.filter(
                pk__in=categories
            ).values_list("attributes__id", flat=True)
        )
        selected = list(values)
        invalid_values = [
            value for value in selected
            if value.attribute_id not in allowed_attribute_ids
        ]
        if invalid_values:
            titles = ", ".join(
                sorted({value.attribute.title for value in invalid_values})
            )
            self.add_error(
                "attributes",
                f"این ویژگی‌ها برای دسته‌بندی‌های انتخاب‌شده مجاز نیستند: {titles}",
            )

        # A product should have at most one value (including the empty placeholder)
        # for each attribute.
        attribute_ids = [value.attribute_id for value in selected]
        if len(attribute_ids) != len(set(attribute_ids)):
            self.add_error(
                "attributes",
                "برای هر ویژگی فقط یک مقدار انتخاب کنید.",
            )
        return cleaned_data


class ProductAdmin(admin.ModelAdmin):
    form = ProductAdminForm
    list_display = ["title", "current_price", "is_active"]
    list_filter = ["is_active"]
    list_editable = ["is_active"]

    def save_model(self, request, obj: models.Product, form, change):
        if not change:
            obj.admin = request.user
        return super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        # Fill any allowed attributes omitted from the submitted M2M form.
        models.sync_product_attributes(form.instance)


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
