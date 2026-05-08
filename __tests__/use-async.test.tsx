import { sleep } from '../src/utils';
import { useAsync } from '../src';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { shareLoading } from '../src/share-loading';


describe('useAsync', () => {
  describe('Basic functionality', () => {
    test('should load data successfully on mount', async () => {
    const getUserInfo = async () => {
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const { loading, data } = useAsync(getUserInfo);
        if (loading) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
            </div>
        );
    };
    render(<App />);
    expect(screen.getByRole('loading')).toHaveTextContent('loading');
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(screen.getByRole('app')).toHaveTextContent('tom');
    expect(screen.getByRole('app')).toHaveTextContent('10');
});


test('should share loading state with same loadingId', async () => {
    const getUserInfo = async () => {
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const { loading, data } = useAsync(getUserInfo, {
            loadingId: 'app',
        });
        if (loading) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
            </div>
        );
    };
    const App2 = () => {
        const { loading, data } = useAsync(getUserInfo, {
            loadingId: 'app',
        });
        if (loading) {
            return <span role="loading2">loading2</span>;
        }
        return (
            <div role={'app2'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
            </div>
        );
    };
    render((
        <>
            <App />
            <App2 />
        </>
    ));
    expect(shareLoading.isLoading('app')).toBe(true);
    expect(screen.getByRole('loading')).toHaveTextContent('loading');
    expect(screen.getByRole('loading2')).toHaveTextContent('loading2');
    await waitFor(() => screen.getByRole('app'));

    expect(shareLoading.isLoading('app')).toBe(false);
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(screen.getByRole('app')).toHaveTextContent('tom');
    expect(screen.getByRole('app')).toHaveTextContent('10');

    expect(screen.getByRole('app2')).toHaveTextContent('xxx');
    expect(screen.getByRole('app2')).toHaveTextContent('tom');
    expect(screen.getByRole('app2')).toHaveTextContent('10');


    act(() => {
        useAsync.showLoading('app');
    });
    await waitFor(() => screen.getByRole('loading'));

    expect(shareLoading.isLoading('app')).toBe(true);
    expect(screen.getByRole('loading')).toHaveTextContent('loading');
    expect(screen.getByRole('loading2')).toHaveTextContent('loading2');
    act(() => {
        useAsync.hideLoading('app');
    });

    await waitFor(() => screen.getByRole('app'));

    expect(shareLoading.isLoading('app')).toBe(false);
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(screen.getByRole('app')).toHaveTextContent('tom');
    expect(screen.getByRole('app')).toHaveTextContent('10');

    expect(screen.getByRole('app2')).toHaveTextContent('xxx');
    expect(screen.getByRole('app2')).toHaveTextContent('tom');
    expect(screen.getByRole('app2')).toHaveTextContent('10');


});


test('should share loading state with same loadingId, one of them is not auto', async () => {
    const getUserInfo = async () => {
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const { loading, data } = useAsync(getUserInfo, {
            loadingId: 'app2',
        });
        if (loading) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
            </div>
        );
    };
    const App2 = () => {
        const { loading, data, fn } = useAsync(getUserInfo, {
            loadingId: 'app2',
            auto: false,
        });

        useEffect(() => {
            fn();
        }, [])

        if (loading || !data) {
            return <span role="loading2">loading2</span>;
        }
        return (
            <div role={'app2'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
            </div>
        );
    };
    render((
        <>
            <App />
            <App2 />
        </>
    ));
    expect(shareLoading.isLoading('app2')).toBe(true);
    expect(screen.getByRole('loading')).toHaveTextContent('loading');
    expect(screen.getByRole('loading2')).toHaveTextContent('loading2');
    await waitFor(() => screen.getByRole('app'));

    expect(shareLoading.isLoading('app2')).toBe(false);
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(screen.getByRole('app')).toHaveTextContent('tom');
    expect(screen.getByRole('app')).toHaveTextContent('10');

    expect(screen.getByRole('app2')).toHaveTextContent('xxx');
    expect(screen.getByRole('app2')).toHaveTextContent('tom');
    expect(screen.getByRole('app2')).toHaveTextContent('10');



});

describe('loadingId integration', () => {
    test('should reflect shared loading=false on error', async () => {
      const fetchWithError = async () => {
        await sleep(10);
        throw new Error('fail');
      };

      const App = () => {
        const { loading, error } = useAsync(fetchWithError, {
          loadingId: 'err-app',
        });
        if (loading) return <span role="loading">loading</span>;
        return <div role="app">{error ? error.message : 'ok'}</div>;
      };

      render(<App />);
      expect(shareLoading.isLoading('err-app')).toBe(true);
      expect(screen.getByRole('loading')).toBeInTheDocument();

      await waitFor(() => screen.getByRole('app'));
      expect(screen.getByRole('app')).toHaveTextContent('fail');
      expect(shareLoading.isLoading('err-app')).toBe(false);
    });

    test('should increment/decrement shared counter for first SWR load, not background revalidation', async () => {
      let callCount = 0;
      const fetchData = async () => {
        callCount++;
        await sleep(20);
        return { value: callCount };
      };

      const App = () => {
        const { loading, data, fn } = useAsync(fetchData, {
          loadingId: 'swr-ld',
          ttl: 1000,
          swr: true,
        });
        if (loading) return <span role="loading">loading</span>;
        return (
          <div role="app">
            <span>{data?.value}</span>
            <button role="refresh" onClick={() => fn()}>Refresh</button>
          </div>
        );
      };

      render(<App />);
      expect(shareLoading.isLoading('swr-ld')).toBe(true);
      expect(screen.getByRole('loading')).toBeInTheDocument();

      await waitFor(() => screen.getByRole('app'));
      expect(screen.getByRole('app')).toHaveTextContent('1');
      expect(shareLoading.isLoading('swr-ld')).toBe(false);

      // Background revalidation: should NOT set shared loading
      await act(async () => {
        fireEvent.click(screen.getByRole('refresh'));
      });
      expect(shareLoading.isLoading('swr-ld')).toBe(false);
      expect(screen.queryByRole('loading')).toBeNull();
      await waitFor(() => expect(callCount).toBe(2));
      expect(shareLoading.isLoading('swr-ld')).toBe(false);
    });

    test('should increment/decrement shared counter for auto=false manual calls', async () => {
      const fetchData = async () => {
        await sleep(50);
        return { name: 'tom' };
      };

      const App = () => {
        const { loading, data, fn } = useAsync(fetchData, {
          loadingId: 'manual-ld',
          auto: false,
        });

        useEffect(() => {
          fn();
        }, []);

        if (loading || !data) return <span role="loading">loading</span>;
        return <div role="app">{data.name}</div>;
      };

      render(<App />);
      // auto=false → loading starts as false; useEffect triggers fn() which
      // sets loading=true asynchronously (after Promise.resolve())
      await waitFor(() => expect(shareLoading.isLoading('manual-ld')).toBe(true));
      await waitFor(() => screen.getByRole('app'));
      expect(shareLoading.isLoading('manual-ld')).toBe(false);
    });

    test('should transition shared counter when loadingId changes dynamically', async () => {
      const fetchData = async () => {
        await sleep(30);
        return { name: 'data' };
      };

      const App = ({ lid }: { lid: string }) => {
        const { loading, data } = useAsync(fetchData, { loadingId: lid });
        if (loading) return <span role="loading">loading</span>;
        return <div role="app">{data?.name}</div>;
      };

      const { rerender } = render(<App lid="a" />);
      expect(shareLoading.isLoading('a')).toBe(true);
      expect(shareLoading.isLoading('b')).toBe(false);

      rerender(<App lid="b" />);
      expect(shareLoading.isLoading('a')).toBe(false);
      expect(shareLoading.isLoading('b')).toBe(true);

      await waitFor(() => screen.getByRole('app'));
      expect(shareLoading.isLoading('b')).toBe(false);
    });

    test('should clean up shared counter when loadingId changes to empty string', async () => {
      const fetchData = async () => {
        await sleep(20);
        return { name: 'data' };
      };

      const App = ({ lid }: { lid: string }) => {
        const { loading, data } = useAsync(fetchData, { loadingId: lid });
        if (loading) return <span role="loading">loading</span>;
        return <div role="app">{data?.name}</div>;
      };

      const { rerender } = render(<App lid="app" />);
      expect(shareLoading.isLoading('app')).toBe(true);

      rerender(<App lid="" />);
      expect(shareLoading.isLoading('app')).toBe(false);

      await waitFor(() => screen.getByRole('app'));
    });

    test('should start tracking when loadingId changes from empty to valid', async () => {
      const fetchData = async (): Promise<{ name: string }> => {
        await sleep(20);
        return { name: 'data' };
      };

      const App = ({ lid }: { lid: string }) => {
        const { loading, data } = useAsync(fetchData, { loadingId: lid });
        if (loading) return <span role="loading">loading</span>;
        return <div role="app">{data?.name}</div>;
      };

      const { rerender } = render(<App lid="" />);
      await waitFor(() => screen.getByRole('app'));
      expect(shareLoading.isLoading('late-app')).toBe(false);

      // Switch to a valid loadingId — data already resolved, so no loading
      rerender(<App lid="late-app" />);
      expect(shareLoading.isLoading('late-app')).toBe(false);
    });

    test('should decrement shared counter on unmount while loading', async () => {
      const fetchData = async () => {
        await sleep(100);
        return { name: 'data' };
      };

      const App = () => {
        const { loading, data } = useAsync(fetchData, { loadingId: 'unmount-ld' });
        if (loading) return <span role="loading">loading</span>;
        return <div role="app">{data?.name}</div>;
      };

      const { unmount } = render(<App />);
      expect(shareLoading.isLoading('unmount-ld')).toBe(true);
      expect(screen.getByRole('loading')).toBeInTheDocument();

      unmount();
      expect(shareLoading.isLoading('unmount-ld')).toBe(false);
    });

    test('should not cause counter drift with debounced calls', async () => {
      let times = 0;
      const fetchData = async () => {
        times++;
        await sleep(10);
        return { name: `data-${times}` };
      };

      const App = () => {
        const { loading, data, fn } = useAsync(fetchData, {
          loadingId: 'debounce-ld',
          auto: false,
          debounceTime: 50,
        });

        return (
          <div>
            {loading && <span role="loading">loading</span>}
            {data && <span role="data">{data.name}</span>}
            <button role="call" onClick={() => fn()}>Call</button>
          </div>
        );
      };

      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByRole('call'));
        fireEvent.click(screen.getByRole('call'));
        fireEvent.click(screen.getByRole('call'));
      });

      await waitFor(() => screen.getByRole('data'));
      await waitFor(() => expect(shareLoading.isLoading('debounce-ld')).toBe(false));
    });

    test('should reflect shared loading across deps changes', async () => {
      const fetchUser = async (id: number) => {
        await sleep(10);
        return { id, name: `user-${id}` };
      };

      const App = () => {
        const [userId, setUserId] = useState(1);
        const { loading, data } = useAsync(
          () => fetchUser(userId),
          {
            loadingId: 'deps-ld',
            deps: [userId],
          },
        );
        if (loading || !data) return <span role="loading">loading</span>;
        return (
          <div role="app">
            <span>{data.name}</span>
            <button role="change" onClick={() => setUserId(v => v + 1)}>Next</button>
          </div>
        );
      };

      render(<App />);
      expect(shareLoading.isLoading('deps-ld')).toBe(true);
      await waitFor(() => screen.getByRole('app'));
      expect(screen.getByRole('app')).toHaveTextContent('user-1');
      expect(shareLoading.isLoading('deps-ld')).toBe(false);

      fireEvent.click(screen.getByRole('change'));
      await waitFor(() => expect(shareLoading.isLoading('deps-ld')).toBe(true));
      await waitFor(() => screen.getByRole('app'));
      expect(screen.getByRole('app')).toHaveTextContent('user-2');
      expect(shareLoading.isLoading('deps-ld')).toBe(false);
    });

    test('showLoading/hideLoading should stack correctly', () => {
      useAsync.showLoading('stack');
      expect(shareLoading.isLoading('stack')).toBe(true);

      useAsync.showLoading('stack');
      useAsync.showLoading('stack');

      useAsync.hideLoading('stack');
      expect(shareLoading.isLoading('stack')).toBe(true);

      useAsync.hideLoading('stack');
      expect(shareLoading.isLoading('stack')).toBe(true);

      useAsync.hideLoading('stack');
      expect(shareLoading.isLoading('stack')).toBe(false);

      useAsync.hideLoading('stack');
      expect(shareLoading.isLoading('stack')).toBe(false);
    });

    test('should keep composed loading=true while any sibling is still loading', async () => {
      const fastFetch = async () => {
        await sleep(10);
        return { name: 'fast' };
      };
      const slowFetch = async () => {
        await sleep(100);
        return { name: 'slow' };
      };

      const AppFast = () => {
        const { loading, data } = useAsync(fastFetch, { loadingId: 'multi' });
        if (loading) return <span role="loading-fast">loading-fast</span>;
        return <div role="app-fast">{data?.name}</div>;
      };
      const AppSlow = () => {
        const { loading, data } = useAsync(slowFetch, { loadingId: 'multi' });
        if (loading) return <span role="loading-slow">loading-slow</span>;
        return <div role="app-slow">{data?.name}</div>;
      };

      render(
        <>
          <AppFast />
          <AppSlow />
        </>,
      );

      expect(shareLoading.isLoading('multi')).toBe(true);
      expect(screen.getByRole('loading-fast')).toBeInTheDocument();
      expect(screen.getByRole('loading-slow')).toBeInTheDocument();

      // Wait past fast's resolve time. Fast resolved but sharedLoadingState
      // is still true (slow still loading), so composedPendingState keeps
      // loading-fast visible.
      await sleep(30);
      expect(shareLoading.isLoading('multi')).toBe(true);
      expect(screen.getByRole('loading-fast')).toBeInTheDocument();
      expect(screen.getByRole('loading-slow')).toBeInTheDocument();

      // Wait for slow to finish — now both show data
      await waitFor(() => screen.getByRole('app-slow'));
      expect(screen.getByRole('app-fast')).toBeInTheDocument();
      expect(shareLoading.isLoading('multi')).toBe(false);
    });

    test('multiple components, same loadingId, different timing', async () => {
      const fastFetch = async () => {
        await sleep(10);
        return { name: 'fast' };
      };
      const slowFetch = async () => {
        await sleep(60);
        return { name: 'slow' };
      };

      const AppFast = () => {
        const { loading, data } = useAsync(fastFetch, { loadingId: 'multi2' });
        if (loading) return <span role="fast-loading">fast-loading</span>;
        return <div role="fast-app">{data?.name}</div>;
      };
      const AppSlow = () => {
        const { loading, data } = useAsync(slowFetch, { loadingId: 'multi2' });
        if (loading) return <span role="slow-loading">slow-loading</span>;
        return <div role="slow-app">{data?.name}</div>;
      };

      render(
        <>
          <AppFast />
          <AppSlow />
        </>,
      );

      expect(screen.getByRole('fast-loading')).toBeInTheDocument();
      expect(screen.getByRole('slow-loading')).toBeInTheDocument();

      await waitFor(() => screen.getByRole('slow-app'));
      await waitFor(() => screen.getByRole('fast-app'));
      expect(shareLoading.isLoading('multi2')).toBe(false);
    });
  }); // end describe('loadingId integration')

  test('should cache data with TTL configuration', async () => {
    let times = 0;
    const getUserInfo = async () => {
        times++;
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const { loading, data, fn } = useAsync(getUserInfo, {ttl: 30});
        useEffect(() => {
            if (!data) {
                return;
            }
            fn().then(res => {
                expect(res).toBe(data);
            })
        }, [data]);
        if (loading) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
            </div>
        );
    };
    render(<App />);
    expect(screen.getByRole('loading')).toHaveTextContent('loading');
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(screen.getByRole('app')).toHaveTextContent('tom');
    expect(screen.getByRole('app')).toHaveTextContent('10');
    expect(times).toBe(1);
});


