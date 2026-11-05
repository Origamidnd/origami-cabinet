// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FortuneWheel from './FortuneWheel';

/**
 * Колесо рисуется одной картинкой: внутри SVG ничего не компонуется отдельно.
 *
 * Android WebView на части устройств (Xiaomi 12, жалоба 17.09.2026) рисует
 * отдельные GPU-слои внутри SVG чёрными плитками поверх соседей: сначала
 * пропадал обод под квадратом вращающейся группы, после переноса обода выше —
 * чёрный прямоугольник поверх секторов. Слои заводили CSS-transform на группе
 * (вращение) и анимация opacity у свечения лампочек. Теперь вращение идёт
 * SVG-атрибутом, который рисуется вместе со всем SVG. Лампочек и анимаций в SVG
 * больше нет (колесо в цветах бренда), а порядок слоёв держится: обод после
 * группы, ступица после обода.
 */

const prizes = [
  { id: 1, emoji: '🎁', color: '#22C55E' },
  { id: 2, emoji: '📅', color: '#F59E0B' },
  { id: 3, emoji: '💩', color: '#8B5A2B' },
] as never;
const rest = { prizes, isSpinning: false, targetRotation: null, onSpinComplete: () => {} };
const ROTATING = 'svg > g[transform^="rotate("]';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function follows(later: Element, earlier: Element): boolean {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function pick(container: HTMLElement, selector: string): Element {
  const node = container.querySelector(selector);
  if (!node) throw new Error(`в разметке колеса нет ${selector}`);
  return node;
}

describe('FortuneWheel — порядок слоёв', () => {
  it('обод идёт после вращающейся группы, ступица - после обода', () => {
    const { container } = render(<FortuneWheel {...rest} />);
    const rotating = pick(container, ROTATING);
    const ring = pick(container, '[data-testid="wheel-ring"]');
    const hub = pick(container, '[data-testid="wheel-hub"]');

    expect(follows(ring, rotating)).toBe(true);
    expect(follows(hub, ring)).toBe(true);
  });
});

describe('FortuneWheel — ничего не компонуется отдельно', () => {
  it('внутри SVG нет CSS-transform: вращение задано атрибутом', () => {
    const { container } = render(<FortuneWheel {...rest} />);
    expect(container.querySelectorAll('svg [style*="transform"]').length).toBe(0);
    expect(pick(container, ROTATING).getAttribute('transform')).toBe('rotate(0 200 200)');
  });

  it('в SVG нет CSS-анимаций: они заводили бы отдельные слои', () => {
    const { container } = render(<FortuneWheel {...rest} />);
    expect(container.querySelector('svg style')).toBeNull();
  });

  it('сектора в цветах бренда, цвет приза из настроек не используется', () => {
    const { container } = render(<FortuneWheel {...rest} />);
    const fills = [...container.querySelectorAll('svg > g path')].map((n) =>
      n.getAttribute('fill'),
    );
    expect(fills).toEqual(['#EE7C34', '#2F3D6B', '#C4561F']);
  });

  it('спин крутит группу атрибутом пять секунд и потом сообщает о завершении', () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
    const onSpinComplete = vi.fn();
    const { container, rerender } = render(
      <FortuneWheel {...rest} onSpinComplete={onSpinComplete} />,
    );
    rerender(
      <FortuneWheel {...rest} isSpinning targetRotation={90} onSpinComplete={onSpinComplete} />,
    );

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(pick(container, ROTATING).getAttribute('transform')).not.toBe('rotate(0 200 200)');
    expect(onSpinComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onSpinComplete).toHaveBeenCalledTimes(1);
    // Пять полных оборотов плюс сектор: 1800 + 90.
    expect(pick(container, ROTATING).getAttribute('transform')).toBe('rotate(1890 200 200)');
  });
});
