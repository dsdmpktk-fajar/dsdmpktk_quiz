# exam/serializers.py
from rest_framework import serializers
from .models import Exam, Question, Choice, UserExam, UserAnswer

# -------------------------------
# Choice Serializer
# -------------------------------
class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'score']

# -------------------------------
# Question Serializer
# -------------------------------
class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'choices', 'required', 'order']

# -------------------------------
# Exam Serializer
# -------------------------------
class ExamSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Exam
        fields = ['id', 'exam_title', 'description', 'token', 'questions']

# -------------------------------
# UserExam Serializer
# -------------------------------
class UserExamSerializer(serializers.ModelSerializer):
    exam = ExamSerializer(read_only=True)
    exam_id = serializers.PrimaryKeyRelatedField(queryset=Exam.objects.all(), source='exam', write_only=True)

    class Meta:
        model = UserExam
        fields = ['id', 'user', 'exam', 'exam_id', 'joined_at']
        read_only_fields = ['user', 'joined_at']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)

# -------------------------------
# UserAnswer Serializer
# -------------------------------
class UserAnswerSerializer(serializers.ModelSerializer):
    choice = serializers.PrimaryKeyRelatedField(queryset=Choice.objects.all(), many=True, required=False)

    class Meta:
        model = UserAnswer
        fields = ['id', 'user_exam', 'question', 'choice', 'text_answer', 'score']
        read_only_fields = ['score']

    def create(self, validated_data):
        user_exam = validated_data['user_exam']
        question = validated_data['question']
        choices = validated_data.pop('choice', [])

        user_answer = UserAnswer.objects.create(user_exam=user_exam, question=question, **validated_data)
        if question.question_type in ['MCQ', 'CHECK']:
            user_answer.choice.set(choices)
            # hitung score otomatis
            user_answer.score = sum(c.score for c in choices)
            user_answer.save()
        return user_answer
