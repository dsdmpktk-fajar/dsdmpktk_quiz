# exam/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Exam, Question, Choice, UserExam, UserAnswer
from .serializers import ExamSerializer, QuestionSerializer, ChoiceSerializer, UserExamSerializer, UserAnswerSerializer

# -------------------------------
# Exam
# -------------------------------
class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
    permission_classes = [IsAuthenticated]

# -------------------------------
# Question
# -------------------------------
class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated]

# -------------------------------
# Choice
# -------------------------------
class ChoiceViewSet(viewsets.ModelViewSet):
    queryset = Choice.objects.all()
    serializer_class = ChoiceSerializer
    permission_classes = [IsAuthenticated]

# -------------------------------
# UserExam
# -------------------------------
class UserExamViewSet(viewsets.ModelViewSet):
    queryset = UserExam.objects.all()
    serializer_class = UserExamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # user hanya bisa lihat exam yang dia join
        return self.queryset.filter(user=self.request.user)

# -------------------------------
# UserAnswer
# -------------------------------
class UserAnswerViewSet(viewsets.ModelViewSet):
    queryset = UserAnswer.objects.all()
    serializer_class = UserAnswerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user_exam__user=self.request.user)
