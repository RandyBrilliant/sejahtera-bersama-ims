from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("account", "0003_employeeprofile_resigned_date"),
    ]

    operations = [
        migrations.AlterField(
            model_name="customuser",
            name="role",
            field=models.CharField(
                choices=[
                    ("ADMIN", "Admin"),
                    ("WAREHOUSE_STAFF", "Staff Gudang"),
                    ("SALES_STAFF", "Staff Sales"),
                    ("FINANCE_STAFF", "Staff Keuangan"),
                    ("KUPAS_STAFF", "Staff Kupas"),
                    ("LEADERSHIP", "Pimpinan"),
                ],
                db_index=True,
                default="WAREHOUSE_STAFF",
                max_length=32,
                verbose_name="role",
            ),
        ),
    ]
