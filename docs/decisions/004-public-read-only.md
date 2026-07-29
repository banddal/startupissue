# ADR 004: Public read-only product access

## Status

Accepted

## Decision

The Today dashboard, card list, and card detail pages are accessible without
sign-in. The root route redirects directly to the Today dashboard.

Authentication remains enabled for administrative pages and any operation that
changes data. Existing account approval and role checks continue to protect
those routes.

## Consequences

- Visitors can use the core read-only product without configuring Google OAuth.
- Signing in is only necessary for administration and future write actions.
- Cards that satisfy the existing visibility rules are public.
