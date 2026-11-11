"""Create a Bedrock guardrail mirroring the policy used in the browser demo."""
import boto3

bedrock = boto3.client("bedrock")

resp = bedrock.create_guardrail(
    name="capstone-gateway",
    blockedInputMessaging="Sorry, I can't help with that request. It conflicts with our usage policy.",
    blockedOutputsMessaging="Sorry, I can't share that response.",
    contentPolicyConfig={"filtersConfig": [
        {"type": "HATE", "inputStrength": "HIGH", "outputStrength": "HIGH"},
        {"type": "INSULTS", "inputStrength": "MEDIUM", "outputStrength": "MEDIUM"},
        {"type": "MISCONDUCT", "inputStrength": "HIGH", "outputStrength": "HIGH"},
        {"type": "PROMPT_ATTACK", "inputStrength": "HIGH", "outputStrength": "NONE"},
    ]},
    topicPolicyConfig={"topicsConfig": [
        {"name": "Investment advice", "type": "DENY",
         "definition": "Recommendations about specific stocks, crypto or investment strategies.",
         "examples": ["Should I buy Nvidia stock?", "Is bitcoin a good retirement investment?"]},
        {"name": "Medical diagnosis", "type": "DENY",
         "definition": "Diagnosing conditions or recommending prescriptions or dosages."},
    ]},
    wordPolicyConfig={"wordsConfig": [{"text": "competitorx"}], "managedWordListsConfig": [{"type": "PROFANITY"}]},
    sensitiveInformationPolicyConfig={"piiEntitiesConfig": [
        {"type": "EMAIL", "action": "ANONYMIZE"},
        {"type": "PHONE", "action": "ANONYMIZE"},
        {"type": "CREDIT_DEBIT_CARD_NUMBER", "action": "ANONYMIZE"},
        {"type": "IP_ADDRESS", "action": "ANONYMIZE"},
        {"type": "US_SOCIAL_SECURITY_NUMBER", "action": "BLOCK"},
        {"type": "AWS_ACCESS_KEY", "action": "BLOCK"},
    ]},
)
version = bedrock.create_guardrail_version(guardrailIdentifier=resp["guardrailId"])["version"]
print(f"GUARDRAIL_ID={resp['guardrailId']} GUARDRAIL_VERSION={version}")