test('should combine TTL with single mode', async () => {
    let times = 0;
    const getUserInfo = async () => {
        times++;
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const { loading, data, fn } = useAsync(getUserInfo, {ttl: 30, single: true});
        fn().then(res => {
            if (!data) {
                return;
            }
            expect(res).toBe(data);
        })
        if (loading) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
            </div>
        );
    };
    render(<App />);
    expect(screen.getByRole('loading')).toHaveTextContent('loading');
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(screen.getByRole('app')).toHaveTextContent('tom');
    expect(screen.getByRole('app')).toHaveTextContent('10');
    expect(times).toBe(1);
});



test('should handle async function errors', async () => {
    const getUserInfo = async () => {
        await sleep(10);
        return Promise.reject(new Error('error message'));
    };

    const App = () => {
        const { loading, error } = useAsync(getUserInfo);
        if (loading) {
            return <span role="loading">loading</span>;
        }

        return (
            <div role={'app'}>
                {error.message}
            </div>
        );
    };
    render(<App />);
    expect(screen.getByRole('loading')).toHaveTextContent('loading');
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('error message');
});


test('should not auto-execute when auto is false', async () => {
    let times = 0;
    const getUserInfo = async () => {
        times++;
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const { loading, data, fn } = useAsync(getUserInfo, {
            auto: false,
        });

        useEffect(() => {
            fn();
        }, [])

        if (loading || !data) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
            </div>
        );
    };
    render(<App />);
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(1);
});


