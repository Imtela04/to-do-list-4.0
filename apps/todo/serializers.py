from rest_framework import serializers
from apps.accounts.serializers import UserPublicSerializer
from apps.todo.models import Todo, Category, StickyNotes, Subtask

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = ['id', 'name', 'icon']

class SubtaskSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Subtask
        fields = ['id', 'title', 'completed', 'completed_at', 'created_at']

class TodoSerializer(serializers.ModelSerializer):
    owner    = UserPublicSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    subtasks = SubtaskSerializer(many=True, read_only=True)

    class Meta:
        model  = Todo
        fields = [
            'id', 'title', 'completed', 'description', 'deadline',
            'category', 'priority', 'owner', 'created_at', 'pinned',
            'completed_at', 'subtasks',
        ]

class StickyNoteSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    class Meta:
        model  = StickyNotes
        fields = ['id', 'note', 'color', 'owner']