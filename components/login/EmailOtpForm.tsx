'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/utils/supabase/client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Button } from '../ui/button';
import { reloadPage } from '@/lib/utils';

const formSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

type FormValues = z.infer<typeof formSchema>;

export function EmailOtpForm({ email }: { email: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    defaultValues: { code: '' },
  });

  // IDs for ARIA associations
  const ids = useMemo(
    () => ({
      heading: 'verify-heading',
      desc: 'verify-desc',
      label: 'otp-label',
      hint: 'otp-hint',
      error: 'otp-error',
      serverError: 'server-error',
      status: 'status-msg',
    }),
    [],
  );

  const onSubmit = async ({ code }: FormValues) => {
    setServerError(null);
    setStatusMsg('');
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    if (error) {
      const msg = /expired|invalid/i.test(error.message)
        ? 'That code is invalid or expired. Request a new one.'
        : error.message;
      setServerError(msg);
      return;
    }

    router.replace('/');
    router.refresh();
  };

  const resend = async () => {
    setServerError(null);
    setStatusMsg('Sending a new code…');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      setStatusMsg('');
      setServerError(error.message);
    } else {
      setStatusMsg('A new code was sent to your email.');
    }
  };

  const refresh = () => {
    setServerError(null);
    setStatusMsg('');
    form.reset();
    // Go back to email form
    reloadPage();
  };

  return (
    <Form {...form} aria-labelledby={ids.heading}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full max-w-md space-y-4"
        noValidate
        aria-describedby={`${ids.desc} ${ids.status}`}
        aria-busy={form.formState.isSubmitting}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle id={ids.heading} className="text-xl font-semibold">
              Verify your email
            </CardTitle>
            <CardDescription id={ids.desc} className="text-muted-foreground mt-1 text-sm">
              We sent a 6-digit code to <strong>{email}</strong>. Enter it below to finish signing
              in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Polite live region for non-error status (e.g., resend) */}
            <div id={ids.status} className="sr-only" aria-live="polite">
              {statusMsg}
            </div>

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => {
                const hasFieldError = Boolean(form.formState.errors.code);
                const describedBy = [
                  ids.hint,
                  hasFieldError ? ids.error : '',
                  serverError ? ids.serverError : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <FormItem>
                    <FormLabel id={ids.label} className="sr-only">
                      6-digit code
                    </FormLabel>

                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        value={field.value}
                        onChange={(v) => field.onChange(v.replace(/\D/g, ''))}
                        autoFocus
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        enterKeyHint="done"
                        aria-labelledby={`${ids.label} ${ids.heading}`}
                        aria-describedby={describedBy ? `${ids.desc} ${describedBy}` : ids.desc}
                        aria-invalid={hasFieldError || !!serverError}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} aria-label="Digit 1 of 6" />
                          <InputOTPSlot index={1} aria-label="Digit 2 of 6" />
                          <InputOTPSlot index={2} aria-label="Digit 3 of 6" />
                        </InputOTPGroup>
                        <InputOTPSeparator aria-hidden="true" />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} aria-label="Digit 4 of 6" />
                          <InputOTPSlot index={4} aria-label="Digit 5 of 6" />
                          <InputOTPSlot index={5} aria-label="Digit 6 of 6" />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>

                    <p id={ids.hint} className="text-muted-foreground text-xs">
                      Enter the six digits from your email. Numbers only.
                    </p>

                    {/* Ensure FormMessage maps to this id when there’s a field error */}
                    <FormMessage id={ids.error} />
                  </FormItem>
                );
              }}
            />

            {serverError && (
              <p
                id={ids.serverError}
                className="text-sm text-red-600"
                role="alert"
                aria-live="assertive"
              >
                {serverError}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full md:w-auto"
            >
              {form.formState.isSubmitting ? 'Verifying…' : 'Verify'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={resend}
              disabled={form.formState.isSubmitting}
              aria-describedby={ids.status}
              aria-label={`Resend code to ${email}`}
              className="w-full md:w-auto"
            >
              Resend code
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={refresh}
              className="text-muted-foreground w-full md:ml-auto md:w-auto"
            >
              Use a different email
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
