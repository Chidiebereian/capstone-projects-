"""Supervisor + specialist agents for claims processing (Strands Agents on Bedrock AgentCore)."""
import os
from datetime import date

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool

MODEL = os.getenv("MODEL_ID", "us.anthropic.claude-3-5-haiku-20241022-v1:0")

POLICIES = {  # replace with a DynamoDB lookup in production
    "POL-1001": {"holder": "Ada Okafor", "type": "auto", "status": "active", "limit": 25000, "deductible": 500, "start": "2023-02-01"},
    "POL-2002": {"holder": "Marcus Lee", "type": "home", "status": "active", "limit": 60000, "deductible": 1000, "start": "2026-10-20"},
}


@tool
def lookup_policy(policy_id: str) -> dict:
    """Return coverage details for a policy id, or an error if it does not exist."""
    return POLICIES.get(policy_id, {"error": "policy not found"})


@tool
def score_fraud_risk(amount: float, limit: float, policy_start: str, incident_date: str, prior_claims: int, description: str) -> dict:
    """Score fraud risk 0-100 from explainable signals."""
    signals = []
    if amount / limit > 0.7:
        signals.append(("amount above 70% of limit", 25))
    if (date.fromisoformat(incident_date) - date.fromisoformat(policy_start)).days < 30:
        signals.append(("incident within 30 days of policy start", 25))
    if prior_claims >= 2:
        signals.append((f"{prior_claims} prior claims", 15))
    red = [k for k in ("cash", "no receipt", "urgent", "total loss") if k in description.lower()]
    if red:
        signals.append((f"red-flag phrases: {red}", min(20, 7 * len(red))))
    return {"score": max(0, min(100, sum(p for _, p in signals))), "signals": signals}


@tool
def calculate_payout(amount: float, limit: float, deductible: float) -> float:
    """Payout = min(amount, limit) - deductible, floored at zero."""
    return max(0.0, min(amount, limit) - deductible)


policy_agent = Agent(model=MODEL, tools=[lookup_policy],
                     system_prompt="You verify coverage: policy active, claim type matches, claimant is the holder.")
fraud_agent = Agent(model=MODEL, tools=[score_fraud_risk],
                    system_prompt="You assess fraud risk using score_fraud_risk and explain each signal.")
adjudication_agent = Agent(model=MODEL, tools=[calculate_payout],
                           system_prompt="Decide APPROVED, HUMAN_REVIEW (fraud score >= 50) or DENIED (coverage failed). Compute payout.")


@tool
def verify_policy(claim: str) -> str:
    """Policy verification specialist."""
    return str(policy_agent(claim))


@tool
def assess_fraud(claim_and_policy: str) -> str:
    """Fraud detection specialist."""
    return str(fraud_agent(claim_and_policy))


@tool
def adjudicate(case_file: str) -> str:
    """Adjudication specialist that returns the final decision and payout."""
    return str(adjudication_agent(case_file))


supervisor = Agent(
    model=MODEL,
    tools=[verify_policy, assess_fraud, adjudicate],
    system_prompt=(
        "You are a claims supervisor. Extract the claim fields, then call verify_policy, assess_fraud and adjudicate in order. "
        "Return JSON with keys outcome, payout, fraud_score and reason."
    ),
)

app = BedrockAgentCoreApp()


@app.entrypoint
def invoke(payload: dict) -> dict:
    return {"result": str(supervisor(payload.get("prompt", "")))}


if __name__ == "__main__":
    app.run()
