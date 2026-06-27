from django.core.management.base import BaseCommand

from apps.knowledge.services import KnowledgeIngestionService


class Command(BaseCommand):
    help = "Process queued provider knowledge ingestion jobs."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=10)

    def handle(self, *args, **options):
        processed = 0
        limit = options["limit"]

        while processed < limit:
            source = KnowledgeIngestionService.process_next_queued()
            if source is None:
                break
            processed += 1
            self.stdout.write(self.style.SUCCESS(f"Processed knowledge source {source.id}"))

        self.stdout.write(f"Processed {processed} knowledge ingestion job(s).")

