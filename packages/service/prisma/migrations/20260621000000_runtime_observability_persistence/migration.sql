CREATE TABLE "runtime_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "trace_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "actor" JSONB,
    "target" JSONB,
    "state_patch_json" JSONB,
    "metrics_json" JSONB,
    "payload_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runtime_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "runtime_snapshots" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "trace_id" TEXT NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runtime_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "runtime_events_event_id_key" ON "runtime_events"("event_id");
CREATE UNIQUE INDEX "runtime_events_session_id_sequence_key" ON "runtime_events"("session_id", "sequence");
CREATE INDEX "runtime_events_session_id_sequence_idx" ON "runtime_events"("session_id", "sequence");

CREATE UNIQUE INDEX "runtime_snapshots_session_id_sequence_key" ON "runtime_snapshots"("session_id", "sequence");
CREATE INDEX "runtime_snapshots_session_id_updated_at_idx" ON "runtime_snapshots"("session_id", "updated_at");
