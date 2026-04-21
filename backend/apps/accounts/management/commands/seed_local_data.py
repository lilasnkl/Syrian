import os
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User, UserProfile
from apps.bids.models import Bid, BidStatusHistory
from apps.orders.models import Order, OrderStatusHistory
from apps.providers.models import ProviderProfile
from apps.services.models import ServiceListing
from shared.constants import ACTIVE, ROLE_ADMIN, ROLE_CUSTOMER, ROLE_MODERATOR, ROLE_PROVIDER


class Command(BaseCommand):
    help = "Seed local development data (idempotent) for users, providers, services, and optional orders/bids."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-orders-bids",
            action="store_true",
            help="Seed only users/providers/services without orders and bids.",
        )
        parser.add_argument(
            "--admin-password",
            default=os.environ.get("SEED_ADMIN_PASSWORD", "Admin12345!"),
            help="Password for the seeded admin account.",
        )
        parser.add_argument(
            "--default-password",
            default=os.environ.get("SEED_DEFAULT_PASSWORD", "User12345!"),
            help="Password for seeded regular, moderator, and provider accounts.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        admin_password = options["admin_password"]
        default_password = options["default_password"]
        include_orders_and_bids = not options["skip_orders_bids"]

        summary = {
            "users_created": 0,
            "users_updated": 0,
            "profiles_created": 0,
            "profiles_updated": 0,
            "providers_created": 0,
            "providers_updated": 0,
            "services_created": 0,
            "services_updated": 0,
            "orders_created": 0,
            "orders_updated": 0,
            "bids_created": 0,
            "bids_updated": 0,
        }

        users = {}

        users["admin"] = self._upsert_user(
            summary=summary,
            email="admin@local.syrianservices",
            password=admin_password,
            role=ROLE_ADMIN,
            first_name="Platform",
            last_name="Admin",
            is_staff=True,
            is_superuser=True,
            location="Damascus",
            phone="+963900000001",
            bio="Local development superuser account.",
            preferred_language="en",
        )

        users["moderator"] = self._upsert_user(
            summary=summary,
            email="moderator@local.syrianservices",
            password=default_password,
            role=ROLE_MODERATOR,
            first_name="Support",
            last_name="Moderator",
            is_staff=True,
            is_superuser=False,
            location="Damascus",
            phone="+963900000002",
            bio="Local development moderator account.",
            preferred_language="en",
        )

        users["customer_1"] = self._upsert_user(
            summary=summary,
            email="noor.customer@local.syrianservices",
            password=default_password,
            role=ROLE_CUSTOMER,
            first_name="Noor",
            last_name="Haddad",
            is_staff=False,
            is_superuser=False,
            location="Damascus",
            phone="+963933000101",
            bio="Customer account for local marketplace testing.",
            preferred_language="ar",
        )

        users["customer_2"] = self._upsert_user(
            summary=summary,
            email="sami.customer@local.syrianservices",
            password=default_password,
            role=ROLE_CUSTOMER,
            first_name="Sami",
            last_name="Khaled",
            is_staff=False,
            is_superuser=False,
            location="Aleppo",
            phone="+963933000102",
            bio="Second customer account for local marketplace testing.",
            preferred_language="en",
        )

        users["provider_1"] = self._upsert_user(
            summary=summary,
            email="layla.provider@local.syrianservices",
            password=default_password,
            role=ROLE_PROVIDER,
            first_name="Layla",
            last_name="Darwish",
            is_staff=False,
            is_superuser=False,
            location="Damascus",
            phone="+963955100201",
            bio="Home services provider account.",
            preferred_language="ar",
        )

        users["provider_2"] = self._upsert_user(
            summary=summary,
            email="omar.provider@local.syrianservices",
            password=default_password,
            role=ROLE_PROVIDER,
            first_name="Omar",
            last_name="Nasser",
            is_staff=False,
            is_superuser=False,
            location="Aleppo",
            phone="+963955100202",
            bio="Design provider account.",
            preferred_language="en",
        )

        users["provider_3"] = self._upsert_user(
            summary=summary,
            email="rana.provider@local.syrianservices",
            password=default_password,
            role=ROLE_PROVIDER,
            first_name="Rana",
            last_name="Salem",
            is_staff=False,
            is_superuser=False,
            location="Homs",
            phone="+963955100203",
            bio="Education provider account.",
            preferred_language="en",
        )

        provider_profiles = {
            "provider_1": self._upsert_provider_profile(
                summary=summary,
                user=users["provider_1"],
                display_name="Layla Plumbing Services",
                bio="Specialized in urgent plumbing and home maintenance fixes.",
                category="home_services",
                location="Damascus",
                hourly_rate=Decimal("35.00"),
                years_experience=7,
                is_verified=True,
                skills=["Plumbing", "Pipe Repair", "Maintenance"],
                availability="Mon-Sat 9:00-18:00",
                response_time="Usually within 30 minutes",
                rating=Decimal("4.80"),
                review_count=56,
                completed_jobs=112,
            ),
            "provider_2": self._upsert_provider_profile(
                summary=summary,
                user=users["provider_2"],
                display_name="Omar Creative Studio",
                bio="Branding and social media visual design for local businesses.",
                category="design",
                location="Aleppo",
                hourly_rate=Decimal("28.00"),
                years_experience=5,
                is_verified=True,
                skills=["Branding", "Logo Design", "Social Media"],
                availability="Sun-Thu 10:00-17:00",
                response_time="Usually within 2 hours",
                rating=Decimal("4.65"),
                review_count=39,
                completed_jobs=74,
            ),
            "provider_3": self._upsert_provider_profile(
                summary=summary,
                user=users["provider_3"],
                display_name="Rana Tutoring Hub",
                bio="Private tutoring for high-school mathematics and English speaking.",
                category="education",
                location="Homs",
                hourly_rate=Decimal("20.00"),
                years_experience=6,
                is_verified=False,
                skills=["Mathematics", "English", "Exam Prep"],
                availability="Daily 16:00-21:00",
                response_time="Usually within 1 hour",
                rating=Decimal("4.55"),
                review_count=24,
                completed_jobs=51,
            ),
        }

        services = {
            "plumbing_fix": self._upsert_service(
                summary=summary,
                provider=provider_profiles["provider_1"],
                title="Emergency Plumbing Repair",
                description="Fast diagnosis and repair for leaks, blocked sinks, and pipe pressure issues.",
                category="home_services",
                price=Decimal("80.00"),
                price_type=ServiceListing.PRICE_FIXED,
                duration="1-2 hours",
                is_active=True,
            ),
            "bath_install": self._upsert_service(
                summary=summary,
                provider=provider_profiles["provider_1"],
                title="Bathroom Fixture Installation",
                description="Professional installation of faucets, shower heads, and bathroom accessories.",
                category="home_services",
                price=Decimal("45.00"),
                price_type=ServiceListing.PRICE_STARTING_AT,
                duration="2-4 hours",
                is_active=True,
            ),
            "logo_branding": self._upsert_service(
                summary=summary,
                provider=provider_profiles["provider_2"],
                title="Logo and Brand Kit Design",
                description="Complete logo set with color palette and typography guidelines.",
                category="design",
                price=Decimal("220.00"),
                price_type=ServiceListing.PRICE_FIXED,
                duration="3-5 days",
                is_active=True,
            ),
            "social_pack": self._upsert_service(
                summary=summary,
                provider=provider_profiles["provider_2"],
                title="Social Media Creative Pack",
                description="Branded social media templates for campaigns and promotions.",
                category="design",
                price=Decimal("130.00"),
                price_type=ServiceListing.PRICE_FIXED,
                duration="2-3 days",
                is_active=True,
            ),
            "math_tutoring": self._upsert_service(
                summary=summary,
                provider=provider_profiles["provider_3"],
                title="Math Tutoring (High School)",
                description="One-to-one sessions focused on algebra, geometry, and exam problem solving.",
                category="education",
                price=Decimal("20.00"),
                price_type=ServiceListing.PRICE_HOURLY,
                duration="60 minutes/session",
                is_active=True,
            ),
            "english_coach": self._upsert_service(
                summary=summary,
                provider=provider_profiles["provider_3"],
                title="English Conversation Coaching",
                description="Practice sessions to improve spoken English confidence and fluency.",
                category="education",
                price=Decimal("18.00"),
                price_type=ServiceListing.PRICE_HOURLY,
                duration="45 minutes/session",
                is_active=True,
            ),
        }

        if include_orders_and_bids:
            order_1 = self._upsert_order(
                summary=summary,
                customer=users["customer_1"],
                service=services["plumbing_fix"],
                title="Fix kitchen sink leak",
                description="Water keeps leaking under the sink and pressure is low on the tap.",
                category="home_services",
                budget=Decimal("120.00"),
                location="Damascus",
                urgency="high",
                preferred_time="Today after 18:00",
                status=Order.STATUS_AWARDED,
                awarded_provider=provider_profiles["provider_1"],
            )
            self._ensure_order_history(
                order=order_1,
                from_status=Order.STATUS_OPEN,
                to_status=Order.STATUS_AWARDED,
                changed_by=users["customer_1"],
                note="Seeded workflow: customer accepted winning bid.",
            )

            order_2 = self._upsert_order(
                summary=summary,
                customer=users["customer_2"],
                service=services["logo_branding"],
                title="Need modern logo for cafe",
                description="Looking for logo concepts and a quick social preview for a new coffee shop.",
                category="design",
                budget=Decimal("300.00"),
                location="Aleppo",
                urgency="medium",
                preferred_time="This week",
                status=Order.STATUS_OPEN,
                awarded_provider=None,
            )

            self._upsert_order(
                summary=summary,
                customer=users["customer_1"],
                service=services["math_tutoring"],
                title="Weekly algebra tutoring",
                description="Need twice-weekly tutoring for grade 11 algebra for the next 2 months.",
                category="education",
                budget=Decimal("90.00"),
                location="Homs",
                urgency="medium",
                preferred_time="Mon/Wed evenings",
                status=Order.STATUS_OPEN,
                awarded_provider=None,
            )

            bid_1 = self._upsert_bid(
                summary=summary,
                order=order_1,
                provider=provider_profiles["provider_1"],
                amount=Decimal("95.00"),
                message="I can inspect and fix this tonight with all needed tools.",
                estimated_duration="2 hours",
                status=Bid.STATUS_ACCEPTED,
            )
            self._ensure_bid_history(
                bid=bid_1,
                from_status=Bid.STATUS_PENDING,
                to_status=Bid.STATUS_ACCEPTED,
                changed_by=users["customer_1"],
                note="Seeded workflow: accepted as winning bid.",
            )

            bid_2 = self._upsert_bid(
                summary=summary,
                order=order_1,
                provider=provider_profiles["provider_2"],
                amount=Decimal("110.00"),
                message="Available tomorrow morning for full repair and testing.",
                estimated_duration="3 hours",
                status=Bid.STATUS_REJECTED,
            )
            self._ensure_bid_history(
                bid=bid_2,
                from_status=Bid.STATUS_PENDING,
                to_status=Bid.STATUS_REJECTED,
                changed_by=users["customer_1"],
                note="Seeded workflow: rejected after another bid was accepted.",
            )

            self._upsert_bid(
                summary=summary,
                order=order_2,
                provider=provider_profiles["provider_2"],
                amount=Decimal("250.00"),
                message="I can deliver 3 logo directions and final files within 5 days.",
                estimated_duration="5 days",
                status=Bid.STATUS_PENDING,
            )

        self.stdout.write(self.style.SUCCESS("Local seed completed successfully."))
        for key, value in summary.items():
            self.stdout.write(f"- {key}: {value}")

        self.stdout.write("")
        self.stdout.write("Seeded credentials:")
        self.stdout.write("- Admin: admin@local.syrianservices / (use --admin-password value)")
        self.stdout.write("- Moderator: moderator@local.syrianservices / (use --default-password value)")
        self.stdout.write("- Customers: noor.customer@local.syrianservices, sami.customer@local.syrianservices")
        self.stdout.write(
            "- Providers: layla.provider@local.syrianservices, omar.provider@local.syrianservices, rana.provider@local.syrianservices"
        )

    def _upsert_user(
        self,
        *,
        summary,
        email,
        password,
        role,
        first_name,
        last_name,
        is_staff,
        is_superuser,
        location,
        phone,
        bio,
        preferred_language,
    ):
        user, created = User.objects.update_or_create(
            email=email,
            defaults={
                "username": email,
                "role": role,
                "status": ACTIVE,
                "first_name": first_name,
                "last_name": last_name,
                "is_staff": is_staff,
                "is_superuser": is_superuser,
                "location": location,
                "phone": phone,
            },
        )
        user.set_password(password)
        user.save(update_fields=["password"])
        self._bump(summary, "users", created)

        profile, profile_created = UserProfile.objects.update_or_create(
            user=user,
            defaults={
                "bio": bio,
                "preferred_language": preferred_language,
                "avatar_url": "",
            },
        )
        del profile
        self._bump(summary, "profiles", profile_created)
        return user

    def _upsert_provider_profile(
        self,
        *,
        summary,
        user,
        display_name,
        bio,
        category,
        location,
        hourly_rate,
        years_experience,
        is_verified,
        skills,
        availability,
        response_time,
        rating,
        review_count,
        completed_jobs,
    ):
        profile, created = ProviderProfile.objects.update_or_create(
            user=user,
            defaults={
                "display_name": display_name,
                "bio": bio,
                "category": category,
                "location": location,
                "hourly_rate": hourly_rate,
                "years_experience": years_experience,
                "is_verified": is_verified,
                "skills": skills,
                "availability": availability,
                "response_time": response_time,
                "rating": rating,
                "review_count": review_count,
                "completed_jobs": completed_jobs,
            },
        )
        self._bump(summary, "providers", created)
        return profile

    def _upsert_service(
        self,
        *,
        summary,
        provider,
        title,
        description,
        category,
        price,
        price_type,
        duration,
        is_active,
    ):
        service, created = ServiceListing.objects.update_or_create(
            provider=provider,
            title=title,
            defaults={
                "description": description,
                "category": category,
                "price": price,
                "price_type": price_type,
                "duration": duration,
                "is_active": is_active,
            },
        )
        self._bump(summary, "services", created)
        return service

    def _upsert_order(
        self,
        *,
        summary,
        customer,
        service,
        title,
        description,
        category,
        budget,
        location,
        urgency,
        preferred_time,
        status,
        awarded_provider,
    ):
        order, created = Order.objects.update_or_create(
            customer=customer,
            title=title,
            defaults={
                "service": service,
                "description": description,
                "category": category,
                "budget": budget,
                "location": location,
                "urgency": urgency,
                "preferred_time": preferred_time,
                "status": status,
                "awarded_provider": awarded_provider,
            },
        )
        self._bump(summary, "orders", created)
        return order

    def _upsert_bid(
        self,
        *,
        summary,
        order,
        provider,
        amount,
        message,
        estimated_duration,
        status,
    ):
        bid, created = Bid.objects.update_or_create(
            order=order,
            provider=provider,
            defaults={
                "amount": amount,
                "message": message,
                "estimated_duration": estimated_duration,
                "status": status,
            },
        )
        self._bump(summary, "bids", created)
        return bid

    def _ensure_order_history(self, *, order, from_status, to_status, changed_by, note):
        OrderStatusHistory.objects.get_or_create(
            order=order,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by,
            defaults={"note": note},
        )

    def _ensure_bid_history(self, *, bid, from_status, to_status, changed_by, note):
        BidStatusHistory.objects.get_or_create(
            bid=bid,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by,
            defaults={"note": note},
        )

    def _bump(self, summary, model_key, created):
        if created:
            summary[f"{model_key}_created"] += 1
        else:
            summary[f"{model_key}_updated"] += 1
