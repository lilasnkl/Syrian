# 04 Domain Modules

## Modules
- accounts: identity, roles, profiles, auth/session
- providers: provider business profile and verification
- services: provider service listings
- recommendations: AI problem analysis and provider recommendation orchestration
- orders: customer requests/order lifecycle
- bids: provider offers and acceptance workflow
- chat: conversations and messages
- complaints: dispute handling and moderation actions
- reviews: post-completion ratings and feedback
- notifications: in-app event notifications
- knowledge: provider document storage, embedding generation, and vector-based retrieval for RAG
- customer_assistant: customer Q&A interface powered by knowledge base with LLM answer generation
- admin_panel: moderation and analytics read models

## Domain Interaction Principles
- Orders are created by customers and targeted by provider bids.
- Bid acceptance drives order state transitions.
- Completed orders gate review creation.
- Complaints may trigger moderation actions.
- Notifications are emitted from domain events.
- Providers can upload knowledge documents; knowledge module ingests and indexes them.
- Customers query the customer_assistant; it retrieves relevant knowledge via semantic search and generates grounded answers using OpenAI LLM.
