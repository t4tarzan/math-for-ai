# The grader reads lab.outputs.json to find your resources. Uncomment each line when its stage exists.
locals {
  lab_outputs = {
    # bucket              = aws_s3_bucket.docs.bucket                                   # stage 1
    vector_bucket = var.vector_bucket                                                   # stage 2 (make vectors)
    vector_index  = var.vector_index                                                    # stage 2 (make vectors)
    # api_url             = "${var.endpoint}/restapis/${aws_api_gateway_rest_api.api.id}/${aws_api_gateway_stage.dev.stage_name}/_user_request_"  # stage 3
    # user_pool_id        = aws_cognito_user_pool.users.id                              # stage 4
    # user_pool_client_id = aws_cognito_user_pool_client.web.id                         # stage 4
    # history_table       = aws_dynamodb_table.history.name                             # stage 4
    # log_group           = aws_cloudwatch_log_group.ask.name                           # stage 5
  }
}

resource "local_file" "lab_outputs" {
  filename = "${path.module}/../lab.outputs.json"
  content  = jsonencode(local.lab_outputs)
}

output "lab_outputs" {
  value = local.lab_outputs
}
