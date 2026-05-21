# Security Specification & "Dirty Dozen" Threat Vectors

## 1. Data Invariants
- A user can only access `/users/{userId}` and its subcollections where `{userId} == request.auth.uid`.
- Creation/updates of user fields, subjects, tasks, and logs must be schema-validated.
- Users are forbidden from reading or writing other users' focus records.
- All timestamp updates (`updatedAt`) must align with standard `request.time`.

## 2. The "Dirty Dozen" Payloads (Threat Scenarios)

1. **Identity Spoofing - Profile hijacking**:
   - Path: `/users/victimUserId`
   - Payload: `{"userId": "attackerUid", "email": "admin@victim.com"}`
   - Expected: `PERMISSION_DENIED` (User IDs do not match)

2. **Cross-User Subject Poisoning**:
   - Path: `/users/victimUserId/subjects/sub1`
   - Payload: `{"id": "sub1", "name": "Fake Sub", "color": "bg-red-500", "icon": "Book", "totalMinutes": 10000, "goalMinutes": 120}`
   - Expected: `PERMISSION_DENIED`

3. **Injected Invisible Shadow Fields (Schema Attack)**:
   - Path: `/users/myUserId/subjects/sub1`
   - Payload: `{"id": "sub1", "name": "Fake Sub", "color": "bg-red-500", "icon": "Book", "totalMinutes": 0, "goalMinutes": 120, "hacked_admin_flag": true}`
   - Expected: `PERMISSION_DENIED` (Shadow keys forbidden via strict size controls)

4. **Self-Elevated Privilege Escalation**:
   - Path: `/users/myUserId`
   - Payload: `{"userId": "myUserId", "email": "user@test.com", "role": "admin", "isAdmin": true}`
   - Expected: `PERMISSION_DENIED`

5. **Resource Overflow - Denial of Wallet (Size Boundary)**:
   - Path: `/users/myUserId/tasks/task1`
   - Payload: `{"id": "task1", "title": "A".repeat(5000), "isCompleted": false, "subjectId": "math"}`
   - Expected: `PERMISSION_DENIED` (Task titles capped under 500 characters)

6. **Spoofing Verification Status**:
   - Path: `/users/myUserId/tasks/task1` with token `email_verified = false` on verified-only paths.
   - Payload: `{"id": "task1", "title": "Verified Only Task", "isCompleted": false, "subjectId": "general"}`
   - Expected: `PERMISSION_DENIED`

7. **Injecting Orphaned Records**:
   - Path: `/users/myUserId/studyLogs/log1` with nonexistent subject reference.
   - Expected: `PERMISSION_DENIED` on database invariants validation.

8. **Overwriting Immature Timestamps (Temporal Attack)**:
   - Path: `/users/myUserId`
   - Payload: `{"userId": "myUserId", "email": "user@test.com", "createdAt": "2020-01-01T00:00:00Z"}` (altering immutable fields)
   - Expected: `PERMISSION_DENIED`

9. **Client-Provided Timestamps Manipulation**:
   - Path: `/users/myUserId`
   - Payload: `{"userId": "myUserId", "email": "user@test.com", "updatedAt": "3026-05-20T00:00:00Z"}` (client forcing postdate instead of request.time)
   - Expected: `PERMISSION_DENIED`

10. **Unauthenticated Read Attempt (Blanket Scraping)**:
    - Path: `/users/someUserId`
    - Auth: Unauthenticated
    - Expected: `PERMISSION_DENIED`

11. **Negative Value Poisoning**:
    - Path: `/users/myUserId/subjects/sub1`
    - Payload: `{"id": "sub1", "name": "Negative Math", "color": "bg-blue-500", "icon": "BookOpen", "totalMinutes": -150, "goalMinutes": 60}`
    - Expected: `PERMISSION_DENIED` (Minutes must be >= 0)

12. **System Outcome Lock bypass (Terminal State Locking)**:
    - Attempting to update a terminated study state or task which has been locked.
    - Expected: `PERMISSION_DENIED`

---

## 3. Test Suite Runner (`firestore.rules.test.ts`)

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";

// This file is the unit testing guide verifying the 12 scenarios.
// We write this to document our security architecture verification.
```
