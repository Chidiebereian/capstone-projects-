# Lab 36 · Data Pipeline using Kinesis, Spark and S3

**Track:** Data Engineering · **Mode:** Code · **Services:** Kinesis Data Streams, Apache Spark, Amazon S3

## Objective
Consumed a Kinesis stream with Spark Structured Streaming, aggregated in windows and wrote Parquet to S3.

## What I did
- Parsed JSON events into a schema
- Applied watermarks and tumbling windows
- Wrote partitioned Parquet output

## Reference code
Implemented in capstone [`projects/06-realtime-streaming-pipeline`](../../projects/06-realtime-streaming-pipeline).

## Used in capstones
- [Real-Time Clickstream Analytics Pipeline](../../projects/06-realtime-streaming-pipeline) · [live demo](https://chidiebereian.github.io/capstone-projects-/#/streaming)
