# cv/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserProfileViewSet,
    EducationViewSet,
    WorkExperienceViewSet,
    SkillViewSet,
    CertificationViewSet,
    LanguageSkillViewSet,
    TrainingHistoryViewSet,
    FullCVViewSet
)

router = DefaultRouter()

router.register("profile", UserProfileViewSet, basename="profile")
router.register("education", EducationViewSet, basename="education")
router.register("work", WorkExperienceViewSet, basename="work")
router.register("skills", SkillViewSet, basename="skills")
router.register("certifications", CertificationViewSet, basename="certifications")
router.register("languages", LanguageSkillViewSet, basename="languages")
router.register("trainings", TrainingHistoryViewSet, basename="trainings")

urlpatterns = [
    path("", include(router.urls)),
    path("full/", FullCVViewSet.as_view({'get': 'list'})),
]
