CREATE EXTERNAL TABLE IF NOT EXISTS clickstream.events (
  event_id string, user_id string, event_type string, region string, revenue double, ts double
)
PARTITIONED BY (dt string, hour int)
STORED AS PARQUET
LOCATION 's3://clickstream-lake/events/'
TBLPROPERTIES (
  'projection.enabled' = 'true',
  'projection.dt.type' = 'date', 'projection.dt.format' = 'yyyy-MM-dd', 'projection.dt.range' = '2026-01-01,NOW',
  'projection.hour.type' = 'integer', 'projection.hour.range' = '0,23',
  'storage.location.template' = 's3://clickstream-lake/events/dt=${dt}/hour=${hour}/'
);

-- Revenue by region
SELECT region, SUM(revenue) AS revenue, COUNT_IF(event_type = 'purchase') AS orders
FROM clickstream.events WHERE dt = '2026-11-11'
GROUP BY region ORDER BY revenue DESC;

-- Conversion rate
SELECT region,
  ROUND(100.0 * COUNT_IF(event_type = 'purchase') / COUNT_IF(event_type = 'view'), 2) AS conversion_pct
FROM clickstream.events WHERE dt = '2026-11-11'
GROUP BY region;
