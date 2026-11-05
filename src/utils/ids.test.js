// @vitest-environment node
import { createId } from './ids.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('createId', () => {
  it('returns unique v4 UUIDs', () => {
    const ids = new Set(Array.from({ length: 100 }, createId));
    expect(ids.size).toBe(100);
    ids.forEach((id) => expect(id).toMatch(UUID_V4));
  });

  it('falls back to getRandomValues outside secure contexts', () => {
    vi.spyOn(crypto, 'randomUUID', 'get').mockReturnValue(undefined);
    expect(createId()).toMatch(UUID_V4);
  });
});
