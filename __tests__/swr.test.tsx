import { sleep } from '../src/utils';
import { useAsync } from '../src';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { useEffect, useState } from 'react';
import React from 'react';

describe('SWR', () => {

test('staleWhileRevalidate - basic functionality', async () => {
    let callCount = 0;
    const getUserInfo = async () => {
        callCount++;
        await sleep(100);
        return {
            name: `user-${callCount}`,
            age: 20 + callCount,
            id: `id-${callCount}`,
        };
    };

    const App = () => {
        const { loading, data, backgroundUpdating, fn } = useAsync(getUserInfo, {
            cache: { ttl: 1000, swr: true }, // 1 second cache
        });

        if (loading) {
            return <span role="loading">loading</span>;
        }

        return (
            <div role="app">
                <span>{data?.id}</span>
                <span>{data?.name}</span>
                <span>{data?.age}</span>
                {backgroundUpdating && <span role="background-updating">updating...</span>}
                <button role="refresh" onClick={() => fn()}>Refresh</button>
            </div>
        );
    };

    render(<App />);
    
    // Initial load should show loading
    expect(screen.getByRole('loading')).toHaveTextContent('loading');
    
    // Wait for initial data to load
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('id-1');
    expect(callCount).toBe(1);

    // Click refresh - should trigger background update
    await act(async () => {
        fireEvent.click(screen.getByRole('refresh'));
    });
    
    // Wait for background update to complete and data to change
    await waitFor(() => {
        expect(screen.getByRole('app')).toHaveTextContent('id-2');
    }, { timeout: 5000 });
    
    expect(callCount).toBe(2);
});

test('staleWhileRevalidate - disabled behavior', async () => {
    let callCount = 0;
    const getUserInfo = async () => {
        callCount++;
        await sleep(30);
        return {
            name: `user-${callCount}`,
            age: 20 + callCount,
            id: `id-${callCount}`,
        };
    };

    const App = () => {
        const { loading, data, backgroundUpdating, fn } = useAsync(getUserInfo, {
            auto: false,
            cache: { ttl: 1000, swr: false },
            // swr: false, // Disabled
        });

        useEffect(() => {
            fn();
        }, [fn]);

        if (loading) {
            return <span role="loading">loading</span>;
        }

        return (
            <div role="app">
                <span>{data?.id}</span>
                <span>{data?.name}</span>
                <span>{data?.age}</span>
                {backgroundUpdating && <span role="background-updating">updating...</span>}
                <button role="refresh" onClick={() => fn()}>Refresh</button>
            </div>
        );
    };

    render(<App />);

    // Initial load
    await waitFor(() => screen.getByRole('app'), { timeout: 5000 });
    expect(callCount).toBe(1);

    await waitFor(() => screen.getByRole('app'), { timeout: 5000 });
    // Get refresh button
    const refreshButton = screen.getByRole('refresh');

    await sleep(1000);

    // Manual refresh - should show loading and wait for new data
    await act(async () => {
        fireEvent.click(refreshButton);
    });

    // Wait for loading state to appear
    await waitFor(() => {
        expect(screen.getByRole('loading')).toHaveTextContent('loading');
    });
    
    // Wait for new data
    await waitFor(() => {
        expect(screen.getByRole('app')).toHaveTextContent('id-2');
    });
    expect(callCount).toBe(2);
    expect(screen.queryByRole('background-updating')).not.toBeInTheDocument();
});

test('should return cached data immediately and update with fresh data in background', async () => {
    let callCount = 0;
    const fetchUser = async () => {
        callCount++;
        await sleep(50);
        return { id: `user-${callCount}`, name: `name-${callCount}` };
    };

    const App = () => {
        const { loading, data, backgroundUpdating, fn } = useAsync(fetchUser, {
            ttl: 1000,
            swr: true,
        });
        if (loading) return <span role="loading">loading</span>;
        return (
            <div role="app">
                <span>{data?.id}</span>
                {backgroundUpdating && <span role="bg-updating">bg</span>}
                <button role="refresh" onClick={() => fn()}>Refresh</button>
            </div>
        );
    };

    render(<App />);

    // Initial load
    expect(screen.getByRole('loading')).toHaveTextContent('loading');
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('user-1');
    expect(callCount).toBe(1);

    // Trigger refresh — should show cached data immediately and then update
    await act(async () => {
        fireEvent.click(screen.getByRole('refresh'));
    });

    // Data stays on cached value, backgroundUpdating appears
    expect(screen.getByRole('app')).toHaveTextContent('user-1');
    expect(screen.getByRole('bg-updating')).toHaveTextContent('bg');

    // Wait for background update to complete
    await waitFor(() => {
        expect(screen.getByRole('app')).toHaveTextContent('user-2');
    }, { timeout: 5000 });

    expect(screen.queryByRole('bg-updating')).not.toBeInTheDocument();
    expect(callCount).toBe(2);
});

test('should discard stale background update when params change rapidly', async () => {
    // A's fetch is slow (100ms), B's fetch is fast (30ms)
    let callCount = 0;
    const fetchUser = async (id: string) => {
        callCount++;
        const delay = id === 'A' ? 100 : 30;
        await sleep(delay);
        return { id, call: callCount };
    };

    const App = () => {
        const { loading, data, backgroundUpdating, fn } = useAsync(fetchUser, {
            auto: false,
            ttl: 1000,
            swr: true,
        });
        return (
            <div>
                {(loading || !data) && <span role="loading">loading</span>}
                {data && (
                    <div role="app">
                        <span>{data.id}</span>
                        {backgroundUpdating && <span role="bg-updating">bg</span>}
                    </div>
                )}
                <button role="fetch-a" onClick={() => fn('A')}>Fetch A</button>
                <button role="fetch-b" onClick={() => fn('B')}>Fetch B</button>
            </div>
        );
    };

    render(<App />);

    // Populate cache for 'A'
    await act(async () => {
        fireEvent.click(screen.getByRole('fetch-a'));
    });
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('A');

    // Populate cache for 'B'
    await act(async () => {
        fireEvent.click(screen.getByRole('fetch-b'));
    });
    await waitFor(() => {
        expect(screen.getByRole('app')).toHaveTextContent('B');
    });

    // Trigger rapid succession: fetch A (slow → 100ms bg update), then
    // immediately fetch B (fast → 30ms bg update). Both are SWR cache hits.
    await act(async () => {
        fireEvent.click(screen.getByRole('fetch-a'));
    });
    // Clicking fetch-a: SWR returns cached A, latestKeyRef = key_A,
    // data becomes A with bg-updating visible.
    expect(screen.getByRole('app')).toHaveTextContent('A');
    expect(screen.getByRole('bg-updating')).toHaveTextContent('bg');

    // Immediately click fetch-b: latestKeyRef = key_B, SWR returns cached B.
    await act(async () => {
        fireEvent.click(screen.getByRole('fetch-b'));
    });
    expect(screen.getByRole('app')).toHaveTextContent('B');

    // Wait for B's fast bg update to complete (30ms)
    await sleep(80);

    // Data should be B (from B's bg update, not overwritten by A's stale bg update)
    expect(screen.getByRole('app')).toHaveTextContent('B');

    // Wait for A's slow bg update to complete (100ms) + buffer
    await sleep(100);

    // Data should STILL be B — A's stale bg update must be discarded
    expect(screen.getByRole('app')).toHaveTextContent('B');
    expect(screen.queryByRole('bg-updating')).not.toBeInTheDocument();
});

test('should only call user onBackgroundUpdate for the latest request', async () => {
    const userOnBgUpdate = jest.fn();

    let callCount = 0;
    const fetchUser = async (id: string) => {
        callCount++;
        const delay = id === 'slow' ? 100 : 20;
        await sleep(delay);
        return { id, call: callCount };
    };

    const App = () => {
        const { loading, data, backgroundUpdating, fn } = useAsync(fetchUser, {
            auto: false,
            ttl: 1000,
            swr: true,
            onBackgroundUpdate: userOnBgUpdate,
        });
        return (
            <div>
                {(loading || !data) && <span role="loading">loading</span>}
                {data && (
                    <div role="app">
                        <span>{data.id}</span>
                        {backgroundUpdating && <span role="bg-updating">bg</span>}
                    </div>
                )}
                <button role="fetch-slow" onClick={() => fn('slow')}>Slow</button>
                <button role="fetch-fast" onClick={() => fn('fast')}>Fast</button>
            </div>
        );
    };

    render(<App />);

    // Populate both caches
    await act(async () => { fireEvent.click(screen.getByRole('fetch-slow')); });
    await waitFor(() => screen.getByRole('app'));
    await act(async () => { fireEvent.click(screen.getByRole('fetch-fast')); });
    await waitFor(() => { expect(screen.getByRole('app')).toHaveTextContent('fast'); });

    userOnBgUpdate.mockClear();

    // Trigger rapid succession: slow then fast
    await act(async () => { fireEvent.click(screen.getByRole('fetch-slow')); });
    await act(async () => { fireEvent.click(screen.getByRole('fetch-fast')); });

    // Wait for both bg updates to settle
    await sleep(200);

    // User callback should only have been called for the latest (fast) request
    const calls = userOnBgUpdate.mock.calls;
    // Each call is [data, error] — verify all data have id === 'fast'
    const dataCalls = calls.filter((c: any[]) => c[0] !== undefined);
    expect(dataCalls.length).toBeGreaterThan(0);
    for (const c of dataCalls) {
        expect(c[0].id).toBe('fast');
    }
});

test('should preserve cached data when background update errors', async () => {
    let shouldFail = false;
    const fetchUser = async () => {
        await sleep(30);
        if (shouldFail) throw new Error('bg fetch failed');
        return { id: 'user-ok', name: 'test' };
    };

    const App = () => {
        const { loading, data, error, backgroundUpdating, fn } = useAsync(fetchUser, {
            ttl: 1000,
            swr: true,
        });
        if (loading) return <span role="loading">loading</span>;
        return (
            <div role="app">
                <span>{data?.id}</span>
                {error && <span role="error">{error.message}</span>}
                {backgroundUpdating && <span role="bg-updating">bg</span>}
                <button role="refresh" onClick={() => fn()}>Refresh</button>
            </div>
        );
    };

    render(<App />);

    // Initial load succeeds
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('user-ok');

    // Enable failure and trigger refresh
    shouldFail = true;
    await act(async () => {
        fireEvent.click(screen.getByRole('refresh'));
    });

    // Data should stay as cached value (user-ok), error set, bg-updating cleared
    await waitFor(() => {
        expect(screen.getByRole('error')).toHaveTextContent('bg fetch failed');
    }, { timeout: 5000 });

    expect(screen.getByRole('app')).toHaveTextContent('user-ok');
    expect(screen.queryByRole('bg-updating')).not.toBeInTheDocument();
});

test('should clear error on successful background update', async () => {
    let shouldFail = true;
    const fetchUser = async () => {
        await sleep(30);
        if (shouldFail) throw new Error('fail');
        return { id: 'user-ok', name: 'test' };
    };

    const App = () => {
        const { loading, data, error, backgroundUpdating, fn } = useAsync(fetchUser, {
            ttl: 1000,
            swr: true,
            initialData: { id: 'initial', name: 'init' },
        });
        if (loading) return <span role="loading">loading</span>;
        return (
            <div role="app">
                <span>{data?.id}</span>
                {error && <span role="error">{error.message}</span>}
                {backgroundUpdating && <span role="bg-updating">bg</span>}
                <button role="refresh" onClick={() => fn()}>Refresh</button>
            </div>
        );
    };

    render(<App />);

    // Initial load fails — shows error, data preserved as initialData
    await waitFor(() => screen.getByRole('error'));
    expect(screen.getByRole('error')).toHaveTextContent('fail');
    expect(screen.getByRole('app')).toHaveTextContent('initial');

    // Fix the fetcher and refresh
    shouldFail = false;
    await act(async () => {
        fireEvent.click(screen.getByRole('refresh'));
    });

    // Data should update, error should clear
    await waitFor(() => {
        expect(screen.getByRole('app')).toHaveTextContent('user-ok');
    }, { timeout: 5000 });

    expect(screen.queryByRole('error')).not.toBeInTheDocument();
    expect(screen.queryByRole('bg-updating')).not.toBeInTheDocument();
});

test('should not flash loading on deps change when cache exists', async () => {
    let callCount = 0;
    const fetchUser = async (id: string) => {
        callCount++;
        await sleep(30);
        return { id, call: callCount };
    };

    const App = () => {
        const [userId, setUserId] = useState('A');
        const { loading, data, backgroundUpdating } = useAsync(
            () => fetchUser(userId),
            {
                id: `user-${userId}`,
                deps: [userId],
                ttl: 1000,
                swr: true,
            }
        );
        if (loading || !data) return <span role="loading">loading</span>;
        return (
            <div role="app">
                <span>{data.id}</span>
                {backgroundUpdating && <span role="bg-updating">bg</span>}
                <button role="to-b" onClick={() => setUserId('B')}>To B</button>
                <button role="to-a" onClick={() => setUserId('A')}>To A</button>
            </div>
        );
    };

    render(<App />);

    // Initial load for userId='A'
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('A');

    // Switch to B — new key, normal fetch with loading
    await act(async () => { fireEvent.click(screen.getByRole('to-b')); });
    await waitFor(() => {
        expect(screen.getByRole('app')).toHaveTextContent('B');
    }, { timeout: 3000 });

    // Switch back to A — cache should exist in IdCacheManager, no loading flash
    await act(async () => { fireEvent.click(screen.getByRole('to-a')); });

    // App should stay visible through the transition (no loading element appears)
    await sleep(100);
    expect(screen.getByRole('app')).toHaveTextContent('A');
    expect(screen.queryByRole('loading')).not.toBeInTheDocument();
    expect(screen.queryByRole('bg-updating')).not.toBeInTheDocument();
});

}); // end describe('SWR')