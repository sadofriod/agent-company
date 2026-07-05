-- CreateTable
CREATE TABLE "memory_objects" (
    "id" TEXT NOT NULL,
    "memory_id" TEXT NOT NULL,
    "object_type" TEXT NOT NULL,
    "source_object_type" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "source_object_id" TEXT NOT NULL,
    "session_id" TEXT,
    "ticket_id" TEXT,
    "topic_id" TEXT,
    "pipeline_id" TEXT,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'team',
    "expiry_condition" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "embedding_status" TEXT NOT NULL DEFAULT 'pending',
    "review_state" TEXT NOT NULL DEFAULT 'pending',
    "evidence_refs" JSONB NOT NULL DEFAULT '[]',
    "source_refs" JSONB NOT NULL DEFAULT '[]',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_graph_edges" (
    "id" TEXT NOT NULL,
    "from_id" TEXT NOT NULL,
    "to_id" TEXT NOT NULL,
    "edge_type" TEXT NOT NULL,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_graph_edges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memory_objects_memory_id_key" ON "memory_objects"("memory_id");

-- CreateIndex
CREATE INDEX "memory_objects_scope_session_id_idx" ON "memory_objects"("scope", "session_id");

-- CreateIndex
CREATE INDEX "memory_objects_scope_review_state_idx" ON "memory_objects"("scope", "review_state");

-- CreateIndex
CREATE INDEX "memory_graph_edges_from_id_idx" ON "memory_graph_edges"("from_id");

-- CreateIndex
CREATE INDEX "memory_graph_edges_to_id_idx" ON "memory_graph_edges"("to_id");

-- CreateIndex
CREATE UNIQUE INDEX "memory_graph_edges_from_id_to_id_edge_type_key" ON "memory_graph_edges"("from_id", "to_id", "edge_type");
