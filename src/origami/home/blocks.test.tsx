// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { HelpBlock, SummaryStrip } from './blocks';

afterEach(cleanup);

describe('SummaryStrip', () => {
  it('рисует ячейки с подписью и значением в заданном порядке', () => {
    render(
      <SummaryStrip
        cells={[
          { label: 'Осталось', value: '40 дн.' },
          { label: 'Трафик', value: '37%' },
          { label: 'Устройства', value: '2 из 5' },
        ]}
      />,
    );
    const strip = screen.getByTestId('og-strip');
    expect(strip.children).toHaveLength(3);
    expect(strip.textContent).toBe('Осталось40 дн.Трафик37%Устройства2 из 5');
  });
});

describe('HelpBlock', () => {
  it('кнопка «Помощь» ведёт в поддержку', () => {
    render(
      <MemoryRouter>
        <HelpBlock title="Не получается?" text="Напишите, ответим в чате" button="Помощь" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Не получается?')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Помощь' }).getAttribute('href')).toBe('/support');
  });
});
