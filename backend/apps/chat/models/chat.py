from django.db import models


class Conversation(models.Model):
    order = models.ForeignKey("orders.Order", on_delete=models.SET_NULL, related_name="conversations", null=True, blank=True)
    participants = models.ManyToManyField("accounts.User", through="ParticipantReadState", related_name="conversations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="sent_messages")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class ParticipantReadState(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="read_states")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="chat_read_states")
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("conversation", "user")
