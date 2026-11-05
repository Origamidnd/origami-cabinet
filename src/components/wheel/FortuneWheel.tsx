import { Trans } from 'react-i18next';
import { useEffect, useRef, useState, memo } from 'react';
import type { WheelPrize } from '../../api/wheel';

const SIZE = 400;
const CENTER = SIZE / 2;
/** Цвета секторов: хурма и тушь вперемежку, те же у списка призов. */
export const WHEEL_SECTOR_COLORS = ['#EE7C34', '#2F3D6B', '#C4561F', '#4A5B94'];

const SPIN_DURATION_MS = 5000;
/** Пять полных оборотов до целевого сектора. */
const SPIN_EXTRA_TURNS_DEG = 1800;

// Та же кривая, что раньше стояла в CSS-переходе: cubic-bezier(0.15, 0.6, 0.1, 1).
const [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2] = [0.15, 0.6, 0.1, 1];

function bezierAxis(a1: number, a2: number, t: number): number {
  return (((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t + 3 * a1) * t;
}

function bezierSlope(a1: number, a2: number, t: number): number {
  return 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;
}

/** Доля пути по времени 0..1 → доля поворота 0..1. */
export function spinEasing(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i += 1) {
    const slope = bezierSlope(EASE_X1, EASE_X2, t);
    if (slope === 0) break;
    t -= (bezierAxis(EASE_X1, EASE_X2, t) - x) / slope;
  }
  return bezierAxis(EASE_Y1, EASE_Y2, Math.min(1, Math.max(0, t)));
}

function rotateAttr(angle: number): string {
  return `rotate(${angle} ${CENTER} ${CENTER})`;
}

interface FortuneWheelProps {
  prizes: WheelPrize[];
  isSpinning: boolean;
  targetRotation: number | null;
  onSpinComplete: () => void;
}

const FortuneWheel = memo(function FortuneWheel({
  prizes,
  isSpinning,
  targetRotation,
  onSpinComplete,
}: FortuneWheelProps) {
  const wheelRef = useRef<SVGGElement>(null);
  const accumulatedRotation = useRef(0);
  // Угол покоя: пока идёт спин, React рисует прежний угол и в DOM не лезет,
  // атрибут ведёт кадр за кадром сам спин; по его концу угол покоя догоняет.
  const [restAngle, setRestAngle] = useState(0);
  const latestOnComplete = useRef(onSpinComplete);
  latestOnComplete.current = onSpinComplete;

  useEffect(() => {
    if (!isSpinning || targetRotation === null) return;
    const group = wheelRef.current;
    if (!group) return;
    const from = accumulatedRotation.current;
    let delta = targetRotation - (from % 360);
    while (delta < 0) delta += 360;
    const to = from + SPIN_EXTRA_TURNS_DEG + delta;
    accumulatedRotation.current = to;

    // Крутим SVG-атрибутом по requestAnimationFrame, а не CSS-transform с переходом:
    // CSS-transform на <g> заводит отдельный композитный слой, и Android WebView на
    // части устройств (Xiaomi 12, 17.09.2026) рисует его плитки чёрными квадратами
    // поверх секторов. Атрибут рисуется вместе со всем SVG — компоновать нечего.
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / SPIN_DURATION_MS);
      group.setAttribute('transform', rotateAttr(from + (to - from) * spinEasing(progress)));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      setRestAngle(to);
      latestOnComplete.current();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isSpinning, targetRotation]);

  if (prizes.length === 0) {
    return (
      <div className="mx-auto flex aspect-square w-full max-w-md items-center justify-center">
        <p className="text-dark-400">
          <Trans i18nKey="wheel.noPrizesConfigured" />
        </p>
      </div>
    );
  }

  const size = SIZE;
  const center = CENTER;
  const outerRadius = size / 2 - 20;
  const innerRadius = outerRadius - 15;
  const prizeRadius = innerRadius - 5;
  const sectorAngle = 360 / prizes.length;
  const hubRadius = 45;

  const createSectorPath = (index: number) => {
    const startAngle = (index * sectorAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * sectorAngle - 90) * (Math.PI / 180);

    const x1 = center + prizeRadius * Math.cos(startAngle);
    const y1 = center + prizeRadius * Math.sin(startAngle);
    const x2 = center + prizeRadius * Math.cos(endAngle);
    const y2 = center + prizeRadius * Math.sin(endAngle);

    const x1Inner = center + hubRadius * Math.cos(startAngle);
    const y1Inner = center + hubRadius * Math.sin(startAngle);
    const x2Inner = center + hubRadius * Math.cos(endAngle);
    const y2Inner = center + hubRadius * Math.sin(endAngle);

    const largeArc = sectorAngle > 180 ? 1 : 0;

    return `M ${x1Inner} ${y1Inner}
            L ${x1} ${y1}
            A ${prizeRadius} ${prizeRadius} 0 ${largeArc} 1 ${x2} ${y2}
            L ${x2Inner} ${y2Inner}
            A ${hubRadius} ${hubRadius} 0 ${largeArc} 0 ${x1Inner} ${y1Inner} Z`;
  };

  // Position for emoji - closer to outer edge
  const getEmojiPosition = (index: number) => {
    const angle = (index * sectorAngle + sectorAngle / 2 - 90) * (Math.PI / 180);
    const emojiRadius = prizeRadius * 0.75;
    return {
      x: center + emojiRadius * Math.cos(angle),
      y: center + emojiRadius * Math.sin(angle),
      rotation: index * sectorAngle + sectorAngle / 2,
    };
  };

  // Origami: сектора в цветах бренда, цвет приза из настроек не используем
  const getSectorColors = (index: number) =>
    WHEEL_SECTOR_COLORS[index % WHEEL_SECTOR_COLORS.length];

  return (
    <div className="relative mx-auto w-full max-w-[380px] select-none">
      {/* Pointer */}
      <div className="absolute left-1/2 top-[-12px] z-20 -translate-x-1/2">
        <div className="relative">
          <div
            className={`absolute inset-[-10px] blur-lg transition-opacity ${isSpinning ? 'opacity-100' : 'opacity-70'}`}
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.9) 0%, transparent 60%)',
            }}
          />
          <svg width="44" height="56" viewBox="0 0 44 56" className="relative">
            <polygon
              points="22,54 4,14 22,2 40,14"
              fill="var(--action, #EE7C34)"
              stroke="var(--ln, #5C668F)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Main Wheel */}
      <div className="relative aspect-square">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
          <defs>
            {/* SVG-native emoji shadow (not a CSS filter): CSS-фильтры ломаются под GPU-слоем спина */}
            <filter id="emojiShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Rotating wheel group — угол атрибутом, см. эффект спина выше */}
          <g ref={wheelRef} transform={rotateAttr(restAngle)}>
            {/* Sectors */}
            {prizes.map((prize, index) => (
              <path
                key={`sector-${prize.id}`}
                d={createSectorPath(index)}
                fill={getSectorColors(index)}
                stroke="var(--paper, #0E1530)"
                strokeWidth="2"
              />
            ))}

            {/* Sector dividers */}
            {prizes.map((_, index) => {
              const angle = (index * sectorAngle - 90) * (Math.PI / 180);
              const x1 = center + hubRadius * Math.cos(angle);
              const y1 = center + hubRadius * Math.sin(angle);
              const x2 = center + prizeRadius * Math.cos(angle);
              const y2 = center + prizeRadius * Math.sin(angle);
              return (
                <line
                  key={`divider-${index}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--paper, #0E1530)"
                  strokeWidth="2"
                />
              );
            })}

            {/* Prize content - Emoji */}
            {prizes.map((prize, index) => {
              const pos = getEmojiPosition(index);
              return (
                <text
                  key={`emoji-${prize.id}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={prizes.length <= 6 ? '32' : '26'}
                  transform={`rotate(${pos.rotation}, ${pos.x}, ${pos.y})`}
                  filter="url(#emojiShadow)"
                >
                  {prize.emoji}
                </text>
              );
            })}

            {/* Prize content - Text removed, only emoji visible on wheel */}
          </g>

          {/* Обод и лампочки рисуются ПОСЛЕ вращающейся группы. Они с ней не
              пересекаются (сектора кончаются на prizeRadius, обод начинается
              дальше), поэтому на вид порядок безразличен. Но у группы есть
              CSS-transform, и Android WebView на части устройств (Xiaomi 12,
              17.09.2026) выносит её в отдельный слой, чьи прозрачные пиксели
              «пробивают» всё, что нарисовано ниже, до подложки Telegram: обод
              пропадал везде, где его накрывал квадрат группы. Выше группы обод
              ничем не накрыт. */}
          {/* Outer decorative ring */}
          <circle
            data-testid="wheel-ring"
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke="var(--ln, #5C668F)"
            strokeWidth="3"
          />

          {/* Center hub */}
          <circle
            data-testid="wheel-hub"
            cx={center}
            cy={center}
            r={hubRadius}
            fill="var(--plate, #16203C)"
            stroke="var(--ln, #5C668F)"
            strokeWidth="3"
          />
          <circle cx={center} cy={center} r={hubRadius / 3} fill="var(--action, #EE7C34)" />
        </svg>
      </div>
    </div>
  );
});

export default FortuneWheel;
