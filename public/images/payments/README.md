# Payment method logos

Only marks we are allowed to ship live here: public-domain brand marks and one
icon we drew ourselves. We never copy a logo out of a brand's site or a sprite
sheet we have no licence for.

## What is in here

- `zelle.svg`, `apple-pay.svg`, `bitcoin.svg`, `paypal.svg`, `cash-app.svg` and
  `venmo.svg` are brand marks from [Simple Icons](https://simpleicons.org/)
  under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):
  single-path, brand-coloured, 24 × 24 viewBox, no scripts. Shipped unmodified
  and credited in `docs/image-credits.md`.
- `card.svg` is ours: a generic credit card (rounded rectangle, magnetic
  stripe, one embossed line) in the `--color-ink-muted` token colour, drawn
  because "Pay With Card" must not carry Visa, Mastercard or Amex marks.
- Chime has no file. There is no CC0 Chime mark, so it renders as a neutral
  text badge.

A method without a `logo` renders as a text badge, so checkout works with none,
some or all of these files present. `card.svg` sets `color` on the root and
paints with `currentColor`, because an `<img>` cannot inherit colour from the
page; keep the hex in step with `--color-ink-muted` in `src/app/globals.css` if
that token ever changes.

`PaymentMethodRadios` renders these with a plain `<img>` (explicit
`width`/`height`, `alt=""`, `loading="lazy"`), not `next/image`: the optimiser
refuses SVG unless `images.dangerouslyAllowSVG` is enabled, and we will not
enable it for a handful of icons.

## Adding another asset

1. Use a CC0 / public-domain mark (Simple Icons is the usual source) or the
   brand's own press or brand-assets page, and read the guidelines that come
   with it — most set a minimum size, clear space and forbid recolouring or
   altering the mark. If neither is available, leave the method on its text
   badge.
2. Save it here as `<method-id>.svg` (PNG only if no SVG is offered), using the
   id from `PAYMENT_METHOD_IDS` in `src/lib/payment-methods.ts`:
   `zelle`, `apple-pay`, `chime`, `card`, `bitcoin`, `paypal`, `cash-app`,
   `venmo`.
3. Point the method at it in `siteConfig.checkout.paymentMethods`
   (`src/lib/site-config.ts`):

   ```ts
   { ...PAYMENT_METHOD_PRESETS.zelle, enabled: true, logo: "/images/payments/zelle.svg" }
   ```

4. Add a row to `docs/image-credits.md` with the licence and source URL.

## Rules

- Only add a logo for a method we actually accept and have `enabled: true`.
  Showing a mark for a payment method we cannot take misleads customers and
  breaches the brand's guidelines.
- `card` is "we contact you to arrange card payment" — never add Visa,
  Mastercard, Amex or other card-network marks. No card details are entered on
  this site, so those marks would claim something untrue, and those marks are
  licensed separately in any case.
- No trust, antivirus or "accredited business" seals here either; the checkout
  badges only state things we can stand behind.
- Keep files small (SVG preferred, under ~20 KB), strip scripts, and do not
  edit brand artwork.
