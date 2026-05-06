from rest_framework import serializers
from apps.accounts.serializers import UserPublicSerializer
from apps.todo.models import Todo, Category, StickyNotes

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'icon']
        read_only_fields = ['id', 'is_onboarding']
class TodoSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    class Meta:
        model = Todo
        fields = ['id', 'title', 'completed', 'description', 'deadline', 'category', 'priority', 'owner', 'created_at', 'pinned', 'completed_at']
        read_only_fields = ['id', 'owner', 'created_at', 'is_onboarding']
        
class StickyNoteSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    class Meta:
        model = StickyNotes
        fields = ['id', 'note', 'color', 'owner']
        read_only_fields = ['id', 'is_onboarding']