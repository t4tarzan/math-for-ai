# Math for AI — capstone lab: RAG chatbot (Floci edition). Run `make help`.
SHELL := /bin/bash
-include .lab/env
export
export AWS_ENDPOINT_URL ?= http://localhost:4566
export AWS_ACCESS_KEY_ID ?= test
export AWS_SECRET_ACCESS_KEY ?= test
export AWS_DEFAULT_REGION ?= us-east-1

help:            ## list the commands
	@grep -E '^[a-z-]+:.*##' Makefile | sed 's/:.*##/ —/'

login:           ## save your lab token to .lab/env
	@python3 scripts/login.py

vectors:         ## stage 2: create the S3 Vectors bucket and index (safe to re-run)
	@scripts/vectors.sh

deploy:          ## terraform init + apply against Floci
	@terraform -chdir=infra init -input=false >/dev/null && terraform -chdir=infra apply -auto-approve -input=false

upload:          ## stage 1: upload the documents (with doc_id metadata)
	@python3 scripts/upload_docs.py documents

check:           ## run the grader on every stage (add ONLY=3 for one stage)
	@m4ai-lab check rag-chatbot $(if $(ONLY),--only $(ONLY)) --report lab-report.json

destroy:         ## remove everything you deployed
	@terraform -chdir=infra destroy -auto-approve -input=false
