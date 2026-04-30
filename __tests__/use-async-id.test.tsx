import { sleep } from '../src/utils';
import { useAsync, IdCacheManager } from '../src';
import type { CacheManager } from '../src';
import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

const uniqueId = (() => {
  let n = 0;
  return (label: string) => `${label}-${++n}-${Date.now()}`;
})();

afterEach(() => {
  IdCacheManager.clearAll();
});

test('id + swr: second mount hits cache and skips pending flash', async () => {
  const id = uniqueId('cross-mount');
  let callCount = 0;
  const fetchData = async () => {
    callCount++;
    await sleep(40);
    return { value: callCount };
  };

  const App = () => {
    const { pending, data } = useAsync(fetchData, {
      id,
      cache: { ttl: 5_000, swr: true },
    });
    if (pending) return <span role="loading">loading</span>;
    return <div role="app">value={data?.value}</div>;
  };

  const first = render(<App />);
  expect(screen.getByRole('loading')).toBeInTheDocument();
  await waitFor(() => screen.getByRole('app'));
  expect(screen.getByRole('app')).toHaveTextContent('value=1');
  expect(callCount).toBe(1);
  first.unmount();

  render(<App />);
  expect(screen.queryByRole('loading')).toBeNull();
  expect(screen.getByRole('app')).toHaveTextContent('value=1');

  await waitFor(() => expect(callCount).toBe(2));
});

test('id without ttl/capacity does not survive unmount', async () => {
  const id = uniqueId('no-survive');
  let callCount = 0;
  const fetchData = async () => {
    callCount++;
    await sleep(20);
    return { value: callCount };
  };

  const App = () => {
    const { pending, data } = useAsync(fetchData, {
      id,
      cache: { swr: true },
    });
    if (pending) return <span role="loading">loading</span>;
    return <div role="app">value={data?.value}</div>;
  };

  const first = render(<App />);
  await waitFor(() => screen.getByRole('app'));
  expect(callCount).toBe(1);
  first.unmount();

  render(<App />);
  expect(screen.getByRole('loading')).toBeInTheDocument();
  await waitFor(() => screen.getByRole('app'));
  expect(callCount).toBe(2);
});

test('cacheManager + swr: pre-populated manager skips pending flash on first mount', async () => {
  // Custom cache manager pre-populated with data — useAsync should peek it
  // before flipping into the pending state, so the user never sees a loading flash.
  const store = new Map<string, { data: any; timestamp: number }>();
  const customManager: CacheManager<{ value: number }> = {
    get(key) {
      const e = store.get(key);
      return e ? { value: e.data } : null;
    },
    set(key, data) {
      store.set(key, { data, timestamp: Date.now() });
    },
    delete(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
  // Seed the cache for the no-arg call key
  customManager.set('[]', { value: 99 });

  let callCount = 0;
  const fetchData = async () => {
    callCount++;
    await sleep(20);
    return { value: 999 };
  };

  const App = () => {
    const { pending, data } = useAsync(fetchData, {
      cache: { manager: customManager, swr: true },
    });
    if (pending) return <span role="loading">loading</span>;
    return <div role="app">v={data?.value}</div>;
  };

  render(<App />);

  // Should NOT see loading — pre-populated cache should be picked up by the
  // useState lazy initializer via cacheManagerForState.get('[]').
  expect(screen.queryByRole('loading')).toBeNull();
  expect(screen.getByRole('app')).toHaveTextContent('v=99');

  // SWR fires the background refresh which writes the new value (999).
  await waitFor(() => expect(callCount).toBe(1));
  await waitFor(() => expect(screen.getByRole('app')).toHaveTextContent('v=999'));
});

test('IdCacheManager.clear(id) wipes cross-mount cache', async () => {
  const id = uniqueId('clear-cross');
  let callCount = 0;
  const fetchData = async () => {
    callCount++;
    await sleep(20);
    return { value: callCount };
  };

  const App = () => {
    const { pending, data } = useAsync(fetchData, {
      id,
      cache: { ttl: 5_000, swr: true },
    });
    if (pending) return <span role="loading">loading</span>;
    return <div role="app">value={data?.value}</div>;
  };

  const first = render(<App />);
  await waitFor(() => screen.getByRole('app'));
  first.unmount();

  await act(async () => {
    IdCacheManager.clear(id);
  });

  render(<App />);
  expect(screen.getByRole('loading')).toBeInTheDocument();
  await waitFor(() => screen.getByRole('app'));
  expect(callCount).toBe(2);
});
