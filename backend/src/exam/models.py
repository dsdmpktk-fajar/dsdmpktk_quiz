import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

# Create your models here.

class ExamClass(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    def __str__(self):
        return self.name

class Exam(models.Model):
    exam_class = models.ForeignKey("ExamClass", on_delete=models.CASCADE, related_name="exams")
    exam_title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateTimeField(blank=True, null=True)
    end_date = models.DateTimeField(blank=True, null=True)
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)  # token per exam

    def __str__(self):
        return self.title

    def is_active(self):
        now = timezone.now()
        return (self.start_date <= now <= self.end_date) if self.start_date and self.end_date else True


class Question(models.Model):
    QUESTION_TYPES = [
        ('MCQ', 'Multiple Choice'),
        ('CHECK', 'Checkbox / Multiple Answers'),
        ('DROPDOWN', 'Dropdown'),
        ('TEXT', 'Essay / Text Answer'),
    ]

    exam = models.ForeignKey('Exam', on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    required = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.exam.title} - Q{self.order}: {self.text[:50]}"


class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    text = models.CharField(max_length=255)
    score = models.FloatField(default=0)  # skoring setiap jawaban
    is_correct = models.BooleanField(default=False)  # opsional, bisa untuk auto grading

    def __str__(self):
        return f"{self.question.text[:30]} -> {self.text}"
    

class UserAnswer(models.Model):
    user_exam = models.ForeignKey('UserExam', on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    choice = models.ManyToManyField(Choice, blank=True)  # untuk MCQ atau CHECK
    text_answer = models.TextField(blank=True, null=True)  # untuk essay / TEXT
    score = models.FloatField(default=0)

    class Meta:
        unique_together = ('user_exam', 'question')


class UserExam(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="user_exams")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('exam', 'user')


class Task(models.Model):
    exam_class = models.ForeignKey('ExamClass', on_delete=models.CASCADE, related_name='tasks')
    task_title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    due_date = models.DateTimeField()
    
    def __str__(self):
        return self.title


class TaskSubmission(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='submissions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    submitted_at = models.DateTimeField(auto_now_add=True)
    file = models.FileField(upload_to='task_submissions/')
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('task', 'user')  # satu user hanya boleh submit sekali

    def __str__(self):
        return f"{self.user.username} - {self.task.title}"
