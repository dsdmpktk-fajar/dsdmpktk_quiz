from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import (
    UserProfile,
    Education,
    WorkExperience,
    Skill,
    Certification,
    LanguageSkill,
    TrainingHistory
)

from .serializers import (
    UserProfileSerializer,
    EducationSerializer,
    WorkExperienceSerializer,
    SkillSerializer,
    CertificationSerializer,
    LanguageSkillSerializer,
    TrainingHistorySerializer,
    FullCVSerializer
)



# HELPER: GET OR CREATE PROFILE

def get_or_create_profile(user):
    profile, created = UserProfile.objects.get_or_create(user=user)
    return profile



# USER PROFILE VIEWSET

class UserProfileViewSet(viewsets.ModelViewSet):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Hanya tampilkan profile user yang login
        return UserProfile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# EDUCATION VIEWSET

class EducationViewSet(viewsets.ModelViewSet):
    serializer_class = EducationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        profile = get_or_create_profile(self.request.user)
        return Education.objects.filter(user=profile)

    def perform_create(self, serializer):
        profile = get_or_create_profile(self.request.user)
        serializer.save(user=profile)



# WORK EXPERIENCE VIEWSET

class WorkExperienceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkExperienceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        profile = get_or_create_profile(self.request.user)
        return WorkExperience.objects.filter(user=profile)

    def perform_create(self, serializer):
        profile = get_or_create_profile(self.request.user)
        serializer.save(user=profile)



# SKILL VIEWSET

class SkillViewSet(viewsets.ModelViewSet):
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        profile = get_or_create_profile(self.request.user)
        return Skill.objects.filter(user=profile)

    def perform_create(self, serializer):
        profile = get_or_create_profile(self.request.user)
        serializer.save(user=profile)


# CERTIFICATION VIEWSET

class CertificationViewSet(viewsets.ModelViewSet):
    serializer_class = CertificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        profile = get_or_create_profile(self.request.user)
        return Certification.objects.filter(user=profile)

    def perform_create(self, serializer):
        profile = get_or_create_profile(self.request.user)
        serializer.save(user=profile)



# LANGUAGE SKILL VIEWSET

class LanguageSkillViewSet(viewsets.ModelViewSet):
    serializer_class = LanguageSkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        profile = get_or_create_profile(self.request.user)
        return LanguageSkill.objects.filter(user=profile)

    def perform_create(self, serializer):
        profile = get_or_create_profile(self.request.user)
        serializer.save(user=profile)



# TRAINING HISTORY VIEWSET

class TrainingHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = TrainingHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        profile = get_or_create_profile(self.request.user)
        return TrainingHistory.objects.filter(user=profile)

    def perform_create(self, serializer):
        profile = get_or_create_profile(self.request.user)
        serializer.save(user=profile)


# FULL CV ENDPOINT (single endpoint CV lengkap)

class FullCVViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        profile = get_or_create_profile(request.user)
        serializer = FullCVSerializer(profile)
        return Response(serializer.data)
