"""Summarize Bedrock usage per model from CloudWatch over the last N days."""
from datetime import datetime, timedelta, timezone

import boto3

cw = boto3.client("cloudwatch")
RATES = {  # example USD per 1M tokens (input, output); replace with current pricing
    "anthropic.claude-3-5-haiku-20241022-v1:0": (0.8, 4.0),
}


def total(model_id: str, metric: str, days: int, stat: str = "Sum") -> float:
    end = datetime.now(timezone.utc)
    res = cw.get_metric_statistics(
        Namespace="AWS/Bedrock", MetricName=metric, Dimensions=[{"Name": "ModelId", "Value": model_id}],
        StartTime=end - timedelta(days=days), EndTime=end, Period=86400, Statistics=[stat],
    )
    vals = [p[stat] for p in res["Datapoints"]]
    if stat == "Average":
        return sum(vals) / len(vals) if vals else 0.0
    return sum(vals)


def report(days: int = 7) -> None:
    for model, (rin, rout) in RATES.items():
        inv = total(model, "Invocations", days)
        tin, tout = total(model, "InputTokenCount", days), total(model, "OutputTokenCount", days)
        lat = total(model, "InvocationLatency", days, "Average")
        cost = tin / 1e6 * rin + tout / 1e6 * rout
        print(f"{model}: {inv:,.0f} calls, {tin:,.0f} in / {tout:,.0f} out tokens, avg {lat:.0f} ms, ~${cost:,.2f}")


if __name__ == "__main__":
    report()
