from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.providers.models import ProviderProfile
from apps.services.models import ServiceListing


class RecommendProvidersApiTests(APITestCase):
    def setUp(self):
        self.endpoint = reverse("recommend-providers")

        self.best_provider = self._create_provider(
            email="cooling-pro@example.com",
            display_name="Cooling Pro",
            category="air_conditioning",
            location='{"lat": 33.5138, "lng": 36.2765}',
            rating="4.90",
            hourly_rate="70.00",
            availability="24/7",
            response_time="Usually within 30 minutes",
            skills=["AC repair", "HVAC diagnostics"],
        )
        self.fast_provider = self._create_provider(
            email="quick-ac@example.com",
            display_name="Quick AC Team",
            category="air_conditioning",
            location='{"lat": 33.5200, "lng": 36.2900}',
            rating="4.70",
            hourly_rate="65.00",
            availability="Daily 08:00-22:00",
            response_time="Usually within 2 hours",
            skills=["Air conditioner", "Cooling systems"],
        )
        self.affordable_provider = self._create_provider(
            email="budget-ac@example.com",
            display_name="Budget AC Fix",
            category="air_conditioning",
            location='{"lat": 33.5400, "lng": 36.3200}',
            rating="4.40",
            hourly_rate="45.00",
            availability="Sun-Thu 09:00-18:00",
            response_time="Usually within 6 hours",
            skills=["AC maintenance"],
        )
        self.low_ranked_provider = self._create_provider(
            email="slow-ac@example.com",
            display_name="Slow AC Services",
            category="air_conditioning",
            location='{"lat": 33.7000, "lng": 36.5000}',
            rating="3.90",
            hourly_rate="95.00",
            availability="Weekends only",
            response_time="Usually within 2 days",
            skills=["Cooling repair"],
        )
        self.unrelated_provider = self._create_provider(
            email="plumber@example.com",
            display_name="Trusted Plumber",
            category="plumbing",
            location='{"lat": 33.5138, "lng": 36.2765}',
            rating="5.00",
            hourly_rate="50.00",
            availability="24/7",
            response_time="Usually within 20 minutes",
            skills=["Pipe repair"],
        )

        self._create_service(self.best_provider, "AC Repair Visit", "Fixes air conditioner cooling problems.", "air_conditioning", "70.00")
        self._create_service(self.fast_provider, "Split AC Technician", "Diagnoses units that shut down unexpectedly.", "air_conditioning", "65.00")
        self._create_service(self.affordable_provider, "AC Maintenance", "Affordable cooling system troubleshooting.", "air_conditioning", "45.00")
        self._create_service(self.low_ranked_provider, "Air Conditioner Repair", "Handles not cooling and shutdown issues.", "air_conditioning", "95.00")
        self._create_service(self.unrelated_provider, "Emergency Pipe Repair", "Fixes water leaks and blocked drains.", "plumbing", "50.00")

    def _create_provider(self, **kwargs):
        email = kwargs.pop("email")
        user = User.objects.create_user(email=email, password="StrongPass123", role="provider")
        return ProviderProfile.objects.create(user=user, **kwargs)

    def _create_service(self, provider, title, description, category, price):
        return ServiceListing.objects.create(
            provider=provider,
            title=title,
            description=description,
            category=category,
            price=price,
            price_type=ServiceListing.PRICE_FIXED,
            is_active=True,
        )

    @patch(
        "apps.providers.services.recommendation_service.ProblemAnalysisService._generate_analysis",
        return_value=(
            "```json\n"
            "{\n"
            '  "service_category": "air_conditioning",\n'
            '  "provider_type": "ac_technician",\n'
            '  "likely_issue": "possible low refrigerant or electrical fault",\n'
            '  "urgency": "medium",\n'
            '  "keywords": ["air conditioner", "not cooling", "turns off"],\n'
            '  "suggested_solution": "Turn the unit off and have the cooling system checked for refrigerant or electrical issues.",\n'
            '  "quick_tips": ["Turn the AC off for a few minutes before restarting", "Check whether the air filter is blocked", "Avoid forcing repeated restarts until a technician checks it"]\n'
            "}\n"
            "```"
        ),
    )
    def test_recommend_providers_returns_clean_analysis_and_top_three_ranked_results(self, _mock_analysis):
        response = self.client.post(
            self.endpoint,
            {
                "problem_description": "The air conditioner is not cooling and keeps turning off by itself",
                "user_lat": 33.5138,
                "user_lng": 36.2765,
                "budget": "80.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()

        self.assertEqual(body["analysis"]["service_category"], "air_conditioning")
        self.assertEqual(body["analysis"]["provider_type"], "ac_technician")
        self.assertEqual(
            body["analysis"]["suggested_solution"],
            "Turn the unit off and have the cooling system checked for refrigerant or electrical issues.",
        )
        self.assertEqual(
            body["analysis"]["quick_tips"],
            [
                "Turn the AC off for a few minutes before restarting",
                "Check whether the air filter is blocked",
                "Avoid forcing repeated restarts until a technician checks it",
            ],
        )
        self.assertEqual(len(body["top_providers"]), 3)

        provider_names = [provider["name"] for provider in body["top_providers"]]
        self.assertEqual(set(provider_names), {"Cooling Pro", "Quick AC Team", "Budget AC Fix"})
        self.assertNotIn("Trusted Plumber", provider_names)
        self.assertNotIn("Slow AC Services", provider_names)

        scores = [provider["score"] for provider in body["top_providers"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    @patch(
        "apps.providers.services.recommendation_service.ProblemAnalysisService._generate_analysis",
        return_value=(
            "{"
            '"service_category": "plumbing", '
            '"provider_type": "plumber", '
            '"likely_issue": "احتمال وجود تسريب في وصلة التصريف أو الأنبوب أسفل المغسلة", '
            '"urgency": "medium", '
            '"keywords": ["تسريب", "ماء", "مغسلة"], '
            '"suggested_solution": "توقف عن استخدام المغسلة إلى أن يتم فحص مكان التسريب.", '
            '"quick_tips": ["ضع وعاء تحت التسريب", "جفف الأرضية لتجنب الانزلاق"]'
            "}"
        ),
    )
    def test_recommend_providers_returns_arabic_guidance_when_language_is_arabic(self, _mock_analysis):
        response = self.client.post(
            self.endpoint,
            {
                "problem_description": "عندي تسريب ماء تحت المغسلة والماء عم ينزل على الأرض",
                "language": "ar",
                "user_lat": None,
                "user_lng": None,
                "budget": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["analysis"]["likely_issue"], "احتمال وجود تسريب في وصلة التصريف أو الأنبوب أسفل المغسلة")
        self.assertEqual(body["analysis"]["suggested_solution"], "توقف عن استخدام المغسلة إلى أن يتم فحص مكان التسريب.")
        self.assertEqual(body["analysis"]["quick_tips"], ["ضع وعاء تحت التسريب", "جفف الأرضية لتجنب الانزلاق"])

    @patch(
        "apps.providers.services.recommendation_service.ProblemAnalysisService._generate_analysis",
        return_value=(
            "{"
            '"service_category": "سباكة", '
            '"provider_type": "سباك", '
            '"likely_issue": "احتمال وجود تسريب في وصلة التصريف أو الأنبوب أسفل المغسلة", '
            '"urgency": "متوسطة", '
            '"keywords": ["تسريب", "ماء", "مغسلة"], '
            '"suggested_solution": "أوقف استخدام المغسلة مؤقتاً وافحص مكان التسريب بشكل مبدئي.", '
            '"quick_tips": ["ضع وعاء تحت التسريب", "أغلق الماء إذا زاد التسريب"]'
            "}"
        ),
    )
    def test_recommend_providers_normalizes_arabic_enums_and_filters_matching_category(self, _mock_analysis):
        with self.assertLogs("apps.providers.services.recommendation_service", level="INFO") as captured_logs:
            response = self.client.post(
                self.endpoint,
                {
                    "problem_description": "عندي تسريب ماء تحت المغسلة",
                    "language": "ar",
                    "user_lat": None,
                    "user_lng": None,
                    "budget": None,
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()

        self.assertEqual(body["analysis"]["service_category"], "plumbing")
        self.assertEqual(body["analysis"]["provider_type"], "plumber")
        self.assertEqual(body["analysis"]["urgency"], "medium")

        provider_names = [provider["name"] for provider in body["top_providers"]]
        self.assertEqual(provider_names, ["Trusted Plumber"])
        self.assertNotIn("Cooling Pro", provider_names)
        self.assertTrue(any("Problem analysis raw model output" in message for message in captured_logs.output))
        self.assertTrue(any('"service_category": "plumbing"' in message for message in captured_logs.output))

    @patch(
        "apps.providers.services.recommendation_service.ProblemAnalysisService._generate_analysis",
        return_value=(
            "{"
            '"service_category": "", '
            '"provider_type": "", '
            '"likely_issue": "The bedroom AC may have an airflow restriction or an electrical shutdown issue.", '
            '"urgency": "", '
            '"keywords": "bedroom AC، not cooling", '
            '"suggested_solution": "Arrange a technician inspection and avoid forcing repeated restarts until the unit is checked.", '
            '"quick_tips": ["Turn the unit off for a few minutes before restarting", "Check whether the filter is visibly dusty or blocked"]'
            "}"
        ),
    )
    def test_recommend_providers_handles_noisy_free_form_messages_when_model_omits_enums(self, _mock_analysis):
        response = self.client.post(
            self.endpoint,
            {
                "problem_description": "Hi team, can you help please? The AC in my bedroom is not cooling and it shuts off after a few minutes. Thanks.",
                "user_lat": None,
                "user_lng": None,
                "budget": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()

        self.assertEqual(body["analysis"]["service_category"], "air_conditioning")
        self.assertEqual(body["analysis"]["provider_type"], "ac_technician")
        self.assertEqual(body["analysis"]["urgency"], "medium")
        self.assertEqual(body["analysis"]["keywords"], ["bedroom ac", "not cooling"])

        provider_names = [provider["name"] for provider in body["top_providers"]]
        self.assertEqual(len(provider_names), 3)
        self.assertNotIn("Trusted Plumber", provider_names)

    @patch(
        "apps.providers.services.recommendation_service.ProblemAnalysisService._generate_analysis",
        side_effect=[
            (
                "{"
                '"service_category": "plumbing", '
                '"provider_type": "plumber", '
                '"likely_issue": "possible sink pipe leak", '
                '"urgency": "medium", '
                '"keywords": ["leak", "sink"]'
                "}"
            ),
            (
                "{"
                '"service_category": "plumbing", '
                '"provider_type": "plumber", '
                '"likely_issue": "possible sink pipe leak", '
                '"urgency": "medium", '
                '"keywords": ["leak", "sink"], '
                '"suggested_solution": "Stop using the sink until the leak is checked.", '
                '"quick_tips": ["Place a bucket under the leak", "Shut off the water if the leak gets worse"]'
                "}"
            ),
        ],
    )
    def test_recommend_providers_retries_when_first_model_response_is_incomplete(self, mock_analysis):
        response = self.client.post(
            self.endpoint,
            {
                "problem_description": "There is water leaking under the sink and onto the floor",
                "user_lat": 33.5138,
                "user_lng": 36.2765,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(mock_analysis.call_count, 2)
        body = response.json()
        self.assertEqual(body["analysis"]["service_category"], "plumbing")
        self.assertEqual(body["analysis"]["provider_type"], "plumber")
        self.assertEqual(body["analysis"]["quick_tips"], ["Place a bucket under the leak", "Shut off the water if the leak gets worse"])
        self.assertEqual([provider["name"] for provider in body["top_providers"]], ["Trusted Plumber"])

    def test_recommend_providers_requires_lat_lng_pair(self):
        response = self.client.post(
            self.endpoint,
            {
                "problem_description": "AC is not cooling",
                "user_lat": 33.5138,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"]["code"], "validation_error")

    @patch(
        "apps.providers.services.recommendation_service.ProblemAnalysisService._generate_analysis",
        side_effect=Exception("should be replaced"),
    )
    def test_recommend_providers_returns_503_when_ollama_is_unavailable(self, mock_analysis):
        from shared.exceptions import ExternalServiceError

        mock_analysis.side_effect = ExternalServiceError(
            detail="Unable to analyze the problem right now.",
            code="ollama_unavailable",
            details={"detail": "Failed to reach the local Ollama service."},
        )

        response = self.client.post(
            self.endpoint,
            {
                "problem_description": "AC is not cooling",
                "user_lat": 33.5138,
                "user_lng": 36.2765,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["error"]["code"], "ollama_unavailable")

    @patch(
        "apps.providers.services.recommendation_service.ProblemAnalysisService._generate_analysis",
        return_value=(
            "{"
            '"service_category": "plumbing", '
            '"provider_type": "plumber", '
            '"likely_issue": "possible sink pipe leak", '
            '"urgency": "medium", '
            '"keywords": ["leak", "sink"]'
            "}"
        ),
    )
    def test_recommend_providers_returns_503_for_incomplete_model_analysis(self, _mock_analysis):
        response = self.client.post(
            self.endpoint,
            {
                "problem_description": "There is water leaking under the sink and onto the floor",
                "user_lat": 33.5138,
                "user_lng": 36.2765,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["error"]["code"], "ollama_analysis_incomplete")
