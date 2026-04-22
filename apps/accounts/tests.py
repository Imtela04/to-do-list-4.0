from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

class RegisterTests(APITestCase):
    url = "/api/auth/register/"

    # ── Happy path ─────────────────────────────────────────
    def test_register_success(self):
        res = self.client.post(self.url, {
            "username": "testuser",
            "password": "testpass123"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="testuser").exists())

    def test_register_password_is_hashed(self):
        self.client.post(self.url, {
            "username": "testuser",
            "password": "testpass123"
        })
        user = User.objects.get(username="testuser")
        self.assertNotEqual(user.password, "testpass123")
        self.assertTrue(user.password.startswith("pbkdf2_") or
                        user.password.startswith("bcrypt"))

    # ── Edge cases ─────────────────────────────────────────
    def test_register_duplicate_username(self):
        User.objects.create_user(username="testuser", password="pass123")
        res = self.client.post(self.url, {
            "username": "testuser",
            "password": "newpass123"
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_username(self):
        res = self.client.post(self.url, {"password": "testpass123"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_password(self):
        res = self.client.post(self.url, {"username": "testuser"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_empty_username(self):
        res = self.client.post(self.url, {
            "username": "",
            "password": "testpass123"
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_empty_password(self):
        res = self.client.post(self.url, {
            "username": "testuser",
            "password": ""
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_empty_body(self):
        res = self.client.post(self.url, {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Error cases ────────────────────────────────────────
    def test_register_get_not_allowed(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_register_username_with_spaces(self):
        res = self.client.post(self.url, {
            "username": "test user",
            "password": "testpass123"
        })
        # Django doesn't allow spaces in usernames
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(APITestCase):
    url = "/api/auth/login/"

    def setUp(self):
        User.objects.create_user(username="testuser", password="testpass123")

    # ── Happy path ─────────────────────────────────────────
    def test_login_success(self):
        res = self.client.post(self.url, {
            "username": "testuser",
            "password": "testpass123"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_login_returns_valid_token(self):
        res = self.client.post(self.url, {
            "username": "testuser",
            "password": "testpass123"
        })
        self.assertTrue(len(res.data["access"]) > 0)

    # ── Edge cases ─────────────────────────────────────────
    def test_login_wrong_password(self):
        res = self.client.post(self.url, {
            "username": "testuser",
            "password": "wrongpass"
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_wrong_username(self):
        res = self.client.post(self.url, {
            "username": "nobody",
            "password": "testpass123"
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_password(self):
        res = self.client.post(self.url, {"username": "testuser"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_missing_username(self):
        res = self.client.post(self.url, {"password": "testpass123"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_empty_body(self):
        res = self.client.post(self.url, {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_case_sensitive_username(self):
        res = self.client.post(self.url, {
            "username": "TESTUSER",
            "password": "testpass123"
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Error cases ────────────────────────────────────────
    def test_login_get_not_allowed(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)