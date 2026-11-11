"""Rekognition labels -> spoken description with Polly."""
import sys

import boto3

rek = boto3.client("rekognition")
polly = boto3.client("polly")

with open(sys.argv[1] if len(sys.argv) > 1 else "photo.jpg", "rb") as f:
    labels = rek.detect_labels(Image={"Bytes": f.read()}, MaxLabels=8, MinConfidence=80)["Labels"]

names = [l["Name"].lower() for l in labels]
sentence = "This image contains " + (", ".join(names[:-1]) + " and " + names[-1] if len(names) > 1 else (names or ["nothing I recognise"])[0]) + "."
print(sentence)

audio = polly.synthesize_speech(Text=sentence, OutputFormat="mp3", VoiceId="Joanna", Engine="neural")
with open("description.mp3", "wb") as out:
    out.write(audio["AudioStream"].read())
