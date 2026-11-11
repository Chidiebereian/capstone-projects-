"""InvokeModel for text, image and code generation (provider-specific request bodies)."""
import base64
import json

import boto3

rt = boto3.client("bedrock-runtime")

# Text (Anthropic Messages format)
body = {"anthropic_version": "bedrock-2023-05-31", "max_tokens": 300,
        "messages": [{"role": "user", "content": "Write a two-line product description for a smart thermostat."}]}
res = rt.invoke_model(modelId="us.anthropic.claude-3-5-haiku-20241022-v1:0", body=json.dumps(body))
print(json.loads(res["body"].read())["content"][0]["text"])

# Image (Titan Image Generator); the response holds base64 images
body = {"taskType": "TEXT_IMAGE", "textToImageParams": {"text": "isometric illustration of a data center, soft light"},
        "imageGenerationConfig": {"numberOfImages": 1, "height": 512, "width": 512, "cfgScale": 8.0}}
res = rt.invoke_model(modelId="amazon.titan-image-generator-v2:0", body=json.dumps(body))
with open("image.png", "wb") as f:
    f.write(base64.b64decode(json.loads(res["body"].read())["images"][0]))

# Code
body["textToImageParams"] = None
code_req = {"anthropic_version": "bedrock-2023-05-31", "max_tokens": 400,
            "messages": [{"role": "user", "content": "Python function that validates an email with a regex, with doctests."}]}
res = rt.invoke_model(modelId="us.anthropic.claude-3-5-haiku-20241022-v1:0", body=json.dumps(code_req))
print(json.loads(res["body"].read())["content"][0]["text"])
