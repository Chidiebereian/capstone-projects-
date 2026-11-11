"""Visit audio -> transcript -> medical entities + PHI -> redacted SOAP draft."""
import json
import sys
import time
import urllib.request

import boto3

transcribe = boto3.client("transcribe")
cm = boto3.client("comprehendmedical")
rt = boto3.client("bedrock-runtime")
MODEL = "us.anthropic.claude-3-5-haiku-20241022-v1:0"


def transcribe_visit(s3_uri: str, out_bucket: str) -> str:
    name = f"visit-{int(time.time())}"
    transcribe.start_medical_transcription_job(
        MedicalTranscriptionJobName=name, LanguageCode="en-US", Media={"MediaFileUri": s3_uri},
        OutputBucketName=out_bucket, Specialty="PRIMARYCARE", Type="CONVERSATION",
        Settings={"ShowSpeakerLabels": True, "MaxSpeakerLabels": 2},
    )
    while True:
        job = transcribe.get_medical_transcription_job(MedicalTranscriptionJobName=name)["MedicalTranscriptionJob"]
        if job["TranscriptionJobStatus"] in ("COMPLETED", "FAILED"):
            break
        time.sleep(10)
    # The transcript URI is a presigned S3 URL; use s3.get_object instead if the bucket blocks it.
    with urllib.request.urlopen(job["Transcript"]["TranscriptFileUri"]) as f:
        return json.load(f)["results"]["transcripts"][0]["transcript"]


def redact(text: str) -> str:
    for e in sorted(cm.detect_phi(Text=text)["Entities"], key=lambda e: e["BeginOffset"], reverse=True):
        text = text[: e["BeginOffset"]] + f"[{e['Type']}]" + text[e["EndOffset"]:]
    return text


def soap_note(transcript: str) -> str:
    ents = cm.detect_entities_v2(Text=transcript)["Entities"]
    facts = [{"text": e["Text"], "category": e["Category"], "type": e["Type"]} for e in ents if e["Score"] > 0.7]
    prompt = (
        "Write a concise SOAP note (Subjective, Objective, Assessment, Plan) using ONLY facts present in the transcript. "
        "Mark anything uncertain as 'to confirm'.\n\n"
        f"<transcript>{redact(transcript)}</transcript>\n<entities>{json.dumps(facts)}</entities>"
    )
    res = rt.converse(modelId=MODEL, messages=[{"role": "user", "content": [{"text": prompt}]}],
                      inferenceConfig={"maxTokens": 800, "temperature": 0})
    return redact(res["output"]["message"]["content"][0]["text"])


if __name__ == "__main__":
    print(soap_note(transcribe_visit(sys.argv[1], sys.argv[2])))
