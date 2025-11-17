# cv/admin.py
from django.contrib import admin
from .models import UserProfile, Education, WorkExperience, Skill, Certification

# ------------------------------------------------
# Inline untuk submodel
# ------------------------------------------------
class EducationInline(admin.TabularInline):
    model = Education
    extra = 1
    fields = ['degree', 'institution', 'program', 'year_in', 'year_out', 'gpa']

class WorkExperienceInline(admin.TabularInline):
    model = WorkExperience
    extra = 1
    fields = ['company', 'position', 'start_date', 'end_date']

class SkillInline(admin.TabularInline):
    model = Skill
    extra = 1
    fields = ['category', 'name']

class CertificationInline(admin.TabularInline):
    model = Certification
    extra = 1
    fields = ['name', 'issuer', 'issue_date', 'expiry_date', 'file']

# ------------------------------------------------
# UserProfile Admin
# ------------------------------------------------
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'user', 'birth_date', 'gender', 'phone_number', 'linkedin']
    search_fields = ['full_name', 'user__username', 'phone_number']
    inlines = [EducationInline, WorkExperienceInline, SkillInline, CertificationInline]
