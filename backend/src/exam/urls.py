# exam/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExamViewSet, QuestionViewSet, ChoiceViewSet, UserExamViewSet, UserAnswerViewSet

router = DefaultRouter()
router.register('exams', ExamViewSet, basename='exam')
router.register('questions', QuestionViewSet, basename='question')
router.register('choices', ChoiceViewSet, basename='choice')
router.register('user_exams', UserExamViewSet, basename='user_exam')
router.register('user_answers', UserAnswerViewSet, basename='user_answer')

urlpatterns = [
    path('', include(router.urls)),
]
