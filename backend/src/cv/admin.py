from django.contrib import admin
from .models import (
    UserProfile,
    Education,
    WorkExperience,
    Skill,
    Certification,
    LanguageSkill,
    TrainingHistory,
)

# ============================================================
# INLINE DEFINITIONS
# ============================================================

class EducationInline(admin.TabularInline):
    model = Education
    extra = 1
    fields = ["degree", "institution_name", "study_program", "year_in", "year_out", "gpa"]


class WorkExperienceInline(admin.TabularInline):
    model = WorkExperience
    extra = 1
    fields = ["company_name", "position", "start_date", "end_date"]


class SkillInline(admin.TabularInline):
    model = Skill
    extra = 1
    fields = ["category", "skill_name", "level"]


class LanguageSkillInline(admin.TabularInline):
    model = LanguageSkill
    extra = 1
    fields = ["language", "proficiency"]


class TrainingHistoryInline(admin.TabularInline):
    model = TrainingHistory
    extra = 1
    fields = ["title", "organizer", "start_date", "end_date", "certificate_file"]


class CertificationInline(admin.TabularInline):
    model = Certification
    extra = 1
    fields = ["name", "issuer", "issue_date", "expiry_date", "file"]


# ============================================================
# USER PROFILE ADMIN (ROOT VIEW)
# ============================================================
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):

    list_display = ["full_name", "user", "gender", "phone_number"]
    search_fields = ["full_name", "user__username", "phone_number"]
    list_filter = ["gender", "religion"]

    # Inline content (CV lengkap)
    inlines = [
        EducationInline,
        WorkExperienceInline,
        SkillInline,
        LanguageSkillInline,
        TrainingHistoryInline,
        CertificationInline,
    ]
