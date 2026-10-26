import { ORIGAMI_SHELL } from '@/origami/shell/config';
import OrigamiShell from '@/origami/shell/OrigamiShell';
import { AppShell } from './AppShell';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Main layout component that wraps all pages.
 * Uses the new AppShell system with:
 * - Desktop sidebar navigation
 * - Mobile bottom navigation
 * - Command palette (⌘K)
 * - Platform-aware features (Telegram integration)
 */
export default function Layout({ children }: LayoutProps) {
  return ORIGAMI_SHELL ? <OrigamiShell>{children}</OrigamiShell> : <AppShell>{children}</AppShell>;
}
