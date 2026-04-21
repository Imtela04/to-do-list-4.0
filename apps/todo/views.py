# from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import TodoSerializer, CategorySerializer
from .models import Todo, Category
from datetime import datetime, timezone as dt_timezone
from django.utils import timezone

# ______Helpers_____
DEFAULT_CATEGORIES = [
    {"name": "work",      "icon": "💼"},
    {"name": "personal",  "icon": "🏠"},
    {"name": "health",    "icon": "💪"},
    {"name": "finance",   "icon": "💰"},
    {"name": "education", "icon": "📚"},
    {"name": "other",     "icon": "📌"},
]

def resolve_category(category_value, user):
    if not category_value:
        return None
    try:
        return int(category_value)
    except(ValueError, TypeError):
        cat = Category.objects.filter(name=category_value, owner=user).first()
        return cat.id if cat else None


#______TODO views_________
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({'username': request.user.username})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tasks(request):
    todos = Todo.objects.filter(owner=request.user)
    serializer = TodoSerializer(todos, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_task(request):
    title = request.data.get('title','').strip()
    description = (request.data.get('description') or '').strip() or None
    deadline = (request.data.get('deadline') or '').strip() or None
    category_id = resolve_category(request.data.get('category'), request.user)
    if Todo.objects.filter(title=title, owner=request.user).exists():
        return Response(
            {'detail': 'Task with this title already exists.'},
            status=status.HTTP_409_CONFLICT
        )
    task = Todo.objects.create(
        title=title,
        owner=request.user,
        description=description or None,
        deadline=datetime.fromisoformat(deadline).replace(tzinfo=dt_timezone.utc) if deadline else None,
        category_id=category_id,
    )
    return Response(TodoSerializer(task).data, status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_task(request, task_id):
    task = Todo.objects.filter(id=task_id, owner=request.user).first()
    if not task:
        return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
    task.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_task_title(request, task_id):
    task = Todo.objects.filter(id=task_id, owner=request.user).first()
    if not task:
        return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
    task.title=request.data.get('title', task.title)
    task.save()
    return Response(TodoSerializer(task).data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_task_deadline(request, task_id):
    task = Todo.objects.filter(id=task_id, owner=request.user).first()
    if not task:
        return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
    deadline = request.data.get('deadline')
    task.deadline=datetime.fromisoformat(deadline).replace(tzinfo=dt_timezone.utc)if deadline else None
    task.save()
    return Response(TodoSerializer(task).data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_task_description(request, task_id):
    task = Todo.objects.filter(id=task_id, owner=request.user).first()
    if not task:
        return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
    task.description=request.data.get('description', task.description)
    task.save()
    return Response(TodoSerializer(task).data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_task_category(request, task_id):
    task = Todo.objects.filter(id=task_id, owner=request.user).first()
    if not task:
        return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
    task.category_id=resolve_category(request.data.get('category', request.user))
    task.save()
    return Response(TodoSerializer(task).data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def toggle_task(request, task_id):
    task = Todo.objects.filter(id=task_id, owner=request.user).first()
    if not task:
        return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
    task.completed=not task.completed
    task.save()
    return Response(TodoSerializer(task).data)


# _________CATEGORY views_______
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_category(request):
    categories = Category.objects.filter(owner=request.user)
    return Response(CategorySerializer(categories, many=True).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_category(request):
    name = request.data.get('name','').strip()
    icon = request.data.get('icon','').strip()
    cat = Category.objects.create(name=name, icon=icon, owner=request.user)
    return Response(CategorySerializer(cat).data, status=status.HTTP_201_CREATED)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_category(request, cat_id):
    cat = Category.objects.filter(id=cat_id, owner=request.user).first()
    if not cat:
        return Response({'detail':'Category not found'}, status=status.HTTP_404_NOT_FOUND)
    cat.name = request.data.get('name', cat.name)
    icon = request.data.get('icon')
    if icon:
        cat.icon=icon
    cat.save()
    return Response(CategorySerializer(cat).data)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_category(request,cat_id):
    cat = Category.objects.filter(id=cat_id, owner=request.user).first()
    if not cat:
        return Response({'detail':'Category not found'}, status=status.HTTP_404_NOT_FOUND)
    cat.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)