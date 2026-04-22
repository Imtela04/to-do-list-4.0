from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.me),
    path('tasks/', views.get_tasks),
    path('tasks/add/', views.add_task),
    path('tasks/<int:task_id>/delete/', views.delete_task),
    path('tasks/<int:task_id>/title/', views.update_task_title),
    path('tasks/<int:task_id>/description/', views.update_task_description),
    path('tasks/<int:task_id>/deadline/', views.update_task_deadline),
    path('tasks/<int:task_id>/category/', views.update_task_category),
    path('tasks/<int:task_id>/toggle/', views.toggle_task),
    path('categories/', views.get_category),
    path('categories/add/', views.add_category),
    path('categories/<int:cat_id>/update/', views.update_category),
    path('categories/<int:cat_id>/delete/', views.delete_category),
]