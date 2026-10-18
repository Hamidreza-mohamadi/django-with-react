from django import forms
from django.contrib import admin
from . import models


class ProductAdminForm(forms.ModelForm):
    class Meta:
        model = models.Product
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Product.attributes points to AttributeValue, while Category.attributes
        # points to Attribute. Only offer values for attributes allowed by the
        # categories selected in this form.
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

        allowed_attribute_ids = models.Category.objects.filter(
            pk__in=categories
        ).values_list("attributes__id", flat=True)

        invalid_values = values.exclude(attribute_id__in=allowed_attribute_ids)
        if invalid_values.exists():
            titles = ", ".join(
                invalid_values.values_list("attribute__title", flat=True).distinct()
            )
            self.add_error(
                "attributes",
                f"این ویژگی‌ها برای دسته‌بندی‌های انتخاب‌شده مجاز نیستند: {titles}",
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
