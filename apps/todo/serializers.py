from rest_framework import serializers
from apps.accounts.serializers import UserCreateSerializer, UserPublicSerializer
from apps.todo.models import Todo, Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'icon']
        read_only_fields = ['id']
class TodoSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    class Meta:
        model = Todo
        fields = ['id', 'title', 'completed', 'description', 'deadline', 'category', 'owner']
        read_only_fields = ['id', 'owner']