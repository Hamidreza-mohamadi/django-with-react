from django import forms
from django.contrib import admin
from . import models


# Register your models here.


class ProductAdminForm(forms.ModelForm):
    class Meta:
        model = models.Product
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()
        categories = cleaned_data.get("category")
        values = cleaned_data.get("attributes")
        if categories is None or values is None:
            return cleaned_data

        allowed_attribute_ids = set(
            models.Attribute.objects.filter(category__in=categories)
            .values_list("id", flat=True)
        )
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
    # readonly_fields = ['slug']
    # prepopulated_fields = {'slug' :['title']}
    list_display = ['title', 'current_price', 'is_active']
    list_filter = ['is_active']
    list_editable = ['is_active']
    

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
