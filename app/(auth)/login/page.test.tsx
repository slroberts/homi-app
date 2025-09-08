/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import LoginPage from './page';

// --- Mocks ---

// Supabase client
const signInWithOtpMock = jest.fn();
jest.mock('@/utils/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: {
      signInWithOtp: signInWithOtpMock,
    },
  }),
}));

// EmailOtpForm: keep tests focused on LoginPage behavior
jest.mock('@/components/login/EmailOtpForm', () => ({
  __esModule: true,
  EmailOtpForm: ({ email }: { email: string }) => (
    <div data-testid="email-otp-form">OTP sent to: {email}</div>
  ),
}));

// Helper: controllable promise (no fake timers)
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('LoginPage (Card layout, aria-label region)', () => {
  beforeEach(() => {
    signInWithOtpMock.mockReset();
  });

  it('renders region, description, email field, and submit button', () => {
    render(<LoginPage />);

    // Outer <section aria-label="Sign in">
    expect(screen.getByRole('region', { name: /sign in/i })).toBeInTheDocument();

    // Card title text (not a semantic heading)
    expect(screen.getByText(/login to your account/i)).toBeInTheDocument();

    // Card description
    expect(
      screen.getByText(/skip the password\. get a 6-digit code and you’re in\./i),
    ).toBeInTheDocument();

    const email = screen.getByLabelText(/email address/i);
    expect(email).toBeInTheDocument();
    expect(email).toHaveAttribute('type', 'email');

    const submit = screen.getByRole('button', { name: /send sign-in code/i });
    expect(submit).toBeEnabled();

    // Form has aria-describedby linking to desc + status live region
    const formEl = email.closest('form')!;
    expect(formEl).toHaveAttribute('aria-describedby', expect.stringContaining('login-desc'));
    expect(formEl).toHaveAttribute('aria-describedby', expect.stringContaining('status-msg'));
  });

  it('validates email and blocks submit on invalid input', async () => {
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: /send sign-in code/i }));

    // Schema message
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();

    // aria-invalid toggled
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-invalid', 'true');

    expect(signInWithOtpMock).not.toHaveBeenCalled();
  });

  it('submits a valid email (trim + lowercase) and shows OTP form', async () => {
    signInWithOtpMock.mockResolvedValue({ data: {}, error: null });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email address/i), '  USER@Example.COM  ');
    await userEvent.click(screen.getByRole('button', { name: /send sign-in code/i }));

    await waitFor(() => expect(signInWithOtpMock).toHaveBeenCalledTimes(1));
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: { shouldCreateUser: true },
    });

    // Swaps to OTP view with normalized email
    expect(await screen.findByTestId('email-otp-form')).toHaveTextContent('user@example.com');
  });

  it('handles 429 throttle with friendly message and stays on form', async () => {
    signInWithOtpMock.mockResolvedValue({
      error: { status: 429, message: 'Too many requests' },
    });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send sign-in code/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/too many requests\. try again in a minute\./i);
    expect(screen.queryByTestId('email-otp-form')).not.toBeInTheDocument();
  });

  it('shows server error message and stays on form (non-429)', async () => {
    signInWithOtpMock.mockResolvedValue({
      error: { status: 500, message: 'Service unavailable' },
    });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send sign-in code/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/service unavailable/i);
    expect(screen.queryByTestId('email-otp-form')).not.toBeInTheDocument();
  });

  it('disables the button, sets aria-busy, and shows live status while submitting', async () => {
    const deferred = createDeferred<{ error: null }>();
    signInWithOtpMock.mockReturnValueOnce(deferred.promise as any);

    render(<LoginPage />);
    const email = screen.getByLabelText(/email address/i);
    await userEvent.type(email, 'user@example.com');

    await userEvent.click(screen.getByRole('button', { name: /send sign-in code/i }));

    // Button switches to "Sending…" and disables
    expect(screen.getByRole('button', { name: /sending…/i })).toBeDisabled();

    // Form reflects busy state
    const formEl = email.closest('form')!;
    expect(formEl).toHaveAttribute('aria-busy', 'true');

    // Live region announces sending
    const statusMsg = screen.getByText(/sending code…/i, { selector: '#status-msg' });
    expect(statusMsg).toBeInTheDocument();

    // Finish request
    deferred.resolve({ error: null });
    expect(await screen.findByTestId('email-otp-form')).toBeInTheDocument();
  });
});
