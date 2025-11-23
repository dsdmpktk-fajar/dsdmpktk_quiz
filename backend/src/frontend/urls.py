from django.urls import path
from .views import (
    dashboard_view,page_profile,page_education,
    page_work,page_skills,page_certifications,
page_languages,page_trainings,page_generate_cv)


urlpatterns = [
    path("", dashboard_view, name="dashboard"),
    path("profile/", page_profile, name="ui_cv_profile"),
    path("education/", page_education, name="ui_cv_education"),
    path("work/", page_work, name="ui_cv_work"),
    path("skills/", page_skills, name="ui_cv_skills"),
    path("certifications/", page_certifications, name="ui_cv_certifications"),
    path("languages/", page_languages, name="ui_cv_languages"),
    path("trainings/", page_trainings, name="ui_cv_trainings"),
    path("generate-cv/", page_generate_cv, name="ui_cv_generate"),
]