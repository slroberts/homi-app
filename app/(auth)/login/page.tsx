'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmailOtpForm } from '@/components/login/EmailOtpForm';

const formSchema = z.object({
  email: z.email({ pattern: z.regexes.email, message: 'Enter a valid email' }).trim(),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [lastEmail, setLastEmail] = useState<string>('');

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const email = values.email.trim().toLowerCase();
    setLastEmail(email);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      if (error.status === 429) return setServerError('Too many requests. Try again in a minute.');
      return setServerError(error.message);
    }

    setSent(true);
  };

  return (
    <section aria-label="Sign in" className="flex h-full items-center justify-center p-4">
      {sent ? (
        <EmailOtpForm email={lastEmail} />
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full max-w-md space-y-4"
            noValidate
            aria-describedby="login-desc status-msg"
            aria-busy={form.formState.isSubmitting}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle id="login-heading" className="text-xl font-semibold">
                  Login to your account
                </CardTitle>
                <CardDescription id="login-desc" className="text-muted-foreground text-sm">
                  Skip the password. Get a 6-digit code and you’re in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="email">Email address</FormLabel>
                      <FormControl>
                        <Input
                          id="email"
                          {...field}
                          type="email"
                          placeholder="name@company.com"
                          autoComplete="email"
                          inputMode="email"
                          enterKeyHint="send"
                          required
                          spellCheck={false}
                          autoCapitalize="none"
                          aria-invalid={!!form.formState.errors.email}
                          aria-describedby={[
                            form.formState.errors.email ? 'email-error' : '',
                            serverError ? 'server-error' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        />
                      </FormControl>
                      <FormMessage id="email-error" />
                    </FormItem>
                  )}
                />

                {serverError && (
                  <p
                    id="server-error"
                    className="text-sm text-red-600"
                    role="alert"
                    aria-live="assertive"
                  >
                    {serverError}
                  </p>
                )}

                {/* Live region for async status updates */}
                <div id="status-msg" className="sr-only" aria-live="polite">
                  {form.formState.isSubmitting ? 'Sending code…' : ''}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={form.formState.isSubmitting} className="ml-auto">
                  {form.formState.isSubmitting ? 'Sending…' : 'Send sign-in code'}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </section>
  );
}
