// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QrZoom } from './QrZoom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

describe('QrZoom', () => {
  it('по нажатию открывает крупный QR, Esc закрывает и возвращает фокус', () => {
    render(<QrZoom value="https://example.test/sub/abc" />);
    const small = screen.getByRole('button', { name: 'origami.add.qrOpen' });
    expect(screen.queryByTestId('qr-zoom')).toBeNull();
    small.focus();
    fireEvent.click(small);
    expect(screen.getByTestId('qr-zoom')).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'origami.add.qrClose' }),
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('qr-zoom')).toBeNull();
    expect(document.activeElement).toBe(small);
  });

  it('закрывается кликом в любое место и кнопкой «Закрыть»', () => {
    render(<QrZoom value="https://example.test/sub/abc" />);
    fireEvent.click(screen.getByRole('button', { name: 'origami.add.qrOpen' }));
    fireEvent.click(screen.getByTestId('qr-zoom'));
    expect(screen.queryByTestId('qr-zoom')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'origami.add.qrOpen' }));
    fireEvent.click(screen.getByRole('button', { name: 'origami.add.qrClose' }));
    expect(screen.queryByTestId('qr-zoom')).toBeNull();
  });

  it('Esc и Tab не доходят до окна под QR', () => {
    const outer = vi.fn();
    document.addEventListener('keydown', outer);
    render(<QrZoom value="https://example.test/sub/abc" />);
    fireEvent.click(screen.getByRole('button', { name: 'origami.add.qrOpen' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'origami.add.qrOpen' }));
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(outer).not.toHaveBeenCalled();
    document.removeEventListener('keydown', outer);
  });
});
