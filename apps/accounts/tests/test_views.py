from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from apps.accounts.models import UserProfile


class ThemeViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.client.force_authenticate(user=self.user)
        self.url = '/api/user/theme/'

    def test_get_theme_default(self):
        """Returns default theme for new user."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['mode'], 'dark')
        self.assertEqual(response.data['custom_colors'], {})

    def test_post_theme_valid_mode(self):
        """Updates theme mode successfully."""
        response = self.client.post(self.url, {'mode': 'dark'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['mode'], 'dark')

    def test_post_theme_invalid_mode(self):
        """Invalid mode returns 400."""
        response = self.client.post(self.url, {'mode': 'invalid'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_theme_custom_colors(self):
        """Updates custom colors."""
        colors = {'primary': '#ff0000'}
        response = self.client.post(self.url, {'mode': 'custom', 'custom_colors': colors}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['custom_colors'], colors)

    def test_post_theme_invalid_colors(self):
        """Invalid colors type returns 400."""
        response = self.client.post(self.url, {'mode': 'custom', 'custom_colors': 'invalid'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_theme_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MeViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.client.force_authenticate(user=self.user)
        self.url = '/api/me/'

    def test_me_returns_profile_data(self):
        """Returns user profile data."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertIn('xp', response.data)
        self.assertIn('level', response.data)
        self.assertIn('limits', response.data)
        self.assertIn('counts', response.data)

    def test_me_counts(self):
        """Counts are accurate."""
        from apps.todo.models import Todo, Category, StickyNotes
        Todo.objects.create(owner=self.user, title='Task', priority='low')
        Category.objects.create(owner=self.user, name='Cat', icon='🏷️')
        StickyNotes.objects.create(owner=self.user, note='Note')
        response = self.client.get(self.url)
        self.assertEqual(response.data['counts']['tasks'], 1)
        self.assertEqual(response.data['counts']['categories'], 1)
        self.assertEqual(response.data['counts']['notes'], 1)

    def test_me_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LockoutTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.url = '/api/auth/login/'

    def test_lockout_after_max_attempts(self):
        """Account locked after max failed attempts."""
        for _ in range(10):
            self.client.post(self.url, {'username': 'testuser', 'password': 'wrong'}, format='json')
        response = self.client.post(self.url, {'username': 'testuser', 'password': 'pass'})
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_successful_login_resets_attempts(self):
        """Successful login resets failed attempts."""
        profile = UserProfile.objects.get(user=self.user)
        profile.failed_login_attempts = 5
        profile.lockout_until = None  # Reset lockout time
        profile.save()
        response = self.client.post(self.url, {'username': 'testuser', 'password': 'pass'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        profile.refresh_from_db()
        self.assertEqual(profile.failed_login_attempts, 0)