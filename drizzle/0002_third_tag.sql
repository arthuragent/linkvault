ALTER TABLE "linkvault_links" ADD COLUMN "transcription_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "linkvault_links" ADD COLUMN "transcription_job_id" text;--> statement-breakpoint
ALTER TABLE "linkvault_links" ADD COLUMN "transcript_text" text;--> statement-breakpoint
ALTER TABLE "linkvault_links" ADD COLUMN "transcript_url" text;--> statement-breakpoint
ALTER TABLE "linkvault_links" ADD COLUMN "audio_url" text;--> statement-breakpoint
ALTER TABLE "linkvault_links" ADD COLUMN "transcription_error" text;--> statement-breakpoint
ALTER TABLE "linkvault_links" ADD COLUMN "transcription_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "linkvault_links" ADD COLUMN "transcription_completed_at" timestamp with time zone;