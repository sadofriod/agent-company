CREATE TABLE "team_schemas" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_schemas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "team_schemas_key_key" ON "team_schemas"("key");