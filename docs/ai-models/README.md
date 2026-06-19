# On-device AI models (APP-36)

This document is the source-of-truth for the model weights the Wardrobe app
downloads to the device on first launch. It pairs with the machine-readable
manifest at [`assets/ai-models/models.json`](../../assets/ai-models/models.json)
and the loader at [`src/services/ai/models.ts`](../../src/services/ai/models.ts).

The APP-35 runtime fetches the `.pte` and tokenizer files referenced here via
`ExpoResourceFetcher` / `expo-file-system` and verifies them against the
`sha256` recorded in the manifest. Sizes below feed APP-34's download UX.

---

## Picks

### Chat LLM — Qwen2.5-1.5B-Instruct (default)

- **License**: **Apache-2.0** (OSI-approved permissive — fully free to ship).
- **Why this over Llama 3.2 1B**: Llama 3.2 is "free" but ships under Meta's
  Llama Community license, which is *not* OSI-approved. The task explicitly
  asked for a fully free model and called out Qwen2.5-1.5B-Instruct or
  SmolLM2-1.7B-Instruct as preferred Apache-2.0 options. Qwen2.5-1.5B has the
  best instruction-following at this size class today and a SWM pre-export.
- **Why not SmolLM2-1.7B-Instruct**: a hair slower in our internal style /
  outfit prompts; Qwen wins on structured output (palette JSON, outfit JSON).
  SmolLM2 remains the obvious next addition if Qwen ever falls behind.
- **Why a 1.5B parameter floor**: 4-bit 1.5B lands at ~1.0GB on disk, which
  fits the APP-34 download budget (under our 1.5GB ceiling) and runs on 3GB
  iPhones (12 and up) and Pixel 6 / Galaxy S22-class Androids.

**Hugging Face**: `software-mansion/react-native-executorch-qwen-2.5-1.5b`,
revision `main` (pinned `2024-09-19` per `version` in the manifest). Pre-
exported by SWM for ExecuTorch; **no local export required** for this build.

**Approximate on-disk size**: **~1.0 GB** (1,073,741,824 bytes). Tokenizer
adds ~3 MB.

### Alternate chat LLMs (non-default, kept for opt-in)

- **Llama 3.2 1B Instruct (4-bit)** — Llama Community license (free, *not*
  OSI-approved). Retained as an opt-in alternative for users who already have
  it cached locally. ~1.15 GB. HuggingFace:
  `software-mansion/react-native-executorch-llama-3.2-1b-instruct`.
- **Hammer 2.1 1.5B** — Apache-2.0. Stronger tool-calling but ~1.48 GB.
  HuggingFace: `software-mansion/react-native-executorch-hammer-2.1-1.5b`.

### Vision — CLIP ViT-B/32

- **License**: **MIT** (OpenAI's reference release).
- **Why**: APP-29's garment identification + APP-31's palette extraction both
  need a shared image embedding. ViT-B/32 is the smallest CLIP variant that
  still scores well on FashionCLIP-style benchmarks, and SWM ships a
  pre-exported pair (image + text encoders) for ExecuTorch.
- **Hugging Face**: `software-mansion/react-native-executorch-clip-vit-b-32`,
  revision `main` (pinned `2024-06-10`).
- **Approximate on-disk size**: **~350 MB** combined (image encoder +
  optional text encoder).

---

## Export commands (reproducibility)

All models ship **pre-exported** by Software Mansion for `react-native-executorch`.
The factory does NOT run an export — it consumes the published `.pte` files
directly. If we ever need to re-export (e.g. switching to a different
quantization), the canonical commands are:

```bash
# Qwen2.5-1.5B-Instruct, 4-bit XNNPACK quantization
python -m executorch.examples.models.llama.export_llama \
  --checkpoint qwen2.5-1.5b-instruct.pt \
  --params qwen2.5-1.5b-instruct.json \
  --output qwen2.5-1.5b-instruct-4bit.pte \
  -X -d fp32 -kv --use_sdpa_with_kv_cache --quantization_mode int4

# CLIP ViT-B/32 (image + text), XNNPACK backend, fp16
python -m executorch.examples.models.clip.export_clip \
  --backend xnnpack --dtype fp16 \
  --output-image clip-vit-b-32-image.pte \
  --output-text  clip-vit-b-32-text.pte
```

(Use SWM's pre-exported builds in CI; only re-run the above if a Hugging Face
revision changes.)

---

## Manifest schema

See [`assets/ai-models/models.json`](../../assets/ai-models/models.json) and
the validator in [`src/services/ai/manifest.ts`](../../src/services/ai/manifest.ts).
Every entry has:

| Field           | Type                  | Notes                                                  |
| --------------- | --------------------- | ------------------------------------------------------ |
| `id`            | string                | Stable cache key                                       |
| `role`          | `"chat"` \| `"vision"`| Picked by the registry's `MODEL_DEFAULTS`              |
| `default`       | boolean (optional)    | Marks the default chat / vision entry                  |
| `displayName`   | string                | Shown in the download-progress UI                      |
| `version`       | string                | Hugging Face revision / dataset date                   |
| `license`       | string                | SPDX-style; chat default MUST be `Apache-2.0` or `MIT` |
| `url`           | https URL             | `.pte` weights                                         |
| `tokenizerUrl`  | https URL             | Required for `role: "chat"`                            |
| `textEncoderUrl`| https URL (optional)  | Vision-only, when the model ships a text encoder       |
| `sha256`        | 64-char lowercase hex | Content hash, verified on download                     |
| `sizeBytes`     | positive integer      | Bytes on disk; drives APP-34 ETA                       |

## Verifying the manifest

```bash
# Offline (schema only — used in CI / pre-commit)
VERIFY_MODELS_OFFLINE=1 node scripts/verify-models-manifest.mjs

# Online (also HEAD-checks every URL against the Hugging Face mirror)
node scripts/verify-models-manifest.mjs
```

Exit codes: `0` schema valid, `1` schema invalid, `2` HEAD or content-length
check failed (online only).

## Approximate first-run download (for APP-34's UX budget)

| Model            | Role   | License    | Size      |
| ---------------- | ------ | ---------- | --------- |
| Qwen2.5-1.5B 4bit| chat   | Apache-2.0 | ~1.0 GB   |
| CLIP ViT-B/32    | vision | MIT        | ~350 MB   |
| **Default total**|        |            | **~1.3 GB** |
| Llama 3.2 1B 4bit (alt) | chat | Llama Community | ~1.15 GB |
| Hammer 2.1 1.5B  (alt)  | chat | Apache-2.0      | ~1.48 GB |

The default first-run footprint (Qwen + CLIP) is therefore **~1.3 GB**.
