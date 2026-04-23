# 05 Backend Structure

## Target Structure
```text
backend/
  config/
  apps/
    accounts/
    providers/
    services/
    recommendations/
    orders/
    bids/
    chat/
    complaints/
    reviews/
    notifications/
    admin_panel/
  shared/
    exceptions/
    permissions/
    pagination/
    responses/
    validators/
    constants/
    utils/
  manage.py
```

## Module Internal Structure
```text
module/
  api/
    views.py
    serializers.py
    urls.py
    permissions.py
  services/
  repositories/
  selectors/
  models/
  tests/
  admin.py
  apps.py
```

## Backend Standards
- Controllers remain thin and delegate to services.
- Domain invariants live in service layer.
- Query logic is centralized in selectors/repositories.
- Shared responses/errors are uniform across all modules.
