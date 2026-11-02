import { describe, expect, it } from 'vitest';
import { buildClientLink } from './AppLink';

describe('buildClientLink', () => {
  it('encodes the subscription url as the last parameter', () => {
    const subscription = 'https://sub.origamivpn.pro/AbC?x=1&y=2';
    const link = buildClientLink(subscription);
    expect(link.startsWith('origamivpn://install-config?name=OrigamiVPN&url=')).toBe(true);
    // The client takes the rest of the query after `url=` as the address.
    const raw = link.slice(link.indexOf('url=') + 'url='.length);
    expect(decodeURIComponent(raw)).toBe(subscription);
  });
});
