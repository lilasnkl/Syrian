from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.providers.models import ProviderProfile
from apps.services.models import ServiceListing


class ServicesApiTests(APITestCase):
    def setUp(self):
        self.provider_user = User.objects.create_user(
            email="service-provider@example.com",
            password="StrongPass123",
            role="provider",
        )
        self.other_provider_user = User.objects.create_user(
            email="service-provider-2@example.com",
            password="StrongPass123",
            role="provider",
        )
        self.customer_user = User.objects.create_user(
            email="service-customer@example.com",
            password="StrongPass123",
            role="customer",
        )
        self.provider_profile = ProviderProfile.objects.create(
            user=self.provider_user,
            display_name="Primary Provider",
            category="plumbing",
        )

        self.other_provider = ProviderProfile.objects.create(
            user=self.other_provider_user,
            display_name="Other Provider",
            category="cleaning",
        )
        self.other_service = ServiceListing.objects.create(
            provider=self.other_provider,
            title="Other service",
            description="Owned by another provider",
            category="cleaning",
            price=25,
            price_type="hourly",
        )

    def test_provider_can_create_and_list_own_services(self):
        self.client.force_authenticate(self.provider_user)

        create_url = reverse("services-me")
        response = self.client.post(
            create_url,
            {
                "title": "Home plumbing",
                "description": "Fixes and installation",
                "category": "plumbing",
                "price": "60.00",
                "price_type": "hourly",
                "duration": "2h",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        list_response = self.client.get(create_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data["data"]["services"]), 1)

    def test_provider_service_create_uses_provider_category(self):
        self.client.force_authenticate(self.provider_user)

        create_url = reverse("services-me")
        response = self.client.post(
            create_url,
            {
                "title": "Home plumbing",
                "description": "Fixes and installation",
                "category": "cleaning",
                "price": "60.00",
                "price_type": "hourly",
                "duration": "2h",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["service"]["category"], "plumbing")

    def test_provider_can_update_own_service_and_category_stays_provider_category(self):
        service = ServiceListing.objects.create(
            provider=self.provider_profile,
            title="Pipe repair",
            description="Fixes leaking pipes",
            category="plumbing",
            price=60,
            price_type="hourly",
            duration="2h",
        )

        self.client.force_authenticate(self.provider_user)
        detail_url = reverse("services-detail", kwargs={"service_id": service.id})

        response = self.client.patch(
            detail_url,
            {
                "title": "Updated pipe repair",
                "description": "Updated description",
                "category": "cleaning",
                "price": "75.00",
                "price_type": "fixed",
                "duration": "3h",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        service.refresh_from_db()
        self.assertEqual(service.title, "Updated pipe repair")
        self.assertEqual(service.category, "plumbing")

    def test_customer_cannot_create_service(self):
        self.client.force_authenticate(self.customer_user)

        create_url = reverse("services-me")
        response = self.client.post(
            create_url,
            {
                "title": "Should fail",
                "description": "Not a provider",
                "category": "plumbing",
                "price": "50.00",
                "price_type": "hourly",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_patch_service(self):
        detail_url = reverse("services-detail", kwargs={"service_id": self.other_service.id})
        response = self.client.patch(detail_url, {"title": "Nope"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_provider_cannot_update_other_provider_service(self):
        self.client.force_authenticate(self.provider_user)
        detail_url = reverse("services-detail", kwargs={"service_id": self.other_service.id})

        response = self.client.patch(
            detail_url,
            {
                "title": "Hijacked",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
