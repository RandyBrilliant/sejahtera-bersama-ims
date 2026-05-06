# Generated manually — drop optional PO link from operational cash entries.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("expenses", "0002_order_links_and_constraint"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="operationalcashentry",
            name="expenses_entry_at_most_one_order_link",
        ),
        migrations.RemoveIndex(
            model_name="operationalcashentry",
            name="expenses_op_purchas_7a3994_idx",
        ),
        migrations.RemoveField(
            model_name="operationalcashentry",
            name="purchase_in_order",
        ),
    ]
