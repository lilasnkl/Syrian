from django.core.management.base import BaseCommand

from apps.providers.models import ProviderProfile
from apps.knowledge.services.zvec_index_service import ZvecKnowledgeIndexService


class Command(BaseCommand):
    help = "Rebuild the optional Zvec knowledge vector index from active Postgres chunks."

    def add_arguments(self, parser):
        parser.add_argument("--provider-id", type=int, default=None)

    def handle(self, *args, **options):
        provider_id = options["provider_id"]
        queryset = ProviderProfile.objects.all()
        if provider_id:
            queryset = queryset.filter(id=provider_id)

        total_chunks = 0
        total_providers = 0
        for provider in queryset.iterator():
            indexed_chunks = ZvecKnowledgeIndexService.rebuild_provider(provider)
            if indexed_chunks:
                total_providers += 1
                total_chunks += indexed_chunks
                self.stdout.write(
                    self.style.SUCCESS(f"Indexed {indexed_chunks} chunk(s) for provider {provider.id}.")
                )

        self.stdout.write(f"Rebuilt Zvec index for {total_providers} provider(s), {total_chunks} chunk(s).")

