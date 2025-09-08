/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { EmailOtpForm } from '@/components/login/EmailOtpForm';
import { reloadPage } from '@/lib/utils';

// ---- Mocks ----

// Keep all real exports from utils (e.g., `cn`) but stub just `reloadPage`
jest.mock('@/lib/utils', () => {
  const actual = jest.requireActual('@/lib/utils');
  return {
    __esModule: true,
    ...actual,
    reloadPage: jest.fn(),
  };
});

// Supabase
const verifyOtpMock = jest.fn();
const signInWithOtpMock = jest.fn();
jest.mock('@/utils/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: {
      verifyOtp: verifyOtpMock,
      signInWithOtp: signInWithOtpMock,
    },
  }),
}));

// next/navigation
const replaceMock = jest.fn();
const refreshMock = jest.fn();
jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

// Mock the OTP UI to a single input for easy typing/assertions
jest.mock('@/components/ui/input-otp', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const InputOTP = React.forwardRef(function MockInputOTP(props: any, ref: any) {
    const { value, onChange, children, ...rest } = props;
    return (
      <div>
        <input
          data-testid="otp-input"
          ref={ref}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          {...rest}
        />
        <div data-testid="otp-children">{children}</div>
      </div>
    );
  });
  const PassThrough: React.FC<any> = ({ children, ...rest }) => <div {...rest}>{children}</div>;
  return {
    __esModule: true,
    InputOTP,
    InputOTPGroup: PassThrough,
    InputOTPSeparator: PassThrough,
    InputOTPSlot: PassThrough,
  };
});

// helper for in-flight assertions
function createDeferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (r?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('EmailOtpForm', () => {
  const EMAIL = 'user@example.com';

  beforeEach(() => {
    verifyOtpMock.mockReset();
    signInWithOtpMock.mockReset();
    replaceMock.mockReset();
    refreshMock.mockReset();
    (reloadPage as jest.Mock).mockReset();
  });

  it('renders title, description, and OTP input for the given email', () => {
    render(<EmailOtpForm email={EMAIL} />);

    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();

    // Description (split across elements)
    expect(screen.getByText(/we sent a 6-digit code to/i)).toBeInTheDocument();
    expect(screen.getByText(EMAIL)).toBeInTheDocument();
    expect(screen.getByText(/enter it below to finish signing in\./i)).toBeInTheDocument();

    expect(screen.getByTestId('otp-input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^verify$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /resend code/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /use a different email/i })).toBeEnabled();
  });

  it('validates and blocks submit if code is not 6 digits', async () => {
    render(<EmailOtpForm email={EMAIL} />);

    await userEvent.type(screen.getByTestId('otp-input'), '123');
    await userEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    expect(await screen.findByText(/enter the 6-digit code/i)).toBeInTheDocument();
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it('filters non-digits while typing', async () => {
    render(<EmailOtpForm email={EMAIL} />);
    const input = screen.getByTestId('otp-input') as HTMLInputElement;

    await userEvent.type(input, '12a3!@#45xyz');
    expect(input).toHaveValue('12345');
  });

  it('submits a valid code and redirects + refreshes on success', async () => {
    verifyOtpMock.mockResolvedValue({ data: {}, error: null });

    render(<EmailOtpForm email={EMAIL} />);
    await userEvent.type(screen.getByTestId('otp-input'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    await waitFor(() =>
      expect(verifyOtpMock).toHaveBeenCalledWith({
        email: EMAIL,
        token: '123456',
        type: 'email',
      }),
    );
    expect(replaceMock).toHaveBeenCalledWith('/');
    expect(refreshMock).toHaveBeenCalled();
  });

  it('shows a friendly message for invalid/expired errors', async () => {
    verifyOtpMock.mockResolvedValue({ error: { status: 400, message: 'Invalid token' } });

    render(<EmailOtpForm email={EMAIL} />);
    await userEvent.type(screen.getByTestId('otp-input'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/that code is invalid or expired/i);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('shows the raw server error message for other failures', async () => {
    verifyOtpMock.mockResolvedValue({ error: { status: 500, message: 'Service unavailable' } });

    render(<EmailOtpForm email={EMAIL} />);
    await userEvent.type(screen.getByTestId('otp-input'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/service unavailable/i);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('disables Verify & Resend and sets aria-busy while submitting', async () => {
    const deferred = createDeferred<{ error: null }>();
    verifyOtpMock.mockReturnValueOnce(deferred.promise as any);

    render(<EmailOtpForm email={EMAIL} />);
    const input = screen.getByTestId('otp-input');
    await userEvent.type(input, '123456');
    await userEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    expect(screen.getByRole('button', { name: /verifying…/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /resend code/i })).toBeDisabled();

    const formEl = input.closest('form')!;
    expect(formEl).toHaveAttribute('aria-busy', 'true');

    deferred.resolve({ error: null });
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'));
  });

  it('resends a code and updates the polite live region', async () => {
    signInWithOtpMock.mockResolvedValue({ data: {}, error: null });

    render(<EmailOtpForm email={EMAIL} />);
    await userEvent.click(screen.getByRole('button', { name: /resend code/i }));

    await waitFor(() =>
      expect(signInWithOtpMock).toHaveBeenCalledWith({
        email: EMAIL,
        options: { shouldCreateUser: true },
      }),
    );

    expect(
      screen.getByText(/a new code was sent to your email\./i, { selector: '#status-msg' }),
    ).toBeInTheDocument();
  });

  it('shows an error if resend fails and clears the status message', async () => {
    signInWithOtpMock.mockResolvedValue({ error: { status: 429, message: 'Too many requests' } });

    render(<EmailOtpForm email={EMAIL} />);
    await userEvent.click(screen.getByRole('button', { name: /resend code/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/too many requests/i);

    const statusEl = screen.getByText('', { selector: '#status-msg' });
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toBeEmptyDOMElement();
  });

  it('clicking "Use a different email" calls reloadPage and clears the input', async () => {
    render(<EmailOtpForm email={EMAIL} />);

    const input = screen.getByTestId('otp-input') as HTMLInputElement;
    await userEvent.type(input, '123456');
    expect(input).toHaveValue('123456');

    await userEvent.click(screen.getByRole('button', { name: /use a different email/i }));

    expect(reloadPage).toHaveBeenCalled();
    // form.reset() runs before reload; we mock reload, so we can assert it cleared
    expect(input).toHaveValue('');
  });
});
