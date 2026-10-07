# Blox Hub Security Specification

## Data Invariants
- `na444715@gmail.com` is the system owner (Senior Moderator).
- Users cannot change their own `role`, `badge`, or `isBanned` status.
- Banned users (`isBanned: true`) are prohibited from all write operations on `posts`, `public_chat`, and `messages`.
- Private messages are strictly confidential between the `fromId` and `toId`.

## The "Dirty Dozen" Payloads (Deny cases)
1. **Privilege Escalation**: Regular user trying to set their role to 'Senior Moderator'.
2. **Identity Spoofing**: User A trying to post as User B.
3. **Ban Bypass**: Banned user trying to send a message to public chat.
4. **Metadata Corruption**: User trying to set a negative `ratingCount`.
5. **PII Leak**: User A trying to read private messages of User B.
6. **Shadow Field Injection**: User trying to add an `isAdmin: true` field to their profile.
7. **Role Tampering**: Moderator trying to promote themselves to Senior Moderator.
8. **Impersonation**: User creating a post with a fake `badge`.
9. **Spam**: User sending a post with 50KB of content.
10. **ID Poisoning**: Using a 1KB string as a document ID.
11. **Future Dating**: Setting a `timestamp` in the future.
12. **Unverified Auth**: Write attempt from a user with an unverified email.

## Firestore Rules Draft
The rules will use `get()` to verify roles and `request.auth.token.email` for owner assignment.
