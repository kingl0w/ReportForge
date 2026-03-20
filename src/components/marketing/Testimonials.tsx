"use client";

import { Star } from "lucide-react";
import { FadeIn } from "./fade-in";

interface Testimonial {
  quote: string;
  name: string;
  title: string;
  initials: string;
  avatarColor: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "ReportForge replaced our entire reporting workflow. What used to take 3 hours now takes 30 seconds.",
    name: "Sarah Chen",
    title: "Head of Analytics, Meridian",
    initials: "SC",
    avatarColor: "bg-primary",
  },
  {
    quote:
      "The AI insights are scary good. It caught a revenue anomaly that our team missed for two months.",
    name: "Marcus Rodriguez",
    title: "E-commerce Director, Bolt",
    initials: "MR",
    avatarColor: "bg-amber-500",
  },
  {
    quote:
      "I send weekly Shopify reports to 12 clients. ReportForge turned that from a full day of work into a coffee break.",
    name: "Aisha Patel",
    title: "Freelance Consultant",
    initials: "AP",
    avatarColor: "bg-emerald-500",
  },
];

function StarRating() {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-4 w-4 fill-amber-400 text-amber-400"
        />
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="relative bg-muted/50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Loved by Data-Driven Teams
            </h2>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <FadeIn key={testimonial.name} delay={0.1 * (index + 1)}>
              <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6">
                <StarRating />
                <blockquote className="mt-4 flex-1">
                  <p className="text-sm italic leading-relaxed text-muted-foreground">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${testimonial.avatarColor}`}
                  >
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.title}
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
