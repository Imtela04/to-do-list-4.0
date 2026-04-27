from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class ThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UserProfile
        fields = ['theme_mode', 'theme_custom_colors']
        
class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ['username', 'password']
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user

class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username']