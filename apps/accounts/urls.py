from django.urls import path
from . import views
from .views import ThemeView

urlpatterns = [
    path('admin/stats/',               views.admin_stats,       name='admin-stats'),
    path('admin/users/',               views.admin_users,       name='admin-users'),
    path('admin/unlock/<int:user_id>/', views.admin_unlock_user, name='admin-unlock'),
    path('admin/users/<int:user_id>/delete/', views.admin_delete_user, name='admin-delete-user'),
    path('admin/users/<int:user_id>/edit/', views.admin_edit_user, name='admin-edit-user'),
    path('admin/users/<int:user_id>/reset-xp/', views.admin_reset_xp, name='admin-reset-xp'),
    path('admin/users/<int:user_id>/force-logout/', views.admin_force_logout,    name='admin-force-logout'),
    path('admin/users/<int:user_id>/toggle-staff/', views.admin_toggle_staff,    name='admin-toggle-staff'),
    path('admin/users/<int:user_id>/detail/',       views.admin_user_detail,     name='admin-user-detail'),
    path('admin/users/<int:user_id>/award-xp/',     views.admin_award_xp,        name='admin-award-xp'),
    path('admin/users/<int:user_id>/clear-onboarding/', views.admin_clear_onboarding, name='admin-clear-onboarding'),
    path('admin/tasks/<int:task_id>/delete/',        views.admin_delete_task,     name='admin-delete-task'),
    path('admin/notes/<int:note_id>/view/', views.admin_view_note, name='admin-view-note'),
    path('admin/notes/<int:note_id>/delete/',        views.admin_delete_note,     name='admin-delete-note'),
    path('admin/bulk-action/',                       views.admin_bulk_action,     name='admin-bulk-action'),
    path('admin/export/users.csv',                   views.admin_export_users_csv, name='admin-export-csv'),
    path('admin/audit-log/', views.admin_audit_log, name='admin-audit-log'),
    
    path('register/',                    views.register),
    path('user/theme/',                  ThemeView.as_view(), name='user-theme'),
    path('me/',                          views.me,            name='me'),
    path('account/',                     views.delete_account, name='delete-account'),
    path('auth/account/',                views.delete_account, name='delete-account-auth'),
    path('health/',                      views.health,         name='health'),
    path('auth/password-reset/',         views.request_password_reset, name='password-reset'),
    path('auth/password-reset/confirm/', views.confirm_password_reset,  name='password-reset-confirm'),
    path('auth/pomodoro/complete/',      views.complete_pomodoro, name='pomodoro-complete'),
    path('auth/update-email/', views.update_email, name='update-email'),
]