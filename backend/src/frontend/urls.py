from django.urls import path
from .views import (
    dashboard_view, page_profile, page_education,
    page_work, page_skills, page_certifications,
    page_languages, page_trainings, page_generate_cv,
    page_courses, page_exams, admin_dashboard_page,
    page_course_detail
)

urlpatterns = [
    path('', dashboard_view, name='dashboard'),
    path('cv/profile/', page_profile, name='ui_cv_profile'),
    path('cv/education/', page_education, name='ui_cv_education'),
    path('cv/work/', page_work, name='ui_cv_work'),
    path('cv/skills/', page_skills, name='ui_cv_skills'),
    path('cv/certifications/', page_certifications, name='ui_cv_certifications'),
    path('cv/languages/', page_languages, name='ui_cv_languages'),
    path('cv/trainings/', page_trainings, name='ui_cv_trainings'),
    path('cv/generate/', page_generate_cv, name='ui_cv_generate'),
    path('courses/', page_courses, name='ui_courses'),
    path('exams/', page_exams, name='ui_exams'),
    path('dashboard/admin/', admin_dashboard_page, name='admin-dashboard-page'),
    path('courses/', page_courses, name='ui_courses'),
    path('courses/<int:course_id>/', page_course_detail, name='ui_course_detail'),



]
