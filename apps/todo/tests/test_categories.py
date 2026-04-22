from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from apps.todo.models import Category


def create_user(username='testuser', password='testpass123'):
    return User.objects.create_user(username=username, password=password)

def create_category(user, name='work', icon='💼'):
    return Category.objects.create(name=name, icon=icon, owner=user)


class GetCategoryTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.url = reverse('get_category')  # update if name differs
        self.client.force_authenticate(user=self.user)

    def test_get_categories_empty(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_own_categories_only(self):
        other_user = create_user(username='otheruser')
        create_category(self.user, name='work')
        create_category(other_user, name='personal')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'work')

    def test_get_categories_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AddCategoryTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.url = reverse('add_category')  # update if name differs
        self.client.force_authenticate(user=self.user)

    def test_add_category_success(self):
        response = self.client.post(self.url, {'name': 'work', 'icon': '💼'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'work')
        self.assertEqual(response.data['icon'], '💼')
        self.assertTrue(Category.objects.filter(name='work', owner=self.user).exists())

    def test_add_category_no_icon(self):
        response = self.client.post(self.url, {'name': 'work', 'icon': ''})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_add_category_empty_body(self):
        response = self.client.post(self.url, {})
        # creates with empty name/icon — consider adding validation
        self.assertIn(response.status_code, [
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST
        ])

    def test_add_category_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(self.url, {'name': 'work', 'icon': '💼'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_multiple_categories(self):
        self.client.post(self.url, {'name': 'work', 'icon': '💼'})
        self.client.post(self.url, {'name': 'personal', 'icon': '🏠'})
        self.assertEqual(Category.objects.filter(owner=self.user).count(), 2)


class UpdateCategoryTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.cat = create_category(self.user)
        self.client.force_authenticate(user=self.user)

    def get_url(self, cat_id):
        return reverse('update_category', kwargs={'cat_id': cat_id})

    def test_update_name(self):
        response = self.client.patch(self.get_url(self.cat.id), {'name': 'personal'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'personal')

    def test_update_icon(self):
        response = self.client.patch(self.get_url(self.cat.id), {'icon': '🏠'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['icon'], '🏠')

    def test_update_both_fields(self):
        response = self.client.patch(self.get_url(self.cat.id), {
            'name': 'personal',
            'icon': '🏠'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'personal')
        self.assertEqual(response.data['icon'], '🏠')

    def test_update_other_users_category(self):
        other_user = create_user(username='otheruser')
        other_cat = create_category(other_user, name='personal')
        response = self.client.patch(self.get_url(other_cat.id), {'name': 'hacked'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_nonexistent_category(self):
        response = self.client.patch(self.get_url(9999), {'name': 'test'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.patch(self.get_url(self.cat.id), {'name': 'test'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DeleteCategoryTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.cat = create_category(self.user)
        self.client.force_authenticate(user=self.user)

    def get_url(self, cat_id):
        return reverse('delete_category', kwargs={'cat_id': cat_id})

    def test_delete_own_category(self):
        response = self.client.delete(self.get_url(self.cat.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(id=self.cat.id).exists())

    def test_delete_other_users_category(self):
        other_user = create_user(username='otheruser')
        other_cat = create_category(other_user, name='personal')
        response = self.client.delete(self.get_url(other_cat.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_nonexistent_category(self):
        response = self.client.delete(self.get_url(9999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.delete(self.get_url(self.cat.id))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)