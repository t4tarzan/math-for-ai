# Stage 4 — Sign-in and history

**Goal:** only signed-in users can ask, and each user's questions are saved.

## Build
1. In `infra/stage4_users.tf`: a Cognito user pool and app client (admin and user password auth), a
   `COGNITO_USER_POOLS` authorizer on your REST API, and switch `POST /ask` to it. A DynamoDB table with partition key
   `sub` (string) and sort key `ts` (number). Uncomment the four stage-4 outputs.
2. In the ask Lambda: when `event["requestContext"]["authorizer"]["claims"]["sub"]` exists, write a history row.

## Test it yourself
Create a user, sign in, and call with the ID token in the `Authorization` header (`aws cognito-idp admin-create-user`,
`admin-set-user-password`, `admin-initiate-auth --auth-flow ADMIN_USER_PASSWORD_AUTH`).

## The grader checks
- a call without a token gets 401;
- the grader creates its own test user, asks 2 questions, and finds at least 2 history rows for that user's `sub`;
  then it deletes the test user.
