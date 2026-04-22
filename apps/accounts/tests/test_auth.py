from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status


class RegisterTests(APITestCase):
    url = '/api/auth/register/'

    def test_register_success(self):
        """Valid credentials create a user and return 201."""
        response = self.client.post(self.url, {
            'username': 'testuser',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='testuser').exists())

    def test_register_missing_password(self):
        """Missing password returns 400."""
        response = self.client.post(self.url, {'username': 'testuser'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_username(self):
        """Missing username returns 400."""
        response = self.client.post(self.url, {'password': 'testpass123'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_username(self):
        """Duplicate username returns 400."""
        User.objects.create_user(username='testuser', password='testpass123')
        response = self.client.post(self.url, {
            'username': 'testuser',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_empty_body(self):
        """Empty body returns 400."""
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(APITestCase):
    url = '/api/auth/login/'

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

    def test_login_success(self):
        """Valid credentials return access and refresh tokens."""
        response = self.client.post(self.url, {
            'username': 'testuser',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_wrong_password(self):
        """Wrong password returns 401."""
        response = self.client.post(self.url, {
            'username': 'testuser',
            'password': 'wrongpass'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_wrong_username(self):
        """Non-existent username returns 401."""
        response = self.client.post(self.url, {
            'username': 'ghost',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_empty_body(self):
        """Empty body returns 400."""
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TokenRefreshTests(APITestCase):
    login_url = '/api/auth/login/'
    refresh_url = '/api/auth/refresh/'

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        response = self.client.post(self.login_url, {
            'username': 'testuser',
            'password': 'testpass123'
        })
        self.refresh_token = response.data['refresh']

    def test_refresh_success(self):
        """Valid refresh token returns new access token."""
        response = self.client.post(self.refresh_url, {
            'refresh': self.refresh_token
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_refresh_invalid_token(self):
        """Invalid refresh token returns 401."""
        response = self.client.post(self.refresh_url, {
            'refresh': 'invalidtoken'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)