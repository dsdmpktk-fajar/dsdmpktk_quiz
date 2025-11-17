# cv/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserProfileViewSet,
    EducationViewSet,
    WorkExperienceViewSet,
    SkillViewSet,
    CertificationViewSet
)

# Membuat router DRF
router = DefaultRouter()
router.register(r'profile', UserProfileViewSet, basename='profile')
router.register(r'education', EducationViewSet, basename='education')
router.register(r'work', WorkExperienceViewSet, basename='work')
router.register(r'skills', SkillViewSet, basename='skills')
router.register(r'certifications', CertificationViewSet, basename='certifications')

# urlpatterns final
urlpatterns = [
    path('', include(router.urls)),
]
