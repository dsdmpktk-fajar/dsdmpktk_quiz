from django.urls import path
from .views import (
    dashboard_view, 
    page_profile, page_education, page_work, page_skills,
    page_certifications, page_languages, page_trainings, page_generate_cv,
    page_courses, page_course_detail, page_course_requirements,
    page_exams, page_exam_start, page_exam_attempt, page_exam_result,
    admin_dashboard_page, page_task_detail
)

urlpatterns = [

    # ===============================
    # DASHBOARD
    # ===============================
    path('', dashboard_view, name='dashboard'),

    # ===============================
    # CV PAGES
    # ===============================
    path('cv/profile/', page_profile, name='ui_cv_profile'),
    path('cv/education/', page_education, name='ui_cv_education'),
    path('cv/work/', page_work, name='ui_cv_work'),
    path('cv/skills/', page_skills, name='ui_cv_skills'),
    path('cv/certifications/', page_certifications, name='ui_cv_certifications'),
    path('cv/languages/', page_languages, name='ui_cv_languages'),
    path('cv/trainings/', page_trainings, name='ui_cv_trainings'),
    path('cv/generate/', page_generate_cv, name='ui_cv_generate'),

    # ===============================
    # COURSE PAGES
    # ===============================
    path('courses/', page_courses, name='ui_courses'),
    path('courses/<int:course_id>/', page_course_detail, name='ui_course_detail'),
    path("courses/<int:course_id>/requirements/", page_course_requirements, name="ui_course_requirements"),

     path(
          "courses/<int:course_id>/tasks/<int:task_id>/",
          page_task_detail,
          name="ui_task_detail"
    ),

    # ===============================
    # EXAM PAGES
    # ===============================

    # exam start page
    path("exams/<int:exam_id>/start/", 
         page_exam_start, 
         name="ui_exam_start"),

    # exam attempt page — MUST come BEFORE result page
    path("exams/<int:exam_id>/attempt/<int:user_exam_id>/", 
         page_exam_attempt, 
         name="ui_exam_attempt"),

    # exam result page
    path("exams/<int:exam_id>/attempt/<int:user_exam_id>/result/", 
         page_exam_result, 
         name="ui_exam_result"),

    # generic exam list
    path('exams/', page_exams, name='ui_exams'),

    # ===============================
    # ADMIN DASHBOARD
    # ===============================
    path('dashboard/admin/', admin_dashboard_page, name='admin-dashboard-page'),
]
