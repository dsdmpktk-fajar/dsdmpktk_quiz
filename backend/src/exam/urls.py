from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CourseViewSet,
    ExamViewSet,
    CourseTaskViewSet,
    TaskSubmissionViewSet,
    AdminDashboardAPIView
)

router = DefaultRouter()
# COURSE + JOIN + PARTICIPANTS + SYLLABUS
router.register("courses", CourseViewSet, basename="courses")
# EXAM + start + questions + submit + finish
router.register("exams", ExamViewSet, basename="exams")
# TASK & SUBMISSION
router.register("tasks", CourseTaskViewSet, basename="tasks")
# TASK SUBMISSIONS (admin/assessor view)
router.register("submissions", TaskSubmissionViewSet, basename="submissions")


urlpatterns = [

    path("dashboard/admin/", AdminDashboardAPIView.as_view(), name="admin-dashboard"),
    
    path('', include(router.urls)),

    
]
