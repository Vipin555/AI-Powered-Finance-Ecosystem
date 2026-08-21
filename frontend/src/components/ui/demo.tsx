"use client";

import { DecryptText } from "@/components/ui/decrypt-text";

export default function DecryptTextDemo() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-10 p-12">
      <DecryptText
        as="h1"
        text="Your Money, Intelligently Managed"
        variant="display"
        trigger="mount"
        stagger={38}
        retriggerOnHover
        className="max-w-2xl text-center text-4xl font-semibold tracking-tight text-[var(--motiq-fg)] sm:text-5xl"
      />

      <DecryptText
        text="₹ FINEXO AI · Real-Time Indian Market Optimization & Algorithmic Rebalancing"
        variant="terminal"
        trigger="mount"
        startDelay={600}
        loop={5200}
        className="w-full max-w-xl"
      />
    </div>
  );
}
