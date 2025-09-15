'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Brain, Compass, MessageSquareText } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  query: z
    .string()
    .min(2, { message: 'Tell us a bit more.' })
    .max(100, { message: 'Keep it under 100 characters.' }),
});

export default function Home() {
  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: { query: '' },
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    // TODO: wire to /api/ai-chat and redirect
    // post to api route - e.g. /api/ai-chat
    // then redirect to ai chat page.
  }

  return (
    <section className="relative min-h-[100svh] overflow-visible bg-cover bg-center p-8 font-sans sm:min-h-dvh sm:p-20 md:overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2800&auto=format&fit=crop&ixlib=rb-4.1.0"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 -z-10 object-cover"
      />
      <div
        className="from-primary/40 absolute inset-0 -z-10 bg-gradient-to-b to-black/95"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center leading-snug md:items-center md:leading-tight">
        <h1 className="text-background text-[clamp(2.25rem,4.5vw,8rem)] font-semibold tracking-tight">
          Your home, defined.
        </h1>

        <p className="text-background mt-2 text-[clamp(1.25rem,2vw,4rem)]">
          We&apos;ll find it — not just by filters, but by your vibe.
        </p>

        <ul role="list" className="mt-6 flex flex-wrap gap-2">
          {['Must-haves', 'Deal-breakers', 'Budget', 'Commute time', 'Lifestyle'].map((v) => (
            <li key={v}>
              <span className="text-background/90 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#F78154]/8 px-3 py-1 text-sm backdrop-blur-sm transition-colors md:text-base">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F78154]/80" aria-hidden />
                {v}
              </span>
            </li>
          ))}
        </ul>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-12 flex w-full max-w-2xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4"
            aria-describedby="query-help"
          >
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="sr-only" htmlFor="query">
                    What are you looking for?
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="query"
                      type="text"
                      {...field}
                      maxLength={100}
                      placeholder="e.g. 2 bed in SF under $4k with parking and a view of the bay 🙂"
                      autoComplete="off"
                      enterKeyHint="search"
                      aria-invalid={!!form.formState.errors.query}
                      aria-describedby={`query-help${form.formState.errors.query ? ' query-error' : ''}`}
                      className="bg-background placeholder:text-primary/40 w-full max-w-xl truncate border-0 py-6 font-medium"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              size="lg"
              className="shrink-0 bg-gradient-to-bl from-[#F78154] to-[#fb6a2c] py-6 text-sm font-semibold tracking-wide hover:from-orange-600 hover:to-amber-500"
            >
              Try Homi
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </form>
        </Form>
        <p id="query-help" className="sr-only" aria-live="polite">
          Describe beds, price, neighborhood, vibe, or must-haves.
        </p>

        <section
          className="mx-auto mt-8 grid w-full max-w-6xl gap-4 sm:mt-16 md:grid-cols-3"
          aria-labelledby="how-it-works"
        >
          <h2 id="how-it-works" className="sr-only">
            How it works
          </h2>

          {[
            {
              t: 'Set your vibe',
              d: 'Commute, pets, sunlight, weekend plans.',
              Icon: MessageSquareText,
            },
            { t: 'Find your fit', d: 'AI narrows to places that feel right.', Icon: Brain },
            { t: 'Tour confidently', d: 'Shortlist with reasons you can compare.', Icon: Compass },
          ].map(({ t, d, Icon }, i) => (
            <article
              key={t}
              className="text-background/90 rounded-xl p-4"
              aria-labelledby={`step-${i}`}
            >
              <div className="flex items-start gap-4">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#F78154]/8 backdrop-blur-sm">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="md:space-y-1">
                  <h3
                    id={`step-${i}`}
                    className="text-[clamp(1.25rem,1.3vw,2.75rem)] font-semibold"
                  >
                    {t}
                  </h3>
                  <p className="text-[clamp(1rem,1.2vw,2rem)] opacity-90">{d}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
