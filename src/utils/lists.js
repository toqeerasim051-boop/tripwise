/** Immutable helpers for arrays of `{ id }` objects. They return the same array when nothing changes. */

export function replaceById(list, item) {
  return list.some((entry) => entry.id === item.id)
    ? list.map((entry) => (entry.id === item.id ? item : entry))
    : list;
}

export function removeById(list, id) {
  return list.some((entry) => entry.id === id) ? list.filter((entry) => entry.id !== id) : list;
}
