# 04 · Transformer Tokenizer & Decoding Lab

**Live demo:** https://chidiebereian.github.io/capstone-projects-/#/tokenizer

Explains two ideas that drive LLM cost and behaviour: **tokenization** (byte-pair encoding) and **decoding** (temperature, top-k, top-p).

- The browser demo trains a BPE tokenizer live, using the GPT-2 pre-tokenization regex, on whatever text you type, and shows every merge.
- `src/explore_gpt2.py` does the same exploration with the real GPT-2 tokenizer and model from Hugging Face. It compares greedy, top-k and nucleus sampling.
- `src/token_cost.py` counts tokens for a prompt via the Bedrock Converse API `usage` field, to connect tokens to cost.

```bash
pip install -r requirements.txt
python src/explore_gpt2.py
```

**Builds on labs** 01, 02, 03, 04.
