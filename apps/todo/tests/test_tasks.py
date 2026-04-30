from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from apps.todo.models import Todo, Category


class BaseTestCase(APITestCase):
    """Shared setup for all todo tests."""
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.other_user = User.objects.create_user(username='otheruser', password='pass')
        self.client.force_authenticate(user=self.user)

    def create_task(self, title='Test Task', user=None):
        return Todo.objects.create(
            title=title,
            priority='low',
            owner=user or self.user
        )

    def create_category(self, name='Work', user=None):
        return Category.objects.create(
            name=name,
            icon='💼',
            owner=user or self.user
        )


class GetTasksTests(BaseTestCase):
    url = '/api/tasks/'

    def test_get_tasks_authenticated(self):
        """Authenticated user gets their tasks."""
        self.create_task('Task 1')
        self.create_task('Task 2')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_get_tasks_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_tasks_only_own_tasks(self):
        """User only sees their own tasks, not other users'."""
        self.create_task('My task')
        self.create_task('Other task', user=self.other_user)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'My task')

    def test_get_tasks_empty(self):
        """Returns empty list when no tasks exist."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class AddTaskTests(BaseTestCase):
    url = '/api/tasks/'

    def test_add_task_minimal(self):
        """Task with only title is created successfully."""
        response = self.client.post(self.url, {'title': 'New Task'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Task')
        self.assertFalse(response.data['completed'])

    def test_add_task_with_all_fields(self):
        """Task with all fields is created successfully."""
        cat = self.create_category()
        response = self.client.post(self.url, {
            'title': 'Full Task',
            'description': 'A description',
            'deadline': '2026-12-31T00:00:00',
            'category': cat.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['description'], 'A description')
        self.assertIsNotNone(response.data['deadline'])
        self.assertEqual(response.data['category']['id'], cat.id)

    def test_add_task_duplicate_title(self):
        """Duplicate title for same user returns 409."""
        self.create_task('Duplicate Task')
        response = self.client.post(self.url, {'title': 'Duplicate Task'})
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_add_task_duplicate_title_different_user(self):
        """Same title for different user is allowed."""
        self.create_task('Same Title', user=self.other_user)
        response = self.client.post(self.url, {'title': 'Same Title'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_add_task_unauthenticated(self):
        """Unauthenticated request returns 401."""
        self.client.force_authenticate(user=None)
        response = self.client.post(self.url, {'title': 'Task'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_task_owner_is_set_automatically(self):
        """Task owner is set to the authenticated user."""
        response = self.client.post(self.url, {'title': 'My Task', 'priority': 'low'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = Todo.objects.get(title='My Task')
        self.assertEqual(task.owner, self.user)

class DeleteTaskTests(BaseTestCase):
    def test_delete_own_task(self):
        """User can delete their own task."""
        task = self.create_task()
        response = self.client.delete(f'/api/tasks/{task.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Todo.objects.filter(id=task.id).exists())

    def test_delete_other_users_task(self):
        """User cannot delete another user's task — returns 404."""
        task = self.create_task(user=self.other_user)
        response = self.client.delete(f'/api/tasks/{task.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_nonexistent_task(self):
        """Deleting a non-existent task returns 404."""
        response = self.client.delete('/api/tasks/9999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_unauthenticated(self):
        """Unauthenticated request returns 401."""
        task = self.create_task()
        self.client.force_authenticate(user=None)
        response = self.client.delete(f'/api/tasks/{task.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UpdateTaskTitleTests(BaseTestCase):
    def test_update_title_success(self):
        """Title is updated and returned."""
        task = self.create_task('Old Title')
        response = self.client.patch(f'/api/tasks/{task.id}/', {
            'title': 'New Title'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'New Title')

    def test_update_title_other_users_task(self):
        """Cannot update another user's task title."""
        task = self.create_task(user=self.other_user)
        response = self.client.patch(f'/api/tasks/{task.id}/', {
            'title': 'Hacked Title'
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class UpdateTaskDescriptionTests(BaseTestCase):
    def test_update_description_success(self):
        """Description is updated and returned."""
        task = self.create_task()
        response = self.client.patch(f'/api/tasks/{task.id}/', {
            'description': 'New description'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['description'], 'New description')

    def test_update_description_other_users_task(self):
        """Cannot update another user's task description."""
        task = self.create_task(user=self.other_user)
        response = self.client.patch(f'/api/tasks/{task.id}/', {
            'description': 'Hacked'
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class UpdateTaskDeadlineTests(BaseTestCase):
    def test_update_deadline_success(self):
        """Deadline is updated and returned."""
        task = self.create_task()
        response = self.client.patch(f'/api/tasks/{task.id}/', {
            'deadline': '2026-12-31T00:00:00'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['deadline'])

    def test_clear_deadline(self):
        """Sending empty deadline clears it."""
        task = self.create_task()
        response = self.client.patch(f'/api/tasks/{task.id}/', {
            'deadline': ''
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['deadline'])


class ToggleTaskTests(BaseTestCase):
    def test_toggle_task_completes_it(self):
        task = self.create_task()
        response = self.client.patch(f'/api/tasks/{task.id}/', {'completed': True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['completed'])

    def test_toggle_task_uncompletes_it(self):
        task = self.create_task()
        task.completed = True
        task.save()
        response = self.client.patch(f'/api/tasks/{task.id}/', {'completed': False})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['completed'])

    def test_toggle_other_users_task(self):
        task = self.create_task(user=self.other_user)
        response = self.client.patch(f'/api/tasks/{task.id}/', {'completed': True})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)