from rest_framework import serializers
from apps.accounts.serializers import UserPublicSerializer
from apps.todo.models import Todo, Category, StickyNotes, Subtask, Attachment

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = ['id', 'name', 'icon']

class SubtaskSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Subtask
        fields = ['id', 'title', 'completed', 'completed_at', 'created_at']

class StickyNoteSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    class Meta:
        model  = StickyNotes
        fields = ['id', 'note', 'color', 'owner']


class AttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model  = Attachment
        fields = ['id', 'filename', 'size', 'content_type', 'uploaded_at', 'url']

    def get_url(self, obj):
        return obj.file.url
    
class TodoSerializer(serializers.ModelSerializer):
    owner    = UserPublicSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    subtasks = SubtaskSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model  = Todo
        fields = [
            'id', 'title', 'completed', 'description', 'deadline',
            'category', 'priority', 'owner', 'created_at', 'pinned',
            'completed_at', 'subtasks', 'attachments','recurrence', 
        ]

