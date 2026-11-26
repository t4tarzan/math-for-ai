variable "floci" {
  description = "true = deploy to Floci (the lab); false = real AWS"
  type        = bool
  default     = true
}
variable "endpoint" {
  description = "Floci endpoint"
  type        = string
  default     = "http://localhost:4566"
}
variable "region" {
  type    = string
  default = "us-east-1"
}
variable "name" {
  description = "Prefix for every resource name"
  type        = string
  default     = "ragbot"
}
variable "lab_model_url" {
  description = "OpenAI-compatible base URL for embeddings (the lab's model proxy)"
  type        = string
}
variable "lab_token" {
  description = "Your personal lab token (never a provider API key)"
  type        = string
  sensitive   = true
}
variable "chat_model_id" {
  description = "Bedrock model id the answer Lambda asks for (the lab proxy maps it)"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}
variable "embedding_dimension" {
  type    = number
  default = 1024
}
variable "vector_bucket" {
  description = "S3 Vectors bucket created by `make vectors`"
  type        = string
  default     = "ragbot-vectors"
}
variable "vector_index" {
  description = "S3 Vectors index created by `make vectors`"
  type        = string
  default     = "chunks"
}
