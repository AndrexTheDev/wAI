# wAI — Licensing & Crypto Payment Runbook

Der gesamte Kauf- und Freischaltweg funktioniert **ohne Server, ohne Konto und
ohne Custody**. Dieses Dokument beschreibt den Ablauf für Käufer und für den
Anbieter.

> **Vor einem kommerziellen Launch:** Der bisherige lokale private Ausstellerschlüssel
> wurde in einer Tool-Ausgabe offengelegt und ist als kompromittiert zu behandeln.
> Neuen Schlüssel auf einem vertrauenswürdigen Gerät erzeugen, öffentlichen Schlüssel
> einbinden und mit dem finalen Build testen: [Launch-Checkliste](LAUNCH_CHECKLIST.md#2-lizenz-ausstellung--eigentümer-vor-verkauf-von-pro).
> `license-cli.mjs issue` verweigert inzwischen die Ausgabe mit dem bekannten
> kompromittierten Schlüssel oder einem nicht zum eingebetteten Schlüssel passenden
> privaten Schlüssel. Andere Ausstellungswege sind dadurch nicht gesperrt.

The whole purchase and unlock path works without a server, account or custody.
This document describes the flow for buyers and for the vendor.

---

## 1. Wallets (canonical — never change silently)

| Chain | Address | QR payload (deep link) |
|---|---|---|
| Solana (SOL) | `79KsqtJJdhKFJ9woxnYgtf3nq7HxQveafWBCtC3mxWi8` | `solana:79KsqtJJdhKFJ9woxnYgtf3nq7HxQveafWBCtC3mxWi8?amount=0.12&label=wAI%20Pro` |
| Bitcoin (BTC) | `bc1qeqzrlfg3edrydk4s0hecakc82gp26n5p7hkc7f` | `bitcoin:bc1qeqzrlfg3edrydk4s0hecakc82gp26n5p7hkc7f?amount=0.00017&label=wAI%20Pro` |
| Ethereum (ETH) | `0xBC3fab34f69bc9f6661608C3FB36dDdC313C42F7` | `ethereum:0xBC3fab34f69bc9f6661608C3FB36dDdC313C42F7@1?value=4200000000000000` |

These three constants are defined once in `packages/shared/src/product.ts`
(`SUPPORT_WALLETS`) and rendered everywhere from there — app settings, Pro sheet,
landing page, legal crypto guide. **A single source prevents copy drift**; a typo
in an address means lost money.

Suggested amounts (display only, the buyer may send more or less):

| Chain | Suggested | Reference fiat |
|---|---|---|
| SOL | 0.12 SOL | ≈ 14,99 € |
| BTC | 0.00017 BTC | ≈ 14,99 € |
| ETH | 0.0042 ETH | ≈ 14,99 € |

Amounts are recalculated manually when volatility moves the fiat equivalent by
more than ±15 %. The licence is a one-time purchase; **no subscription renews**.

## 2. What the buyer sees

1. **Pro sheet → tab "Upgrade"**: what Pro unlocks, price, and the three chains.
2. Pick a chain → **address, QR, copy button, deep link, explorer link**, plus the
   amount and the order reference `WAI-XXXXX` (generated once, persisted).
3. Explicit notices, always visible, not behind a toggle:
   - "Send only SOL/BTC/ETH on the correct network. Other tokens or networks are
     lost."
   - "Network fees are paid by you and are not refundable."
   - "Crypto transfers are final. No chargeback is possible."
4. **"Ich habe bezahlt"** → opens a pre-filled mail to `hippie.highho@gmail.com`
   with the order reference, chain and transaction hash field.
5. Buyer receives the signed licence token (`WAI1.…`) by mail, usually < 24 h.
6. **Pro sheet → tab "Activate"**: paste the token → offline Ed25519 verification →
   Pro unlocked permanently on that device. A licence fingerprint (e.g.
   `A1B2-C3D4-E5F6`) is shown for support.

No email address is required to *use* the app — only to receive the token. Buyers
who prefer not to give one can request delivery via any channel they control
(including showing the token as a QR code on the vendor side).

## 3. Vendor workflow

### 3.1 One-time key setup

```bash
node tools/license-cli.mjs keygen
```

Writes `tools/keys/issuer.private.json` (git-ignored) and `issuer.public.json`.
It does **not** update the app's embedded public key. Put the new public key in
`packages/shared/src/license-key.ts` as `ISSUER_PUBLIC_KEY`, review any
`VITE_WAI_ISSUER_KEY` build override, and rebuild and test before distribution.
Do not overwrite an existing private key without a backup and a migration plan
for existing installations and licences.

**Back up the private key offline** (two locations, e.g. encrypted USB + paper).
If it is lost you can no longer issue licences that verify against the shipped
public key. Recovery would require shipping an app update with a new key and
re-issuing every licence — treat the key as irreplaceable.

### 3.2 Issuing a licence

```bash
node tools/license-cli.mjs issue \
  --sub buyer@example.com \
  --via crypto-sol \
  --tx 5xY...            # optional, stored only in your records
```

Output: a `WAI1.…` token. Send it with the mail template
(`node tools/license-cli.mjs mail --sub … --tx …`).

Token payload:

```json
{
  "p": "wai",
  "plan": "pro",
  "id": "WAI-7WUXB",
  "iat": 1764115200,
  "via": "crypto-sol",
  "sub": "buyer@example.com",
  "seats": 1,
  "exp": 1795651200
}
```

`exp` is optional (omit for lifetime). `seats` is informational — enforcement is
per install, and the terms allow moving to a replacement device.

### 3.3 Verifying / supporting

```bash
node tools/license-cli.mjs verify WAI1.…
```

Prints the payload and signature status. Use it when a buyer reports "activation
failed" — in almost every case the token was truncated by a mail client. Ask for
the full string or a screenshot of the QR.

### 3.4 Refunds

Because crypto payments are irreversible, refunds are sent back manually to an
address the buyer provides, minus network fees. Policy (also in the AGB):

- Wrong/duplicate payment → full refund minus fees, or a licence for the excess.
- "Doesn't work on my device" → support first; if unsolvable within 14 days, refund.
- Change of mind within 14 days and unused → refund minus fees (EU withdrawal
  right, § 356 Abs. 5 BGB applies differently for digital content — see
  `docs/LEGAL_REVIEW.md`; the AGB contains the waiver text for immediate delivery).

## 4. Why a signed offline token instead of a licence server

| | Server check | Signed offline token |
|---|---|---|
| Works in airplane mode | ✗ | ✓ |
| Privacy (no phone-home) | ✗ | ✓ |
| Vendor infrastructure | server + DB + monitoring | a text file |
| Can be revoked centrally | ✓ | ✗ (accepted trade-off) |
| Can be cracked by patching the app | ✓ | ✓ (same as any client check) |

Honesty note: any client-side check can be bypassed by a determined attacker. The
token raises the effort above "change one `false` to `true`" and keeps the
privacy promise. Piracy is mitigated by price fairness and good will, not DRM.

## 5. Support runbook

| Message | Answer |
|---|---|
| "Which network?" | Send on the chain named on the wallet (SOL/Solana, BTC/Bitcoin, ETH/Ethereum mainnet). Nothing else. |
| "I sent USDT on Tron" | Funds are unrecoverable without the receiving wallet's key. Explain clearly, offer a discounted re-purchase. |
| "Amount differs" | If underpaid by < 10 %, issue the licence anyway. If more, offer a licence plus refund of the difference minus fees. |
| "Token doesn't work" | Ask for the raw token (no quotes), check with `verify`, reissue with the same `id` if needed. |
| "New phone" | Reissue with the same `sub` and a note; the old install can be deactivated in settings. |
| "Lost my token" | Look it up by `sub` in your records, resend. |
| "Refund" | Follow 3.4, always minus network fees, document it. |
| "Can I pay another way?" | Not in v1.0. Offer to keep a record and notify when gift codes exist. |

## 6. Donations

Separate from the licence, with the same three wallets, clearly labelled
"Freiwillige Unterstützung" / "Voluntary support". No feature is gated behind a
donation, and the UI never mixes the two flows. Donations are not a purchase and
create no entitlement — the AGB says so explicitly.

## 7. Bookkeeping

Keep a simple ledger (spreadsheet is fine) with columns: date, order ref, chain,
tx hash, amount, fiat value at receipt, `sub`, licence `id`, notes. Keep it for the
period your tax adviser requires (in Germany typically 10 years for
business records). Crypto received is a business receipt and must be valued in EUR
at the time of receipt.

---

## English summary

Three fixed wallets (SOL, BTC, ETH) are defined once in
`packages/shared/src/product.ts` and rendered everywhere from that single source, so
addresses can never drift. The buyer picks a chain, sees the address, QR code, copy
button, deep link and an order reference, plus always-visible warnings about wrong
networks, fees paid by the buyer and the finality of crypto transfers. They confirm
by mail and receive a signed `WAI1.…` token within 24 h, which is verified offline
with Ed25519 — no licence server, works in airplane mode. The vendor key pair is
generated once with `tools/license-cli.mjs keygen`; the private key is git-ignored
and must be backed up offline because it is irreplaceable. Issuing, verifying and
mail drafting are single CLI commands. Refund policy: manual, back to a buyer
address, minus network fees. Donations use the same wallets but are clearly
separate and unlock nothing. Keep a ledger of chain, tx hash, amount, fiat value at
receipt and licence id for tax purposes.