test('should handle errors with auto false and debounce', async () => {

    const getUserInfo = async () => {
        await sleep(100);
        throw new Error('error message');
    };

    const App = () => {
        const { loading, error, fn } = useAsync(getUserInfo, {
            auto: false,
            debounceTime: 10
        });

        useEffect(() => {
            (async () => {
                fn().catch((err: any) => {
                    expect(err.message).toBe('error message')
                });
                fn().catch((err: any) => {
                    expect(err.message).toBe('error message')
                });
            })()
        }, []);

        if (loading || !error) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                {error.message}
            </div>
        );
    };
    render(<App />);
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('error message');
});

test('should prevent duplicate calls in single mode', async () => {
    let times = 0;
    const getUserInfo = async () => {
        times++;
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const { loading, data, fn } = useAsync(getUserInfo, {
            auto: false,
            single: true
        });

        useEffect(() => {
            fn();
            fn();
            fn();
        }, [])

        if (loading || !data) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
            </div>
        );
    };
    render(<App />);
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(1);
});

test('should debounce multiple rapid calls', async () => {
    let times = 0;
    const getUserInfo = async () => {
        times++;
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const { loading, data, fn } = useAsync(getUserInfo, {
            auto: false,
            debounceTime: 100,
        });
        const [, setFlag] = useState(1);

        useEffect(() => {
            fn();
        });
        useEffect(() => {
            setFlag(v => v+1);
        }, []);

        if (loading || !data) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
            </div>
        );
    };
    render(<App />);
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(1);
});

