'use client';

import Script from 'next/script';

interface CheckoutEmbedProps {
  planId: string;
  /** Arbitrary key-value pairs forwarded to Whop checkout metadata.
   *  We pass clerk_user_id here so the membership_activated webhook can
   *  resolve which PromptPro profile to update. */
  metadata?: Record<string, string>;
}

/**
 * Renders Whop's official embedded checkout using the loader script pattern
 * documented at https://docs.whop.com/supported-business-models/saas
 *
 * The loader script reads any <div data-whop-checkout-plan-id="..."> on the
 * page and upgrades it to a full Whop checkout iframe automatically.
 *
 * metadata is serialised to a JSON data attribute so Whop passes it through
 * to the webhook payload as event.data.metadata — enabling us to read
 * clerk_user_id in the webhook handler without asking users to log in to Whop.
 */
export function CheckoutEmbed({ planId, metadata }: CheckoutEmbedProps) {
  const isProduct = planId?.startsWith('prod_');

  return (
    <>
      {/* Step 1 – Whop Checkout loader (official pattern) */}
      <Script
        src="https://js.whop.com/static/checkout/loader.js"
        strategy="afterInteractive"
      />

      {/* Step 2 – Checkout mount target.
          Works with either plan ID (plan_...) or product ID (prod_...).
          data-whop-checkout-metadata passes clerk_user_id to the webhook. */}
      {isProduct ? (
        <div
          data-whop-checkout-product-id={planId}
          data-whop-checkout-metadata={metadata ? JSON.stringify(metadata) : undefined}
          style={{ minHeight: 320 }}
        />
      ) : (
        <div
          data-whop-checkout-plan-id={planId}
          data-whop-checkout-metadata={metadata ? JSON.stringify(metadata) : undefined}
          style={{ minHeight: 320 }}
        />
      )}
    </>
  );
}
