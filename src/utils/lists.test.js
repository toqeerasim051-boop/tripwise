// @vitest-environment node
import { removeById, replaceById } from './lists.js';

describe('replaceById / removeById', () => {
  const list = [
    { id: 'a', value: 1 },
    { id: 'b', value: 2 },
  ];

  it('replaces and removes without mutating', () => {
    expect(replaceById(list, { id: 'b', value: 99 })).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 99 },
    ]);
    expect(removeById(list, 'a')).toEqual([{ id: 'b', value: 2 }]);
    expect(list).toHaveLength(2);
  });

  it('returns the same array when the id is unknown', () => {
    expect(replaceById(list, { id: 'zzz' })).toBe(list);
    expect(removeById(list, 'zzz')).toBe(list);
  });
});
