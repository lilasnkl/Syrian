ROLE_CUSTOMER = "customer"
ROLE_PROVIDER = "provider"
ROLE_ADMIN = "admin"
ROLE_MODERATOR = "moderator"

ROLE_CHOICES = [
    (ROLE_CUSTOMER, "Customer"),
    (ROLE_PROVIDER, "Provider"),
    (ROLE_ADMIN, "Admin"),
    (ROLE_MODERATOR, "Moderator"),
]

ACTIVE = "active"
BLOCKED = "blocked"
STATUS_CHOICES = [
    (ACTIVE, "Active"),
    (BLOCKED, "Blocked"),
]
