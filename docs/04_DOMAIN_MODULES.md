# 04 Domain Modules

## Modules
- accounts: identity, roles, profiles, auth/session
- providers: provider business profile and verification
- services: provider service listings
- orders: customer requests/order lifecycle
- bids: provider offers and acceptance workflow
- chat: conversations and messages
- complaints: dispute handling and moderation actions
- reviews: post-completion ratings and feedback
- notifications: in-app event notifications
- admin_panel: moderation and analytics read models

## Domain Interaction Principles
- Orders are created by customers and targeted by provider bids.
- Bid acceptance drives order state transitions.
- Completed orders gate review creation.
- Complaints may trigger moderation actions.
- Notifications are emitted from domain events.
