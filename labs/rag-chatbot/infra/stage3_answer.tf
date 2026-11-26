# Stage 3 — Answer (guides/03-answer.md)
# TODO:
#   1. The ask Lambda: handler "ask.handler.handler", the same environment as the indexer plus
#      CHAT_MODEL_ID (var.chat_model_id) and HISTORY_TABLE (stage 4).
#   2. A REST API (aws_api_gateway_rest_api) with a resource "ask" and a POST method (authorization "NONE" for now),
#      an AWS_PROXY integration to the ask Lambda, a permission for API Gateway, a deployment and a stage "dev".
#   Use the REST API, not the HTTP API: in Floci the HTTP API's JWT authorizer rejects valid Cognito tokens.
