"""Inspect GPT-2 BPE tokenization and compare decoding strategies."""
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

tok = AutoTokenizer.from_pretrained("gpt2")
model = AutoModelForCausalLM.from_pretrained("gpt2")

text = "Amazon Bedrock makes foundation models available through one API."
ids = tok.encode(text)
print(f"{len(text)} chars -> {len(ids)} tokens ({len(text) / len(ids):.2f} chars/token)")
print([tok.convert_ids_to_tokens(i) for i in ids])  # the Ġ prefix marks a leading space

prompt = tok("The cloud is", return_tensors="pt")
with torch.no_grad():
    logits = model(**prompt).logits[0, -1]
top = torch.topk(torch.softmax(logits, -1), 8)
for p, i in zip(top.values, top.indices):
    print(f"{tok.decode(i)!r:>14}  {p.item():.3f}")

strategies = {
    "greedy": dict(do_sample=False),
    "top-k=40, T=0.8": dict(do_sample=True, top_k=40, temperature=0.8),
    "nucleus p=0.9": dict(do_sample=True, top_p=0.9, top_k=0),
}
torch.manual_seed(7)
for name, kw in strategies.items():
    out = model.generate(**prompt, max_new_tokens=25, pad_token_id=tok.eos_token_id, **kw)
    print(f"\n[{name}] {tok.decode(out[0], skip_special_tokens=True)}")
