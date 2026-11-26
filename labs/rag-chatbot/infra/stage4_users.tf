# Stage 4 — Users (guides/04-users.md)
# TODO:
#   1. A Cognito user pool and an app client that allows ADMIN_USER_PASSWORD_AUTH and USER_PASSWORD_AUTH.
#   2. A COGNITO_USER_POOLS authorizer on your REST API; switch POST /ask to it.
#   3. A DynamoDB table for history: partition key "sub" (string), sort key "ts" (number), pay per request.