test('should debounce with auto false mode', async () => {
    let times = 0;
    const getUserInfo = async () => {
        times++;
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const { loading, data, fn } = useAsync(getUserInfo, {
            auto: false,
            debounceTime: 100,
        });

        useEffect(() => {
            (async () => {
                fn();
                await sleep(50);
                fn();
                await sleep(50);
                fn();
            })()
        }, [])

        if (loading || !data) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
            </div>
        );
    };
    render(<App />);
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(1);
});

test('should re-run when dependencies change', async () => {
    let times = 0;
    const getUserInfo = async () => {
        times++;
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const [flag, setFlag] = useState(1);
        const { loading, data } = useAsync(getUserInfo, {
            deps: [flag]
        });

        if (loading || !data) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
                <button role={'change'} onClick={() => setFlag(v => v + 1)}>change flag</button>
            </div>
        );
    };
    render(<App />);
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(times).toBe(1);
    fireEvent.click(screen.getByRole('change'));
    await waitFor(() => screen.getByRole('loading'));
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(times).toBe(2);
});


test('should respect auto flag with dependencies', async () => {
    let times = 0;
    const getUserInfo = async () => {
        times++;
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const [flag, setFlag] = useState(1);
        const { loading, data } = useAsync(getUserInfo, {
            deps: [flag],
            auto: flag !== 2,
        });

        if (loading || !data) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
                <button role={'change'} onClick={() => setFlag(v => v + 1)}>change flag</button>
            </div>
        );
    };
    render(<App />);
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(times).toBe(1);
    fireEvent.click(screen.getByRole('change'));
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(times).toBe(1);
});


