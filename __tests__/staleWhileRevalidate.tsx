import { sleep } from '../src/utils';
import { useAsyncFunction } from '../src';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { useEffect, useState } from 'react';
import React from 'react';

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
        const { loading, data, backgroundUpdating, fn } = useAsyncFunction(getUserInfo, {
            ttl: 1000, // 1 second cache
            swr: true,
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
        const { loading, data, backgroundUpdating, fn } = useAsyncFunction(getUserInfo, {
            auto: false,
            ttl: 1000,
            swr: false, // Disabled
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

    // Manual refresh - should show loading and wait for new data
    await act(async () => {
        fireEvent.click(screen.getByRole('refresh'));
    });
    expect(screen.getByRole('loading')).toHaveTextContent('loading');
    
    // Wait for new data
    await waitFor(() => {
        expect(screen.getByRole('app')).toHaveTextContent('id-2');
    });
    expect(callCount).toBe(2);
    expect(screen.queryByRole('background-updating')).not.toBeInTheDocument();
}); 