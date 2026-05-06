from django.urls import path
from . import views

urlpatterns = [
    # tasks
    path('tasks/', views.tasks),
    path('tasks/<int:task_id>/', views.task_detail),

    # subtasks
    path('tasks/<int:task_id>/subtasks/',             views.subtasks),
    path('tasks/<int:task_id>/subtasks/<int:subtask_id>/', views.subtask_detail),

    # categories
    path('categories/', views.categories),
    path('categories/<int:cat_id>/', views.category_detail),

    # sticky notes
    path('sticky-notes/', views.notes),
    path('sticky-notes/<int:pk>/', views.note_detail),
]