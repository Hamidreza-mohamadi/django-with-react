from django.contrib import admin
from . import models


# Register your models here.


class ProductAttributeInline(admin.TabularInline):
    model = models.ProductAttribute
    extra = 0


class ProductAdmin(admin.ModelAdmin):
    inlines = [ProductAttributeInline]
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
        # Sync after inline formsets are saved so category changes do not
        # delete rows that Django admin is still processing.
        super().save_related(request, form, formsets, change)
        models.sync_product_attributes(form.instance)


admin.site.register(models.Product, ProductAdmin)
admin.site.register(models.Category)
admin.site.register(models.Brand)
admin.site.register(models.ProductVisit)
admin.site.register(models.ProductGallery)
admin.site.register(models.Discount)
admin.site.register(models.Attribute)