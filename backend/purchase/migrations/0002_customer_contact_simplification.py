from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("purchase", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="customer",
            name="company_name",
        ),
        migrations.RemoveField(
            model_name="customer",
            name="email",
        ),
        migrations.RemoveField(
            model_name="customer",
            name="tax_id",
        ),
        migrations.AlterField(
            model_name="customer",
            name="address",
            field=models.TextField(verbose_name="address"),
        ),
        migrations.AlterField(
            model_name="customer",
            name="phone",
            field=models.CharField(blank=True, db_index=True, max_length=50, verbose_name="phone"),
        ),
    ]
