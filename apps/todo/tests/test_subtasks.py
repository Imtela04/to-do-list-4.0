from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from apps.todo.models import Todo, Subtask


class SubtaskTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u', password='p')
        self.client.force_authenticate(user=self.user)
        self.task = Todo.objects.create(owner=self.user, title='Parent', priority='low')
        self.url = f'/api/tasks/{self.task.id}/subtasks/'

    def test_create_subtask(self):
        res = self.client.post(self.url, {'title': 'Sub 1'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['title'], 'Sub 1')
        self.assertFalse(res.data['completed'])

    def test_list_subtasks(self):
        Subtask.objects.create(task=self.task, title='A')
        Subtask.objects.create(task=self.task, title='B')
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)

    def test_complete_subtask_completes_parent_when_all_done(self):
        sub = Subtask.objects.create(task=self.task, title='Only sub')
        res = self.client.patch(
            f'/api/tasks/{self.task.id}/subtasks/{sub.id}/',
            {'completed': True}
        )
        self.assertEqual(res.status_code, 200)
        self.task.refresh_from_db()
        self.assertTrue(self.task.completed)

    def test_completing_one_of_two_does_not_complete_parent(self):
        sub1 = Subtask.objects.create(task=self.task, title='S1')
        Subtask.objects.create(task=self.task, title='S2')
        self.client.patch(
            f'/api/tasks/{self.task.id}/subtasks/{sub1.id}/',
            {'completed': True}
        )
        self.task.refresh_from_db()
        self.assertFalse(self.task.completed)

    def test_subtask_limit_enforced(self):
        for i in range(10):
            Subtask.objects.create(task=self.task, title=f'S{i}')
        res = self.client.post(self.url, {'title': 'Over limit'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_subtask(self):
        sub = Subtask.objects.create(task=self.task, title='Del me')
        res = self.client.delete(f'/api/tasks/{self.task.id}/subtasks/{sub.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(Subtask.objects.filter(id=sub.id).exists())

    def test_cannot_access_other_users_subtask(self):
        other = User.objects.create_user(username='other', password='p')
        other_task = Todo.objects.create(owner=other, title='T', priority='low')
        sub = Subtask.objects.create(task=other_task, title='X')
        res = self.client.patch(
            f'/api/tasks/{other_task.id}/subtasks/{sub.id}/',
            {'completed': True}
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_subtask_missing_title(self):
        res = self.client.post(self.url, {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)