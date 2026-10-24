CREATE TYPE "public"."actor_type" AS ENUM('user', 'api_key', 'system', 'wallet');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('open', 'awaiting_signature', 'signed', 'submitted', 'confirmed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."indexer_status" AS ENUM('running', 'halted');--> statement-breakpoint
CREATE TYPE "public"."revocation_reason_code" AS ENUM('error', 'fraud', 'superseded', 'holder_request', 'other');--> statement-breakpoint
CREATE TYPE "public"."revocation_source" AS ENUM('platform', 'wallet');--> statement-breakpoint
CREATE TYPE "public"."revocation_status" AS ENUM('prepared', 'submitted', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."delivery_channel" AS ENUM('email');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'ready', 'batched', 'issued', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."data_availability" AS ENUM('onchain_encrypted', 'offchain_only');--> statement-breakpoint
CREATE TYPE "public"."template_version_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."wallet_status" AS ENUM('active', 'disabled', 'compromised');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_status" AS ENUM('pending', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "assets" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"filename" text NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"mime_type" text NOT NULL,
	"organization_id" text NOT NULL,
	"s3_key" text NOT NULL,
	"sha256" text NOT NULL,
	"size" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"action" text NOT NULL,
	"actor_id" text,
	"actor_type" "actor_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"ip" text,
	"metadata" jsonb,
	"organization_id" text NOT NULL,
	"request_id" text,
	"target_id" text,
	"target_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"access_token" text,
	"access_token_expires_at" timestamp,
	"account_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"id_token" text,
	"password" text,
	"provider_id" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikeys" (
	"created_at" timestamp NOT NULL,
	"enabled" boolean DEFAULT true,
	"expires_at" timestamp,
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"last_refill_at" timestamp,
	"last_request" timestamp,
	"metadata" text,
	"name" text,
	"permissions" text,
	"prefix" text,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_max" integer DEFAULT 10,
	"rate_limit_time_window" integer DEFAULT 86400000,
	"refill_amount" integer,
	"refill_interval" integer,
	"remaining" integer,
	"request_count" integer DEFAULT 0,
	"start" text,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"inviter_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"created_at" timestamp NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"created_at" timestamp NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"logo" text,
	"metadata" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"image" text,
	"name" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"attempts" integer DEFAULT 0 NOT NULL,
	"block_number" text,
	"block_timestamp" timestamp,
	"cancelled_at" timestamp,
	"chain_id" text NOT NULL,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"data_hash" text,
	"data_object_key" text,
	"id" text PRIMARY KEY NOT NULL,
	"issuer_wallet_id" text NOT NULL,
	"last_error" text,
	"leaf_count" integer,
	"organization_id" text NOT NULL,
	"registry_address" text NOT NULL,
	"registry_version" text,
	"root" text,
	"sealed_at" timestamp,
	"signature" text,
	"signed_at" timestamp,
	"status" "batch_status" DEFAULT 'open' NOT NULL,
	"submitted_at" timestamp,
	"tx_hash" text,
	"typed_data" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"window_end" timestamp,
	"window_start" timestamp
);
--> statement-breakpoint
CREATE TABLE "chain_events" (
	"args" jsonb NOT NULL,
	"block_hash" text NOT NULL,
	"block_number" text NOT NULL,
	"chain_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"event_name" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"log_index" text NOT NULL,
	"processed_at" timestamp,
	"tx_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indexer_state" (
	"address" text NOT NULL,
	"chain_id" text PRIMARY KEY NOT NULL,
	"halted_reason" text,
	"last_block" text DEFAULT '0' NOT NULL,
	"last_block_hash" text,
	"status" "indexer_status" DEFAULT 'running' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registry_deployments" (
	"abi_hash" text NOT NULL,
	"address" text NOT NULL,
	"chain_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deployed_block" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_active" text DEFAULT 'true' NOT NULL,
	"version" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revocations" (
	"block_number" text,
	"block_timestamp" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"document_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"note" text,
	"reason_code" "revocation_reason_code" NOT NULL,
	"requested_by" text,
	"source" "revocation_source" NOT NULL,
	"status" "revocation_status" DEFAULT 'prepared' NOT NULL,
	"tx_hash" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_deliveries" (
	"attempts" integer DEFAULT 0 NOT NULL,
	"channel" "delivery_channel" DEFAULT 'email' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"document_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"last_error" text,
	"sent_at" timestamp,
	"status" "delivery_status" DEFAULT 'queued' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"batch_id" text,
	"claimed_issued_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"expires_at" timestamp,
	"external_ref" text,
	"id" text PRIMARY KEY NOT NULL,
	"issuer_wallet_id" text NOT NULL,
	"kek_id" text NOT NULL,
	"leaf" text,
	"leaf_index" text,
	"merkle_proof" jsonb,
	"organization_id" text NOT NULL,
	"payload_enc" text NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"template_version_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"key" text NOT NULL,
	"method" text NOT NULL,
	"organization_id" text NOT NULL,
	"path" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_body" jsonb,
	"response_status" integer
);
--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"auto_seal" boolean DEFAULT true NOT NULL,
	"batch_window_minutes" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"data_availability" "data_availability" DEFAULT 'onchain_encrypted' NOT NULL,
	"default_expiry_days" integer,
	"default_wallet_id" text,
	"organization_id" text PRIMARY KEY NOT NULL,
	"require_verified_domain" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"field_schema" jsonb NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"layout" text NOT NULL,
	"published_at" timestamp,
	"schema_hash" text,
	"status" "template_version_status" DEFAULT 'draft' NOT NULL,
	"template_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"version" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"description" text,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issuer_wallets" (
	"address" text NOT NULL,
	"chain_id" text NOT NULL,
	"compromised_from" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"domain" text,
	"domain_verified_at" timestamp,
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"organization_id" text NOT NULL,
	"status" "wallet_status" DEFAULT 'active' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp,
	"endpoint_id" text NOT NULL,
	"event" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"last_error" text,
	"last_status_code" integer,
	"next_attempt_at" timestamp NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "webhook_delivery_status" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"events" text[] NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"secret_enc" text NOT NULL,
	"status" "webhook_status" DEFAULT 'active' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apikeys" ADD CONSTRAINT "apikeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_issuer_wallet_id_issuer_wallets_id_fk" FOREIGN KEY ("issuer_wallet_id") REFERENCES "public"."issuer_wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revocations" ADD CONSTRAINT "revocations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revocations" ADD CONSTRAINT "revocations_requested_by_issuer_wallets_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."issuer_wallets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_deliveries" ADD CONSTRAINT "document_deliveries_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_issuer_wallet_id_issuer_wallets_id_fk" FOREIGN KEY ("issuer_wallet_id") REFERENCES "public"."issuer_wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_template_version_id_template_versions_id_fk" FOREIGN KEY ("template_version_id") REFERENCES "public"."template_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer_wallets" ADD CONSTRAINT "issuer_wallets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer_wallets" ADD CONSTRAINT "issuer_wallets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_organization_created_idx" ON "assets" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_organization_created_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" USING btree ("organization_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "apikeys_key_idx" ON "apikeys" USING btree ("key");--> statement-breakpoint
CREATE INDEX "apikeys_userId_idx" ON "apikeys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitations_organizationId_idx" ON "invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "members_organizationId_idx" ON "members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "members_userId_idx" ON "members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uidx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "batches_organization_status_idx" ON "batches" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "batches_issuer_wallet_status_idx" ON "batches" USING btree ("issuer_wallet_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "batches_issuer_wallet_root_uidx" ON "batches" USING btree ("issuer_wallet_id","root") WHERE "batches"."root" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "chain_events_tx_log_uidx" ON "chain_events" USING btree ("tx_hash","log_index");--> statement-breakpoint
CREATE INDEX "chain_events_block_idx" ON "chain_events" USING btree ("chain_id","block_number");--> statement-breakpoint
CREATE INDEX "chain_events_processed_idx" ON "chain_events" USING btree ("processed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "registry_deployments_chain_uidx" ON "registry_deployments" USING btree ("chain_id");--> statement-breakpoint
CREATE INDEX "registry_deployments_active_idx" ON "registry_deployments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "revocations_document_idx" ON "revocations" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "revocations_status_idx" ON "revocations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "revocations_document_pending_uidx" ON "revocations" USING btree ("document_id") WHERE "revocations"."status" IN ('prepared', 'submitted');--> statement-breakpoint
CREATE INDEX "document_deliveries_document_idx" ON "document_deliveries" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_deliveries_status_idx" ON "document_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_organization_created_idx" ON "documents" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "documents_organization_status_idx" ON "documents" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "documents_template_version_idx" ON "documents" USING btree ("template_version_id");--> statement-breakpoint
CREATE INDEX "documents_batch_idx" ON "documents" USING btree ("batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_leaf_uidx" ON "documents" USING btree ("leaf") WHERE "documents"."leaf" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_organization_external_ref_uidx" ON "documents" USING btree ("organization_id","external_ref") WHERE "documents"."external_ref" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_organization_key_uidx" ON "idempotency_keys" USING btree ("organization_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "template_versions_template_version_uidx" ON "template_versions" USING btree ("template_id","version");--> statement-breakpoint
CREATE INDEX "template_versions_template_id_idx" ON "template_versions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_versions_status_idx" ON "template_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "templates_organization_id_idx" ON "templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "templates_archived_at_idx" ON "templates" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "templates_organization_name_uidx" ON "templates" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "issuer_wallets_address_chain_uidx" ON "issuer_wallets" USING btree ("address","chain_id");--> statement-breakpoint
CREATE INDEX "issuer_wallets_organization_idx" ON "issuer_wallets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_endpoint_idx" ON "webhook_deliveries" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_status_next_attempt_idx" ON "webhook_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_organization_idx" ON "webhook_endpoints" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_status_idx" ON "webhook_endpoints" USING btree ("status");