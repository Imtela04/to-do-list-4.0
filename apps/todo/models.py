from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Category(models.Model):
    name = models.CharField(max_length=255)
    icon = models.CharField(max_length=10)

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='categories')
    def __str__(self):
        return self.name
    
class Todo(models.Model):
    title = models.CharField(max_length=255)
    completed = models.BooleanField(default=False)
    description = models.CharField(null=True, blank=True)
    deadline = models.DateTimeField(null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank= True)
    
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='todos')
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return self.title
