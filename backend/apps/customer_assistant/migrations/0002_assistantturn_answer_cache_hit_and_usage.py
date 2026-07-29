from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("customer_assistant", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="assistantturn",
            name="answer_cache_hit",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="assistantturn",
            name="cached_input_tokens",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
