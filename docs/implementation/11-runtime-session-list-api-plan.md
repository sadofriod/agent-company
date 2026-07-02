# Runtime Session List API Integration Plan

## Goal
Add a paginated session list API to support the run page sidebar with:
- stable paging for long-running data
- status filtering
- newest-first ordering
- efficient incremental loading

## Endpoint Contract

### HTTP
- Method: `GET`
- Path: `/runtime/sessions`

### Query Parameters
- `schemaKey` (required, string): team schema key, example `current`
- `pageSize` (optional, number): default `20`, max `100`
- `cursor` (optional, string): opaque cursor from previous page
- `status` (optional, enum): `running | paused | terminated`
- `from` (optional, ISO string): updatedAt lower bound
- `to` (optional, ISO string): updatedAt upper bound

### Response
```json
{
  "data": {
    "items": [
      {
        "sessionId": "7d96f4cd-5248-42d8-8670-f53dc401d212",
        "schemaKey": "current",
        "status": "running",
        "createdAt": "2026-07-02T13:20:29.000Z",
        "updatedAt": "2026-07-02T13:21:12.000Z",
        "task": {
          "title": "Deliver onboarding flow",
          "goal": "Ship MVP onboarding in this sprint"
        },
        "summary": {
          "activeNodeCount": 3,
          "activeEdgeCount": 2,
          "eventCount": 41
        }
      }
    ],
    "pageInfo": {
      "nextCursor": "eyJ1cGRhdGVkQXQiOiIyMDI2LTA3LTAyVDEzOjIxOjEyLjAwMFoiLCJzZXNzaW9uSWQiOiI3ZDk2ZjRjZC01MjQ4LTQyZDgtODY3MC1mNTNkYzQwMWQyMTIifQ==",
      "hasMore": true,
      "pageSize": 20
    }
  }
}
```

## Cursor Strategy (Keyset Pagination)

### Sort Order
Use deterministic order:
1. `updated_at DESC`
2. `session_id DESC`

### Cursor Payload
Encode as base64 JSON:
```json
{
  "updatedAt": "2026-07-02T13:21:12.000Z",
  "sessionId": "7d96f4cd-5248-42d8-8670-f53dc401d212"
}
```

### SQL Condition
For next page:
- `(updated_at < cursor.updatedAt)`
- OR `(updated_at = cursor.updatedAt AND session_id < cursor.sessionId)`

This avoids offset drift when rows are inserted/updated during paging.

## Backend Types (Service)

```ts
export type RuntimeSessionListItem = {
  sessionId: string;
  schemaKey: string;
  status: 'running' | 'paused' | 'terminated';
  createdAt: string;
  updatedAt: string;
  task: {
    title: string;
    goal: string;
  };
  summary: {
    activeNodeCount: number;
    activeEdgeCount: number;
    eventCount: number;
  };
};

export type RuntimeSessionListQuery = {
  schemaKey: string;
  pageSize?: number;
  cursor?: string;
  status?: 'running' | 'paused' | 'terminated';
  from?: string;
  to?: string;
};

export type RuntimeSessionListPage = {
  items: RuntimeSessionListItem[];
  pageInfo: {
    nextCursor: string | null;
    hasMore: boolean;
    pageSize: number;
  };
};
```

## Database and Index Plan

### Table Requirements
Persist minimal listing fields in `runtime_sessions`:
- `session_id` (PK)
- `schema_key` (indexed)
- `status`
- `task_title`
- `task_goal`
- `created_at`
- `updated_at`

### Indexes
- `idx_runtime_sessions_schema_updated`: `(schema_key, updated_at DESC, session_id DESC)`
- `idx_runtime_sessions_schema_status_updated`: `(schema_key, status, updated_at DESC, session_id DESC)`

These indexes support both default list and status-filtered list.

## Frontend Types and RTK Query Plan

### Frontend Types
```ts
export type RuntimeSessionListItemDto = {
  sessionId: string;
  schemaKey: string;
  status: 'running' | 'paused' | 'terminated';
  createdAt: string;
  updatedAt: string;
  task: { title: string; goal: string };
  summary: { activeNodeCount: number; activeEdgeCount: number; eventCount: number };
};

export type RuntimeSessionListPageDto = {
  items: RuntimeSessionListItemDto[];
  pageInfo: {
    nextCursor: string | null;
    hasMore: boolean;
    pageSize: number;
  };
};
```

### RTK Query Endpoint
```ts
listRuntimeSessions: builder.query<RuntimeSessionListPageDto, {
  schemaKey: string;
  pageSize?: number;
  cursor?: string;
  status?: 'running' | 'paused' | 'terminated';
}>({
  query: (params) => ({
    url: '/runtime/sessions',
    params,
  }),
  transformResponse: (payload) => unwrapEnvelope<RuntimeSessionListPageDto>(payload),
})
```

### UI Integration
1. Initial load with `{ schemaKey, pageSize: 20 }`
2. Render returned items in left sidebar
3. On scroll bottom, call next page with `cursor=pageInfo.nextCursor`
4. Merge pages by `sessionId` dedupe + newest-first sort
5. Keep current optimistic local insert when a new session starts, then reconcile with list API

## Error Model
- 400: invalid cursor or pageSize
- 404: schemaKey not found
- 422: date range invalid (`from > to`)
- 500: internal storage error

Recommended error body:
```json
{
  "error": {
    "code": "INVALID_CURSOR",
    "message": "Cursor is malformed or expired"
  }
}
```

## Rollout Plan
1. Add service route and validation for query params
2. Add repository keyset query + indexes
3. Add API tests for page stability and status filter
4. Add frontend RTK endpoint and sidebar pagination
5. Keep local fallback list for first deploy, remove after API stability

## Compatibility Notes
- Existing `GET /runtime/session/:id` remains unchanged
- New list API is additive and backward-compatible
- Cursor is opaque and versionable; future cursor schema changes should include a `v` field
