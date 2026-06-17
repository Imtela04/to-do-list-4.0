from django.apps import AppConfig


class TodoConfig(AppConfig):
    name = 'apps.todo'

    def ready(self):
        import apps.todo.signals