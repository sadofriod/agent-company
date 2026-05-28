CREATE TABLE "agent_markdowns" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "storage_provider" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "profile" TEXT,
    "tool_policy" TEXT,
    "partials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "tools" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "allowed_commands" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "required_commands" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "front_matter" JSONB,
    "size" INTEGER NOT NULL,
    "storage_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_markdowns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_markdowns_path_key" ON "agent_markdowns"("path");