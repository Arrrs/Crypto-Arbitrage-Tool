-- Query Name: Recent Error Logs
-- Description: Latest application errors with context
-- Visualization: Table with expandable metadata
-- Add filters for category and time range

SELECT
  timestamp,
  category,
  message,
  metadata->>'userId' as "userId",
  metadata->>'requestId' as "requestId",
  metadata->>'adminId' as "adminId",
  stack,
  metadata
FROM app_logs
WHERE
  level = 'ERROR'
  AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 100;
