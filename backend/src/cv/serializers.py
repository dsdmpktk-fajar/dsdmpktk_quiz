# cv/serializers.py
from rest_framework import serializers
from .models import UserProfile, Education, WorkExperience, Skill, Certification

# -------------------------------
# UserProfile Serializer
# -------------------------------
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "user",
            "full_name",
            "title_prefix",
            "title_suffix",
            "birth_date",
            "birth_place",
            "gender",
            "religion",
            "phone_number",
            "linkedin"
        ]
        read_only_fields = ["id"]  # user di-set otomatis di ViewSet

# -------------------------------
# Education Serializer
# -------------------------------
class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = [
            "id",
            "user",
            "degree",
            "institution",
            "program",
            "year_in",
            "year_out",
            "gpa"
        ]
        read_only_fields = ["id"]  # user di-set otomatis di ViewSet

# -------------------------------
# WorkExperience Serializer
# -------------------------------
class WorkExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkExperience
        fields = [
            "id",
            "user",
            "company",
            "position",
            "start_date",
            "end_date"
        ]
        read_only_fields = ["id"]

# -------------------------------
# Skill Serializer
# -------------------------------
class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = [
            "id",
            "user",
            "category",
            "name"
        ]
        read_only_fields = ["id"]

# -------------------------------
# Certification Serializer
# -------------------------------
class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = [
            "id",
            "user",
            "name",
            "issuer",
            "issue_date",
            "expiry_date",
            "file"
        ]
        read_only_fields = ["id"]
