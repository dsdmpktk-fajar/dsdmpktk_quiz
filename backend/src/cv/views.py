# cv/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import UserProfile, Education, WorkExperience, Skill, Certification
from .serializers import (
    UserProfileSerializer,
    EducationSerializer,
    WorkExperienceSerializer,
    SkillSerializer,
    CertificationSerializer
)

class UserProfileViewSet(viewsets.ModelViewSet):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EducationViewSet(viewsets.ModelViewSet):
    serializer_class = EducationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = get_object_or_404(UserProfile, user=self.request.user)
        return Education.objects.filter(user=profile)

    def perform_create(self, serializer):
        profile = get_object_or_404(UserProfile, user=self.request.user)
        serializer.save(user=profile)


class WorkExperienceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkExperienceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = get_object_or_404(UserProfile, user=self.request.user)
        return WorkExperience.objects.filter(user=profile)

    def perform_create(self, serializer):
        profile = get_object_or_404(UserProfile, user=self.request.user)
        serializer.save(user=profile)


class SkillViewSet(viewsets.ModelViewSet):
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = get_object_or_404(UserProfile, user=self.request.user)
        return Skill.objects.filter(user=profile)

    def perform_create(self, serializer):
        profile = get_object_or_404(UserProfile, user=self.request.user)
        serializer.save(user=profile)


class CertificationViewSet(viewsets.ModelViewSet):
    serializer_class = CertificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = get_object_or_404(UserProfile, user=self.request.user)
        return Certification.objects.filter(user=profile)

    def perform_create(self, serializer):
        profile = get_object_or_404(UserProfile, user=self.request.user)
        serializer.save(user=profile)
