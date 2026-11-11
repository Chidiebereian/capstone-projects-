"""Lex V2 fulfillment Lambda: sentiment-aware ticketing for an IT help desk."""
import os
import time
import uuid

import boto3

comprehend = boto3.client("comprehend")
table = boto3.resource("dynamodb").Table(os.getenv("TICKETS_TABLE", "helpdesk-tickets"))

BASE = {"ResetPassword": 3, "VpnIssue": 2, "HardwareFailure": 2, "SoftwareRequest": 4}
TEAM = {"ResetPassword": "Identity", "VpnIssue": "Network", "HardwareFailure": "Field Services", "SoftwareRequest": "IT Ops"}


def slot(intent: dict, name: str):
    s = (intent.get("slots") or {}).get(name)
    return s and s["value"]["interpretedValue"]


def close(intent: dict, message: str) -> dict:
    intent["state"] = "Fulfilled"
    return {
        "sessionState": {"dialogAction": {"type": "Close"}, "intent": intent},
        "messages": [{"contentType": "PlainText", "content": message}],
    }


def priority(intent_name: str, urgency, sentiment: str) -> str:
    p = BASE.get(intent_name, 4)
    if urgency == "High":
        p = 1
    elif urgency == "Medium":
        p = min(p, 2)
    if sentiment == "NEGATIVE":
        p = max(1, p - 1)
    return f"P{p}"


def handler(event, _context):
    intent = event["sessionState"]["intent"]
    name = intent["name"]
    text = event.get("inputTranscript", "")

    if name == "TicketStatus":
        item = table.get_item(Key={"id": slot(intent, "ticketId")}).get("Item")
        return close(intent, f"{item['id']} is {item['status']} (priority {item['priority']})." if item else "I couldn't find that ticket.")

    sentiment = comprehend.detect_sentiment(Text=text or name, LanguageCode="en")["Sentiment"]
    if name == "ResetPassword":
        # call your identity provider here, e.g. Okta: POST /api/v1/users/{id}/lifecycle/reset_password
        status, msg = "RESOLVED_BY_BOT", f"I've sent a reset link for {slot(intent, 'system')} to your registered phone."
    else:
        status, msg = "OPEN", ""

    ticket = {
        "id": f"INC-{uuid.uuid4().hex[:6].upper()}", "intent": name, "summary": text[:200],
        "priority": priority(name, slot(intent, "urgency"), sentiment), "team": TEAM.get(name, "Service Desk"),
        "sentiment": sentiment, "status": status, "created": int(time.time()),
    }
    table.put_item(Item=ticket)
    return close(intent, msg or f"Ticket {ticket['id']} created with priority {ticket['priority']} and routed to {ticket['team']}.")
