from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("providers", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="verificationrequest",
            name="files",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="verificationrequest",
            name="years_experience",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="verificationrequest",
            name="service_areas",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
