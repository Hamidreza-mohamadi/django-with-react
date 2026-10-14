from django.test import TestCase
from rest_framework.test import APIClient

from account_module.models import User
from product_module.models import Product
from .models import Order


class OrderApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="buyer",
            email="buyer@example.com",
            password="test-password",
        )
        self.other_user = User.objects.create_user(
            username="other-buyer",
            email="other@example.com",
            password="test-password",
        )
        self.product = Product.objects.create(
            title="Test product",
            price=120000,
            inventory=5,
            slug="test-product",
            is_active=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.payload = {
            "items": [{"product_id": self.product.pk, "quantity": 2}],
            "shipping_address": {
                "province": "Tehran",
                "city": "Tehran",
                "postal_code": "1234567890",
                "exact_address": "Test street, No. 1",
                "phone": "09120000000",
            },
        }

    def test_checkout_snapshots_price_and_reserves_inventory(self):
        response = self.client.post("/api/v1/orders/", self.payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], Order.Status.PENDING)
        self.assertEqual(response.data["total"], 280000)
        self.product.refresh_from_db()
        self.assertEqual(self.product.inventory, 3)

    def test_checkout_rejects_quantity_above_stock(self):
        self.payload["items"][0]["quantity"] = 6
        response = self.client.post("/api/v1/orders/", self.payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.inventory, 5)
        self.assertFalse(Order.objects.exists())

    def test_cancel_pending_unpaid_order_restores_stock_only_once(self):
        response = self.client.post("/api/v1/orders/", self.payload, format="json")
        order_id = response.data["id"]
        self.product.refresh_from_db()
        self.assertEqual(self.product.inventory, 3)

        cancel_response = self.client.post(f"/api/v1/orders/{order_id}/cancel/", {}, format="json")
        self.assertEqual(cancel_response.status_code, 200)
        self.assertEqual(cancel_response.data["status"], Order.Status.CANCELLED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.inventory, 5)

        second_cancel = self.client.post(f"/api/v1/orders/{order_id}/cancel/", {}, format="json")
        self.assertEqual(second_cancel.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.inventory, 5)

    def test_user_cannot_retrieve_another_users_order(self):
        self.client.post("/api/v1/orders/", self.payload, format="json")
        order = Order.objects.get(user=self.user)
        self.client.force_authenticate(user=self.other_user)
        response = self.client.get(f"/api/v1/orders/{order.pk}/")
        self.assertEqual(response.status_code, 404)

    def test_checkout_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.post("/api/v1/orders/", self.payload, format="json")
        self.assertEqual(response.status_code, 401)
