from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.models import UserProfile
from apps.todo.models import Todo, Category, StickyNotes


def get_client(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


class MeViewTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.profile, _ = UserProfile.objects.get_or_create(user=self.user)
        self.client = get_client(self.user)

    def test_me_returns_user_data(self):
        res = self.client.get('/api/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['username'], 'testuser')
        self.assertIn('xp', res.data)
        self.assertIn('level', res.data)
        self.assertIn('streak', res.data)
        self.assertIn('limits', res.data)
        self.assertIn('counts', res.data)

    def test_me_requires_auth(self):
        self.client.credentials()
        res = self.client.get('/api/me/')
        self.assertEqual(res.status_code, 401)


class TasksViewTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.profile, _ = UserProfile.objects.get_or_create(user=self.user)
        self.client = get_client(self.user)

    def test_create_task(self):
        res = self.client.post('/api/tasks/', {'title': 'New task', 'priority': 'low'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['title'], 'New task')

    def test_create_task_requires_title(self):
        res = self.client.post('/api/tasks/', {'priority': 'low'})
        self.assertEqual(res.status_code, 400)

    def test_create_duplicate_task(self):
        Todo.objects.create(owner=self.user, title='Dup task', priority='low')
        res = self.client.post('/api/tasks/', {'title': 'Dup task', 'priority': 'low'})
        self.assertEqual(res.status_code, 409)

    def test_task_limit_enforced(self):
        # level 1 limit is 5 tasks
        for i in range(5):
            Todo.objects.create(owner=self.user, title=f'Task {i}', priority='low')
        res = self.client.post('/api/tasks/', {'title': 'Over limit', 'priority': 'low'})
        self.assertEqual(res.status_code, 403)
        self.assertTrue(res.data.get('limit_reached'))

    def test_get_tasks(self):
        Todo.objects.create(owner=self.user, title='Task 1', priority='low')
        res = self.client.get('/api/tasks/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_complete_task_awards_xp(self):
        task = Todo.objects.create(owner=self.user, title='XP task', priority='low')
        res = self.client.patch(f'/api/tasks/{task.id}/', {'completed': True})
        self.assertEqual(res.status_code, 200)
        self.assertIn('xp_result', res.data)
        self.assertGreater(res.data['xp_result']['xp_gained'], 0)

    def test_uncomplete_task_deducts_xp(self):
        task = Todo.objects.create(owner=self.user, title='XP task', priority='low', completed=True)
        self.profile.xp = 50
        self.profile.save()
        res = self.client.patch(f'/api/tasks/{task.id}/', {'completed': False})
        self.assertEqual(res.status_code, 200)
        self.profile.refresh_from_db()
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.xp, 45)

    def test_update_task_priority(self):
        task = Todo.objects.create(owner=self.user, title='Task', priority='low')
        res = self.client.patch(f'/api/tasks/{task.id}/', {'priority': 'high'})
        self.assertEqual(res.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.priority, 'high')

    def test_delete_task(self):
        task = Todo.objects.create(owner=self.user, title='Task', priority='low')
        res = self.client.delete(f'/api/tasks/{task.id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Todo.objects.filter(id=task.id).exists())

    def test_cannot_access_other_users_task(self):
        other = User.objects.create_user(username='other', password='pass')
        task = Todo.objects.create(owner=other, title='Other task', priority='low')
        res = self.client.patch(f'/api/tasks/{task.id}/', {'priority': 'high'})
        self.assertEqual(res.status_code, 404)
    def test_uncomplete_task_deducts_xp(self):
        task = Todo.objects.create(owner=self.user, title='XP task', priority='low', completed=True)
        print(task.completed)  # should print True
        self.profile.xp = 50
        self.profile.save()
        res = self.client.patch(f'/api/tasks/{task.id}/', {'completed': False})
        print(res.data)  # check if xp_result is in response
        self.profile.refresh_from_db()
        print(self.profile.xp)  # what is it actually?
        self.assertEqual(self.profile.xp, 45)


class CategoriesViewTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.profile, _ = UserProfile.objects.get_or_create(user=self.user)
        self.client = get_client(self.user)

    def test_create_category(self):
        res = self.client.post('/api/categories/', {'name': 'Work', 'icon': '💼'})
        self.assertEqual(res.status_code, 201)

    def test_category_limit_enforced(self):
        # level 1 limit is 2 categories
        Category.objects.create(owner=self.user, name='Cat 1', icon='📁')
        Category.objects.create(owner=self.user, name='Cat 2', icon='📁')
        res = self.client.post('/api/categories/', {'name': 'Cat 3', 'icon': '📁'})
        self.assertEqual(res.status_code, 403)
        self.assertTrue(res.data.get('limit_reached'))

    def test_delete_category(self):
        cat = Category.objects.create(owner=self.user, name='Work', icon='💼')
        res = self.client.delete(f'/api/categories/{cat.id}/')
        self.assertEqual(res.status_code, 204)


class StickyNotesViewTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.profile, _ = UserProfile.objects.get_or_create(user=self.user)
        self.client = get_client(self.user)

    def test_create_note_blocked_at_level_1(self):
        # level 1 has 0 notes limit
        res = self.client.post('/api/sticky-notes/', {'note': 'Hello'})
        self.assertEqual(res.status_code, 403)
        self.assertTrue(res.data.get('limit_reached'))

    def test_create_note_allowed_at_level_2(self):
        self.profile.level = 2
        self.profile.xp = 100
        self.profile.save()
        res = self.client.post('/api/sticky-notes/', {'note': 'Hello'})
        self.assertEqual(res.status_code, 201)

    def test_update_note(self):
        self.profile.level = 2
        self.profile.xp = 100
        self.profile.save()
        note = StickyNotes.objects.create(owner=self.user, note='Old note')
        res = self.client.patch(f'/api/sticky-notes/{note.id}/', {'note': 'Updated'})
        self.assertEqual(res.status_code, 200)
        note.refresh_from_db()
        self.assertEqual(note.note, 'Updated')

    def test_delete_note(self):
        note = StickyNotes.objects.create(owner=self.user, note='Delete me')
        res = self.client.delete(f'/api/sticky-notes/{note.id}/')
        self.assertEqual(res.status_code, 204)
