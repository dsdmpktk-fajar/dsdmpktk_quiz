from rest_framework import serializers
from .models import (
    UserProfile,
    Education,
    WorkExperience,
    Skill,
    Certification,
    LanguageSkill,
    TrainingHistory
)

# USER PROFILE
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "full_name",
            "title_prefix",
            "title_suffix",
            "birth_date",
            "birth_place",
            "gender",
            "religion",
            "phone_number",
            "linkedin",
        ]
        read_only_fields = ["id"]


# EDUCATION
class EducationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Education
        fields = [
            "id",
            "degree",
            "institution_name",
            "study_program",
            "year_in",
            "year_out",
            "gpa",
        ]
        read_only_fields = ["id"]

    def validate(self, data):
        year_in = data.get("year_in")
        year_out = data.get("year_out")

        if year_in and year_out and year_out < year_in:
            raise serializers.ValidationError("Tahun lulus tidak boleh sebelum tahun masuk.")

        return data


# WORK EXPERIENCE
class WorkExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkExperience
        fields = [
            "id",
            "company_name",
            "position",
            "start_date",
            "end_date",
        ]
        read_only_fields = ["id"]


# SKILL
class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = [
            "id",
            "category",
            "skill_name",
            "level",
        ]
        read_only_fields = ["id"]


# CERTIFICATION
class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = [
            "id",
            "name",
            "issuer",
            "issue_date",
            "expiry_date",
            "file",
        ]
        read_only_fields = ["id"]


# LANGUAGE SKILL
class LanguageSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = LanguageSkill
        fields = [
            "id",
            "language",
            "proficiency",
        ]
        read_only_fields = ["id"]


# TRAINING HISTORY

class TrainingHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingHistory
        fields = [
            "id",
            "title",
            "organizer",
            "start_date",
            "end_date",
            "certificate_file",
        ]
        read_only_fields = ["id"]

    def validate(self, data):
        start = data.get("start_date")
        end = data.get("end_date")

        if start and end and end < start:
            raise serializers.ValidationError("Tanggal selesai tidak boleh sebelum tanggal mulai.")

        return data


# FULL CV SERIALIZER (Nested)
class FullCVSerializer(serializers.ModelSerializer):
    educations = EducationSerializer(many=True)
    work_experiences = WorkExperienceSerializer(many=True)
    skills = SkillSerializer(many=True)
    certifications = CertificationSerializer(many=True)
    languages = LanguageSkillSerializer(many=True)
    trainings = TrainingHistorySerializer(many=True)

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "full_name",
            "title_prefix",
            "title_suffix",
            "birth_date",
            "birth_place",
            "gender",
            "religion",
            "phone_number",
            "linkedin",
            "educations",
            "work_experiences",
            "skills",
            "certifications",
            "languages",
            "trainings",
        ]