test('should throw error when deps is not an array', async () => {
    const getUserInfo = async () => {
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const [flag, setFlag] = useState(1);
        const { loading, data } = useAsync(getUserInfo, {
            // @ts-ignore
            deps: flag
        });

        if (loading || !data) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
                <button role={'change'} onClick={() => setFlag(v => v + 1)}>change flag</button>
            </div>
        );
    };
    
    // Suppress console.error for this test since we expect an error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => render(<App />)).toThrow();
    
    // Restore console.error
    consoleSpy.mockRestore();
});

test('deps and trigger multiple calls', async () => {
    let times = 0;
    const getUserInfo = async () => {
        times++;
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const [flag, setFlag] = useState(1);
        const { loading, data } = useAsync(getUserInfo, {
            deps: [flag],
        });

        if (loading || !data) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
                <button role={'change'} onClick={() => setFlag(v => v + 1)}>change flag</button>
            </div>
        );
    };
    render(<App />);
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(1);
    fireEvent.click(screen.getByRole('change'));
    fireEvent.click(screen.getByRole('change'));
    fireEvent.click(screen.getByRole('change'));
    await waitFor(() => screen.getByRole('loading'));
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(4);
});

test('should combine dependencies with single mode', async () => {
    let times = 0;
    const getUserInfo = async () => {
        times++;
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const [flag, setFlag] = useState(1);
        const { loading, data } = useAsync(getUserInfo, {
            deps: [flag],
            single: true,
        });

        if (loading || !data) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
                <button role={'change'} onClick={() => setFlag(v => v + 1)}>change flag</button>
            </div>
        );
    };
    render(<App />);
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(1);
    fireEvent.click(screen.getByRole('change'));
    fireEvent.click(screen.getByRole('change'));
    fireEvent.click(screen.getByRole('change'));
    await waitFor(() => screen.getByRole('loading'));
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(2);
});

