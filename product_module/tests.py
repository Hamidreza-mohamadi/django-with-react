from django.core.exceptions import ValidationError
from django.test import TestCase

from .models import Attribute, AttributeValue, Category, Product, ProductVariant


class ProductVariantTests(TestCase):
    def setUp(self):
        self.color = Attribute.objects.create(title="Color")
        self.size = Attribute.objects.create(title="Size")
        self.category = Category.objects.create(title="Clothing", slug="clothing")
        self.category.attributes.add(self.color)
        self.product = Product.objects.create(title="T-shirt", slug="t-shirt")
        self.product.category.add(self.category)
        self.black = AttributeValue.objects.create(attribute=self.color, value="Black")
        self.blue = AttributeValue.objects.create(attribute=self.color, value="Blue")
        self.large = AttributeValue.objects.create(attribute=self.size, value="L")

    def test_variants_have_independent_prices_and_stock(self):
        black = ProductVariant.objects.create(product=self.product, price=250, inventory=3)
        black.attributes.add(self.black)
        blue = ProductVariant.objects.create(product=self.product, price=275, inventory=7)
        blue.attributes.add(self.blue)

        self.assertNotEqual(black.sku, blue.sku)
        self.assertEqual(black.inventory, 3)
        self.assertEqual(blue.inventory, 7)
        self.assertEqual(black.price, 250)
        self.assertEqual(blue.price, 275)

    def test_variant_rejects_attributes_not_defined_by_product_categories(self):
        variant = ProductVariant.objects.create(product=self.product, price=250, inventory=1)
        variant.attributes.add(self.large)

        with self.assertRaises(ValidationError):
            variant.full_clean()

    def test_variant_allows_only_one_value_per_attribute(self):
        variant = ProductVariant.objects.create(product=self.product, price=250, inventory=1)
        variant.attributes.add(self.black, self.blue)

        with self.assertRaises(ValidationError):
            variant.full_clean()
