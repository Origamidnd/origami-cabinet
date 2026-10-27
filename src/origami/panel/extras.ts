/**
 * Данные для виджетов, которых нет в API кабинета: статус серверов и трафик по дням.
 * Отдаёт их страница подписки по адресу `<ссылка подписки>/lk.json` (CORS только для ЛК).
 */

export interface LkServer {
  name: string;
  online: boolean;
  pingMs: number | null;
}

export interface LkExtras {
  servers: LkServer[];
  /** Байты по дням, от старого к сегодняшнему. */
  traffic: number[];
}

/** `https://sub.example/<shortUuid>` -> `https://sub.example/<shortUuid>/lk.json`; иначе null (виджеты не показываем). */
export function lkDataUrl(subscriptionUrl: string | null | undefined): string | null {
  if (!subscriptionUrl) return null;
  let url: URL;
  try {
    url = new URL(subscriptionUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.search || url.hash) return null;
  const m = /^\/([A-Za-z0-9_-]{6,64})\/?$/.exec(url.pathname);
  return m ? `${url.origin}/${m[1]}/lk.json` : null;
}

/** Проверка ответа: ЛК не доверяет форме чужого ответа вслепую. Не та форма - null. */
export function parseLkExtras(raw: unknown): LkExtras | null {
  if (!raw || typeof raw !== 'object') return null;
  const { servers, traffic } = raw as { servers?: unknown; traffic?: unknown };
  if (!Array.isArray(servers) || !Array.isArray(traffic)) return null;
  const list: LkServer[] = [];
  for (const s of servers) {
    if (!s || typeof s !== 'object') continue;
    const { name, online, pingMs } = s as Record<string, unknown>;
    if (typeof name !== 'string' || typeof online !== 'boolean') continue;
    list.push({
      name: name.slice(0, 64),
      online,
      pingMs:
        typeof pingMs === 'number' && Number.isFinite(pingMs) && pingMs >= 0
          ? Math.round(pingMs)
          : null,
    });
  }
  const days = traffic
    .map((d) => (d && typeof d === 'object' ? (d as { bytes?: unknown }).bytes : undefined))
    .map((b) => (typeof b === 'number' && Number.isFinite(b) && b > 0 ? b : 0));
  return { servers: list, traffic: days };
}

/** Серверы для виджета: сначала в сети по пингу, потом без связи; не больше `limit`. */
export function sortServers(servers: LkServer[], limit = 6): LkServer[] {
  const rank = (s: LkServer) => (s.online ? (s.pingMs ?? 9999) : 100000);
  return [...servers].sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}