test('should combine dependencies with debounce', async () => {
    let times = 0;
    const getUserInfo = async () => {
        times++;
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const [flag, setFlag] = useState(1);
        const { loading, data } = useAsync(getUserInfo, {
            deps: [flag],
            debounceTime: 30,
        });

        if (loading || !data) {
            return <span role="loading">loading</span>;
        }
        return (
            <div role={'app'}>
                <span>{data.id}</span>
                <span>{data.name}</span>
                <span>{data.age}</span>
                <button role={'change'} onClick={() => setFlag(v => v + 1)}>change flag</button>
            </div>
        );
    };
    render(<App />);
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(1);
    fireEvent.click(screen.getByRole('change'));
    fireEvent.click(screen.getByRole('change'));
    fireEvent.click(screen.getByRole('change'));
    await waitFor(() => screen.getByRole('loading'));
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(2);
});

it('should support auto="deps-only" mode - no auto-call on mount but auto-call on deps change', async () => {
  const mockFn = jest.fn().mockResolvedValue({ name: 'test' });
  let userId = '1';
  
  const App = () => {
    const [currentUserId, setCurrentUserId] = useState(userId);
    const { data, loading, fn } = useAsync(
      () => mockFn(currentUserId),
      { 
        auto: 'deps-only',
        deps: [currentUserId] 
      }
    );
    
    return (
      <div>
        <div data-testid="loading">{loading ? 'loading' : 'idle'}</div>
        <div data-testid="data">{data ? (data as any).name : 'no data'}</div>
        <button 
          data-testid="change-deps" 
          onClick={() => setCurrentUserId('2')}
        >
          Change User
        </button>
        <button 
          data-testid="manual-trigger"
          onClick={() => fn()}
        >
          Manual Trigger
        </button>
      </div>
    );
  };

  const { getByTestId } = render(<App />);
  
  // Initially should not auto-call on mount
  expect(getByTestId('loading')).toHaveTextContent('idle');
  expect(getByTestId('data')).toHaveTextContent('no data');
  expect(mockFn).not.toHaveBeenCalled();

  // Manual trigger should work
  fireEvent.click(getByTestId('manual-trigger'));
  await waitFor(() => {
    expect(getByTestId('data')).toHaveTextContent('test');
  });
  expect(mockFn).toHaveBeenCalledTimes(1);
  expect(mockFn).toHaveBeenCalledWith('1');

  // Changing deps should auto-call
  fireEvent.click(getByTestId('change-deps'));
  await waitFor(() => {
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith('2');
  });
});

  }); // end describe('Basic functionality')
}); // end describe('useAsync')