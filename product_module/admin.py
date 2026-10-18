from django.contrib import admin
from . import models


# Register your models here.


class ProductAdmin(admin.ModelAdmin):
    # readonly_fields = ['slug']
    # prepopulated_fields = {'slug' :['title']}
    list_display = ['title', 'current_price', 'is_active']
    list_filter = ['is_active']
    list_editable = ['is_active']
    

    def save_model(self, request, obj: models.Product, form, change):
        if not change:
            obj.admin = request.user
        return super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)


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
