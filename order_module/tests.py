from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from account_module.models import User
from product_module.models import Attribute, AttributeValue, Product, ProductVariant
from .models import Order, OrderStatusHistory, PaymentEvent
from .services import expire_due_orders


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
            slug="test-product",
            is_active=True,
        )
        self.color = Attribute.objects.create(title="رنگ")
        self.black = AttributeValue.objects.create(attribute=self.color, value="مشکی")
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-BLACK",
            price=120000,
            inventory=5,
            is_active=True,
        )
        self.variant.attributes.add(self.black)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.payload = {
            "items": [{"variant_id": self.variant.pk, "quantity": 2}],
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
        self.assertEqual(response.data["items"][0]["product"]["name"], "Test product")
        self.assertEqual(response.data["items"][0]["variant"]["sku"], "TEST-BLACK")
        self.assertEqual(
            response.data["items"][0]["variant"]["attributes"],
            [{"title": "رنگ", "value": "مشکی"}],
        )
        self.assertEqual(len(response.data["status_history"]), 1)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.inventory, 3)

    def test_order_item_display_uses_snapshots_after_catalog_changes(self):
        response = self.client.post("/api/v1/orders/", self.payload, format="json")
        self.assertEqual(response.status_code, 201)
        order_id = response.data["id"]

        self.product.title = "Renamed product"
        self.product.save(update_fields=["title"])
        self.variant.sku = "NEW-SKU"
        self.variant.save(update_fields=["sku"])
        self.variant.attributes.clear()

        detail = self.client.get(f"/api/v1/orders/{order_id}/")
        item = detail.data["items"][0]
        self.assertEqual(item["product"]["name"], "Test product")
        self.assertEqual(item["variant"]["sku"], "TEST-BLACK")
        self.assertEqual(item["variant"]["attributes"], [{"title": "رنگ", "value": "مشکی"}])

    def test_checkout_rejects_quantity_above_stock(self):
        self.payload["items"][0]["quantity"] = 6
        response = self.client.post("/api/v1/orders/", self.payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.inventory, 5)
        self.assertFalse(Order.objects.exists())

    def test_cancel_pending_unpaid_order_restores_stock_only_once(self):
        response = self.client.post("/api/v1/orders/", self.payload, format="json")
        order_id = response.data["id"]
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.inventory, 3)

        cancel_response = self.client.post(f"/api/v1/orders/{order_id}/cancel/", {}, format="json")
        self.assertEqual(cancel_response.status_code, 200)
        self.assertEqual(cancel_response.data["status"], Order.Status.CANCELLED)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.inventory, 5)
        self.assertEqual(OrderStatusHistory.objects.filter(order_id=order_id).count(), 2)

        second_cancel = self.client.post(f"/api/v1/orders/{order_id}/cancel/", {}, format="json")
        self.assertEqual(second_cancel.status_code, 400)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.inventory, 5)

    def test_user_cannot_retrieve_another_users_order(self):
        response = self.client.post("/api/v1/orders/", self.payload, format="json")
        order_id = response.data["id"]
        self.client.force_authenticate(user=self.other_user)
        response = self.client.get(f"/api/v1/orders/{order_id}/")
        self.assertEqual(response.status_code, 404)

    def test_checkout_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.post("/api/v1/orders/", self.payload, format="json")
        self.assertEqual(response.status_code, 401)

    @override_settings(DEBUG=True)
    def test_simulated_payment_creates_payment_event_and_status_history(self):
        response = self.client.post("/api/v1/orders/", self.payload, format="json")
        order_id = response.data["id"]
        payment = self.client.post(
            f"/api/v1/orders/{order_id}/simulate-payment/", {}, format="json"
        )
        self.assertEqual(payment.status_code, 200)
        self.assertTrue(payment.data["is_paid"])
        self.assertEqual(payment.data["status"], Order.Status.CONFIRMED)
        self.assertEqual(len(payment.data["payment_events"]), 1)
        self.assertEqual(payment.data["payment_events"][0]["status"], PaymentEvent.Status.SUCCEEDED)
        self.assertEqual(len(payment.data["status_history"]), 2)

    def test_expired_order_releases_inventory_exactly_once(self):
        response = self.client.post("/api/v1/orders/", self.payload, format="json")
        order_id = response.data["id"]
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.inventory, 3)

        order = Order.objects.get(pk=order_id)
        order.expires_at = timezone.now() - timedelta(minutes=1)
        order.save(update_fields=["expires_at"])

        self.assertEqual(expire_due_orders(), 1)
        order.refresh_from_db()
        self.variant.refresh_from_db()
        self.assertEqual(order.status, Order.Status.EXPIRED)
        self.assertEqual(self.variant.inventory, 5)
        self.assertEqual(
            OrderStatusHistory.objects.filter(order=order, to_status=Order.Status.EXPIRED).count(),
            1,
        )

        self.assertEqual(expire_due_orders(), 0)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.inventory, 5)

    def test_expiry_does_not_cancel_paid_order(self):
        response = self.client.post("/api/v1/orders/", self.payload, format="json")
        order_id = response.data["id"]
        order = Order.objects.get(pk=order_id)
        order.expires_at = timezone.now() - timedelta(minutes=1)
        order.is_paid = True
        order.status = Order.Status.CONFIRMED
        order.save(update_fields=["expires_at", "is_paid", "status"])

        self.assertEqual(expire_due_orders(), 0)
        order.refresh_from_db()
        self.variant.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CONFIRMED)
        self.assertEqual(self.variant.inventory, 3)
