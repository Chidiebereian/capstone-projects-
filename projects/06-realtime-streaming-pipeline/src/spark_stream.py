"""Spark Structured Streaming: Kinesis -> 10 s windows -> partitioned Parquet on S3."""
from pyspark.sql import SparkSession, functions as F, types as T

spark = SparkSession.builder.appName("clickstream").getOrCreate()

schema = T.StructType([
    T.StructField("event_id", T.StringType()), T.StructField("user_id", T.StringType()),
    T.StructField("event_type", T.StringType()), T.StructField("region", T.StringType()),
    T.StructField("revenue", T.DoubleType()), T.StructField("ts", T.DoubleType()),
])

raw = (spark.readStream.format("kinesis")  # Kinesis connector (built into Glue streaming / EMR)
       .option("streamName", "clickstream").option("region", "us-east-1")
       .option("startingPosition", "LATEST").load())

events = (raw.select(F.from_json(F.col("data").cast("string"), schema).alias("e")).select("e.*")
          .withColumn("event_time", F.to_timestamp(F.from_unixtime("ts"))))

windows = (events.withWatermark("event_time", "30 seconds")
           .groupBy(F.window("event_time", "10 seconds"), "region", "event_type")
           .agg(F.count("*").alias("events"), F.sum("revenue").alias("revenue"))
           .withColumn("dt", F.to_date(F.col("window.start")))
           .withColumn("hour", F.hour(F.col("window.start"))))

(windows.writeStream.format("parquet").outputMode("append")
 .option("path", "s3://clickstream-lake/aggregates/")
 .option("checkpointLocation", "s3://clickstream-lake/_checkpoints/aggregates/")
 .partitionBy("dt", "hour").trigger(processingTime="10 seconds").start().awaitTermination())
