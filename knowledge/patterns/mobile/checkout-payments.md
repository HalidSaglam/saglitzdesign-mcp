---
id: mobile-checkout-payments
title: "Mobile Checkout & Payment Method Selection Patterns"
category: pattern
platform: mobile
tags: [checkout, payments, ecommerce, forms, trust]
sources:
  - "https://mobbin.com/screens/b01088bd-226f-45fa-9f9e-1c990e3b1b76"
  - "https://mobbin.com/screens/a4f7b96f-ff18-49ef-914a-9a9cff8c8a42"
  - "https://mobbin.com/screens/5712cce4-8d52-4d29-bee9-ece6ca849b5c"
  - "https://mobbin.com/screens/2a0f9220-30a0-4b1d-b122-88b3e49500d2"
  - "https://mobbin.com/screens/b595b518-e339-44c9-86ca-83fd80a0184c"
  - "https://mobbin.com/screens/b488d6f6-ce3d-4853-a0c1-15a4a4be3944"
  - "https://mobbin.com/screens/229ed6f0-0414-4be4-b4d0-54395b56037c"
updated: 2026-07-08
---

# Checkout with Payment Method Selection (iOS)

Based on real screens from Zalando, Etsy, Woolworths, Warby Parker, UNIQLO, and Houzz on Mobbin.

## Observed patterns

### Step indication
- [Zalando](https://mobbin.com/screens/b01088bd-226f-45fa-9f9e-1c990e3b1b76) shows a 5-node horizontal stepper under the nav bar: "Sign in ✓ — Address ✓ — Payment (3) — Confirm — Done!" with completed steps as checkmarks, the current step as a filled numbered circle, and future steps grayed.
- [Etsy](https://mobbin.com/screens/5712cce4-8d52-4d29-bee9-ece6ca849b5c) uses a lighter 3-dot stepper (Shipping ✓ — Payment ● — Review ○) beneath a "Cancel | Checkout" nav bar.
- [Woolworths](https://mobbin.com/screens/2a0f9220-30a0-4b1d-b122-88b3e49500d2) shows pill steps with green checks (Details ✓ Products ✓ Summary ✓ | 4 Pay), and [Houzz](https://mobbin.com/screens/229ed6f0-0414-4be4-b4d0-54395b56037c) simply titles the screen "2 of 3: Billing & Payment". Every app tells the user where they are and what remains.

### Payment method selection = radio list with brand logos
- Etsy: "Choose a payment method" section header, then radio rows — "Card" with Visa/Mastercard/Amex/Discover logos right-aligned, "Pay with PayPal" + PayPal wordmark, "Pay with Apple Pay" + Apple Pay mark. One radio row per method; logos always trail on the right.
- [Zalando (payment step)](https://mobbin.com/screens/b01088bd-226f-45fa-9f9e-1c990e3b1b76): filled black radio for the selected "PayPal" with an inline explanation underneath ("You'll be forwarded to PayPal to complete your payment"); the "Credit/Debit Card" row shows the four network badges. Zalando's [saved-card variant](https://mobbin.com/screens/a4f7b96f-ff18-49ef-914a-9a9cff8c8a42) nests a masked saved Visa card (blurred number, trash icon to delete) plus a "New Credit or Debit Card" radio under the card method — method first, instrument second.
- [Warby Parker](https://mobbin.com/screens/b595b518-e339-44c9-86ca-83fd80a0184c) strips it to a single white card: question-style headline ("How do you want to pay?") with "Order total: $120" directly under it, two radio rows (card / PayPal) with trailing glyphs, a separate "(+) Check and apply benefits" row, and a full-width blue "Review your order" pill.
- [UNIQLO](https://mobbin.com/screens/b488d6f6-ce3d-4853-a0c1-15a4a4be3944) uses numbered sections ("2. Payment option") with big outlined selectable rows (Credit card / PayPal / Apple Pay) — same list idea, checkbox-free tap-to-select rows.

### Unavailable options stay visible, with the reason
- Etsy grays out Klarna and prints the rule inline: "$50.00 product minimum applies" + Klarna badge. The option is discoverable but clearly not tappable.

### Order summary + CTA
- Zalando places a gray summary block (Subtotal £7.97 / Delivery £3.99 / **Total VAT included £11.96**) directly above a full-width black "Next" button, with the note "You can review and confirm your order in the next step."
- Woolworths uses a **sticky bottom bar**: expandable "Total (Incl. GST) $34.00" on the left, "Place Order" button right — the button rendered disabled until the payment step is valid.
- The total is always visible on the same screen where a payment decision is made (Warby Parker puts it right in the header).

### Trust and support signals
- Etsy: "You will not be charged until you review this order on the next page" under the section title.
- UNIQLO: a security footnote ("We protect all your sensitive information with TLS encryption technology") and an embedded help entry ("Having issues with checkout? IQ chat can help").
- Zalando/Etsy: voucher & gift card entry lives in its own labeled section with chevron rows, kept out of the payment radio list.
- Every screen keeps an exit: X (Zalando), "Cancel" (Etsy, Woolworths), or back chevron (Houzz, UNIQLO).

### Card entry (when chosen)
- Houzz shows inline card fields: labeled inputs with red asterisks for required (Name on Card, Card Number with network icons that light up as detected, MM/YY dropdowns, Security Code with a CVV hint illustration) — labels above fields, one column.

## Design rules derived

**Do**
1. Show a stepper (checkmark for done, highlighted current, gray future) or an "N of M" title on every checkout screen.
2. Present payment methods as a single-select radio/tap list — one row per method, method name left, brand logos right-aligned.
3. Nest saved instruments (masked card + delete) under their method; default-select the user's last-used or saved option.
4. Keep unavailable methods visible but disabled with the reason inline (Etsy/Klarna pattern).
5. Show the order total on the payment screen — either a summary block above the CTA (Zalando) or a sticky bottom bar with total-left, CTA-right (Woolworths).
6. Label the CTA by what happens next: "Next" / "Review your order" when a review step follows; "Place Order" only on the final commit, and disable it until valid.
7. Add a no-surprise line ("You won't be charged until you review…") whenever the CTA does not immediately charge.
8. Offer Apple Pay as a first-class listed method on iOS.
9. Separate promo/gift-card entry into its own section — never as a competing field inside the payment list.
10. For card forms: labels above fields, required markers, network auto-detection, and a CVV location hint.

**Don't**
1. Don't hide the total behind a later step; price uncertainty is the top abandonment driver and every strong screen surfaces it.
2. Don't use brand logos as the tap target by themselves — the row label carries the meaning, logos are recognition support.
3. Don't remove the escape hatch; Cancel/X was present in all seven screens.
4. Don't mix selection paradigms on one screen (radios + tappable cards + toggles).

## Anti-patterns seen

- **Redirect surprise**: sending users to PayPal without warning; Zalando neutralizes it with the inline "You'll be forwarded…" note — omit that note and trust drops.
- **Long single-scroll payment + address + billing forms** (Houzz): stacking card entry and full billing address on one screen makes the CTA fall far below the fold; the stepper-split apps read as lighter.
- **CTA below the fold** (Zalando's second variant): when the summary grows (vouchers, saved cards), "Next" slips off-screen — the sticky bottom bar (Woolworths) is the safer construction.
- **Dropdowns for expiry date** (Houzz MM/YY selects): slower than a masked text input with auto-advance on mobile.
