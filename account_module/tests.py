from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


class AuthenticationApiTests(APITestCase):
    def test_register_creates_hashed_password_and_returns_jwt(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "username": "testuser",
                "email": "test@example.com",
                "password": "StrongPass123!",
                "first_name": "Test",
                "last_name": "User",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["username"], "testuser")

        user = get_user_model().objects.get(username="testuser")
        self.assertTrue(user.check_password("StrongPass123!"))
        self.assertNotEqual(user.password, "StrongPass123!")

    def test_login_returns_jwt_pair(self):
        user = get_user_model().objects.create_user(
            username="loginuser",
            email="login@example.com",
            password="StrongPass123!",
        )

        response = self.client.post(
            "/api/v1/auth/token/",
            {"username": user.username, "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_current_user_requires_authentication(self):
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_current_user_returns_authenticated_user(self):
        user = get_user_model().objects.create_user(
            username="meuser",
            email="me@example.com",
            password="StrongPass123!",
        )

        token_response = self.client.post(
            "/api/v1/auth/token/",
            {"username": user.username, "password": "StrongPass123!"},
            format="json",
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}"
        )
        response = self.client.get("/api/v1/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "meuser")
        self.assertNotIn("password", response.data)
