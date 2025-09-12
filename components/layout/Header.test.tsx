/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { Header } from '@/components/layout/Header';

/* ------------------------------- Mocks -------------------------------- */

let mockPathname = '/';
const replaceMock = jest.fn();
const refreshMock = jest.fn();

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
  usePathname: () => mockPathname,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : href?.pathname} {...rest}>
      {children}
    </a>
  ),
}));

let mockUser: any = null;
const signOutMock = jest.fn();
const onAuthUnsub = { unsubscribe: jest.fn() };

jest.mock('@/utils/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: {
      getUser: jest.fn(async () => ({ data: { user: mockUser } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: onAuthUnsub } })),
      signOut: signOutMock,
    },
  }),
}));

// Minimal Radix Sheet mock with controllable open/close
jest.mock('@/components/ui/sheet', () => {
  const { createContext, useContext, cloneElement, Children } = React;
  const Ctx = createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({
    open: false,
    onOpenChange: () => {},
  });

  function Sheet({ open, onOpenChange, children }: any) {
    return <Ctx.Provider value={{ open, onOpenChange }}>{children}</Ctx.Provider>;
  }
  function SheetTrigger({ asChild, children }: any) {
    const { open, onOpenChange } = useContext(Ctx);
    const child = asChild ? Children.only(children) : <button>{children}</button>;
    return cloneElement(child, {
      onClick: (e: any) => {
        child.props?.onClick?.(e);
        onOpenChange(!open);
      },
      'data-testid': 'sheet-trigger',
      'aria-expanded': String(open),
    });
  }
  function SheetContent({ children, ...rest }: any) {
    const { open } = useContext(Ctx);
    return (
      <div data-testid="sheet-content" hidden={!open} {...rest}>
        {children}
      </div>
    );
  }
  const Pass = ({ children, ...p }: any) => <div {...p}>{children}</div>;
  return {
    __esModule: true,
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader: Pass,
    SheetTitle: Pass,
    SheetDescription: Pass,
  };
});

/* ---------------------------- Test Utilities --------------------------- */

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mockUser = null;
  mockPathname = '/';
  signOutMock.mockReset();
  replaceMock.mockReset();
  refreshMock.mockReset();
  onAuthUnsub.unsubscribe.mockReset();
});

/* -------------------------------- Tests -------------------------------- */

describe('Header', () => {
  it('shows brand and Login link for guests (not on /login)', async () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /homi home/i })).toHaveAttribute('href', '/');
    expect(await screen.findByRole('link', { name: /log in/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  it('hides Login link on the /login page', async () => {
    mockPathname = '/login';
    render(<Header />);
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
    });
  });

  it('shows desktop nav + logout when authenticated', async () => {
    mockUser = { id: 'u1', email: 'user@example.com' };
    render(<Header />);
    expect(await screen.findByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /saved listings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
  });

  it('logs out: disables button and shows "Signing out…" text, then redirects and refreshes', async () => {
    mockUser = { id: 'u1', email: 'user@example.com' };
    const d = deferred<void>();
    signOutMock.mockReturnValueOnce(d.promise);

    render(<Header />);
    const logoutBtn = await screen.findByRole('button', { name: /log out/i });
    await userEvent.click(logoutBtn);

    // Accessible name stays "Log out" due to aria-label; check state via text/disabled.
    expect(logoutBtn).toBeDisabled();
    expect(logoutBtn).toHaveTextContent(/signing out/i);

    d.resolve();
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalled();
      expect(replaceMock).toHaveBeenCalledWith('/login');
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it('mobile sheet: opens via trigger, shows links for authed user, closes on nav click', async () => {
    mockUser = { id: 'u1', email: 'user@example.com' };
    render(<Header />);

    const trigger = screen.getByTestId('sheet-trigger');
    const content = screen.getByTestId('sheet-content');

    // Open the sheet
    await userEvent.click(trigger);
    expect(content).toBeVisible();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Click Dashboard inside the SHEET (not the desktop nav)
    const sheetQueries = within(content);
    await userEvent.click(sheetQueries.getByRole('link', { name: /dashboard/i }));

    await waitFor(() => {
      expect(content).not.toBeVisible();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('mobile sheet closes on route change', async () => {
    mockUser = { id: 'u1', email: 'user@example.com' };
    const { rerender } = render(<Header />);

    const trigger = screen.getByTestId('sheet-trigger');
    const content = screen.getByTestId('sheet-content');

    await userEvent.click(trigger);
    expect(content).toBeVisible();

    mockPathname = '/saved-listings';
    rerender(<Header />);

    await waitFor(() => {
      expect(content).not.toBeVisible();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('mobile menu shows Home when guest on /login', async () => {
    mockPathname = '/login';
    render(<Header />);

    await userEvent.click(screen.getByTestId('sheet-trigger'));
    const content = screen.getByTestId('sheet-content');
    expect(content).toBeVisible();

    // Scope to the sheet to avoid matching the "Homi home" brand link
    const sheetQueries = within(content);
    expect(sheetQueries.getByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/');
    expect(sheetQueries.queryByRole('link', { name: /^log in$/i })).not.toBeInTheDocument();
  });
});

const realError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    if (String(args[0]).includes('Not implemented: navigation')) return;
    realError(...args);
  });
});
afterAll(() => (console.error as jest.Mock).mockRestore());
