terraform {
  required_version = ">= 1.6"
  required_providers {
    aws     = { source = "hashicorp/aws", version = ">= 6.0" }
    archive = { source = "hashicorp/archive", version = ">= 2.4" }
    local   = { source = "hashicorp/local", version = ">= 2.4" }
  }
}

# Floci: every AWS endpoint points at the local emulator. For real AWS, set floci = false.
provider "aws" {
  region                      = var.region
  access_key                  = var.floci ? "test" : null
  secret_key                  = var.floci ? "test" : null
  skip_credentials_validation = var.floci
  skip_requesting_account_id  = var.floci
  skip_metadata_api_check     = var.floci
  s3_use_path_style           = var.floci

  dynamic "endpoints" {
    for_each = var.floci ? [1] : []
    content {
      apigateway  = var.endpoint
      cloudwatch  = var.endpoint
      cognitoidp  = var.endpoint
      dynamodb    = var.endpoint
      iam         = var.endpoint
      lambda      = var.endpoint
      logs        = var.endpoint
      s3          = var.endpoint
      s3vectors   = var.endpoint
      sts         = var.endpoint
    }
  }
}
