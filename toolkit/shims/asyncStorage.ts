type KeyValuePair = [string, string];

const hasLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const getItem = async(key: string): Promise<string | null> => {
  if (!hasLocalStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setItem = async(key: string, value: string): Promise<void> => {
  if (!hasLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {}
};

const removeItem = async(key: string): Promise<void> => {
  if (!hasLocalStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {}
};

const clear = async(): Promise<void> => {
  if (!hasLocalStorage()) {
    return;
  }

  try {
    window.localStorage.clear();
  } catch {}
};

const getAllKeys = async(): Promise<Array<string>> => {
  if (!hasLocalStorage()) {
    return [];
  }

  try {
    return Object.keys(window.localStorage);
  } catch {
    return [];
  }
};

const multiGet = async(keys: Array<string>): Promise<Array<[string, string | null]>> => {
  const values = await Promise.all(keys.map(async(key) => [ key, await getItem(key) ] as [string, string | null]));
  return values;
};

const multiSet = async(entries: Array<KeyValuePair>): Promise<void> => {
  await Promise.all(entries.map(async([ key, value ]) => setItem(key, value)));
};

const multiRemove = async(keys: Array<string>): Promise<void> => {
  await Promise.all(keys.map(async(key) => removeItem(key)));
};

const mergeItem = async(key: string, value: string): Promise<void> => {
  const existing = await getItem(key);

  if (!existing) {
    await setItem(key, value);
    return;
  }

  try {
    const parsedExisting = JSON.parse(existing) as unknown;
    const parsedValue = JSON.parse(value) as unknown;
    const existingRecord = parsedExisting !== null && typeof parsedExisting === 'object' ? parsedExisting as Record<string, unknown> : {};
    const valueRecord = parsedValue !== null && typeof parsedValue === 'object' ? parsedValue as Record<string, unknown> : {};
    const merged = JSON.stringify({ ...existingRecord, ...valueRecord });
    await setItem(key, merged);
  } catch {
    await setItem(key, value);
  }
};

const AsyncStorage = {
  getItem,
  setItem,
  removeItem,
  clear,
  getAllKeys,
  multiGet,
  multiSet,
  multiRemove,
  mergeItem,
};

export default AsyncStorage;
