import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('todo', '0013_todo_wip'),
    ]

    operations = [
        migrations.AddField(
            model_name='stickynotes',
            name='task',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='notes', to='todo.todo',
            ),
        ),
    ]