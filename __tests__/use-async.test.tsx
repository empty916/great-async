import { sleep } from '../src/utils';
import { useAsync } from '../src';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { sharePending } from '../src/share-pending';


describe('useAsync', () => {
  describe('Backward Compatibility', () => {
    test('should support both pending and loading properties', async () => {
      const getUserInfo = async () => {
        await sleep(10);
        return { name: 'John', age: 30 };
      };

      const App = () => {
        const { pending, loading, data } = useAsync(getUserInfo);

        // Both pending and loading should have the same value
        expect(pending).toBe(loading);

        if (pending) {
          return <span role="loading">loading</span>;
        }
        return <span role="data">{data?.name}</span>;
      };

      const { getByRole } = render(<App />);

      // Should show loading initially
      expect(getByRole('loading')).toBeInTheDocument();

      // Should show data after loading
      await waitFor(() => {
        expect(getByRole('data')).toBeInTheDocument();
        expect(getByRole('data')).toHaveTextContent('John');
      });
    });

    test('should support pendingId parameter', async () => {
      const fetchData = async () => {
        await sleep(10);
        return 'test data';
      };

      // Test with pendingId
      const AppWithPendingId = () => {
        const { pending, data } = useAsync(fetchData, { pendingId: 'test-pending' });
        if (pending) return <span role="pending">pending</span>;
        return <span role="data-pending">{data}</span>;
      };

      const { getByRole: getByRolePending } = render(<AppWithPendingId />);

      expect(getByRolePending('pending')).toBeInTheDocument();

      await waitFor(() => {
        expect(getByRolePending('data-pending')).toBeInTheDocument();
      });
    });
  });

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


test('should share pending state with same pendingId', async () => {
    const getUserInfo = async () => {
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const { pending, data } = useAsync(getUserInfo, {
            pendingId: 'app',
        });
        if (pending) {
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
        const { pending, data } = useAsync(getUserInfo, {
            pendingId: 'app',
        });
        if (pending) {
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
    expect(sharePending.isPending('app')).toBe(true);
    expect(screen.getByRole('loading')).toHaveTextContent('loading');
    expect(screen.getByRole('loading2')).toHaveTextContent('loading2');
    await waitFor(() => screen.getByRole('app'));

    expect(sharePending.isPending('app')).toBe(false);
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(screen.getByRole('app')).toHaveTextContent('tom');
    expect(screen.getByRole('app')).toHaveTextContent('10');

    expect(screen.getByRole('app2')).toHaveTextContent('xxx');
    expect(screen.getByRole('app2')).toHaveTextContent('tom');
    expect(screen.getByRole('app2')).toHaveTextContent('10');


    act(() => {
        useAsync.showPending('app');
    });
    await waitFor(() => screen.getByRole('loading'));

    expect(sharePending.isPending('app')).toBe(true);
    expect(screen.getByRole('loading')).toHaveTextContent('loading');
    expect(screen.getByRole('loading2')).toHaveTextContent('loading2');
    act(() => {
        useAsync.hidePending('app');
    });

    await waitFor(() => screen.getByRole('app'));

    expect(sharePending.isPending('app')).toBe(false);
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(screen.getByRole('app')).toHaveTextContent('tom');
    expect(screen.getByRole('app')).toHaveTextContent('10');

    expect(screen.getByRole('app2')).toHaveTextContent('xxx');
    expect(screen.getByRole('app2')).toHaveTextContent('tom');
    expect(screen.getByRole('app2')).toHaveTextContent('10');


});

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
        const { loading, data, fn } = useAsync(getUserInfo, {cache: { ttl: 30 }});
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
        const { loading, data, fn } = useAsync(getUserInfo, {cache: { ttl: 30 }, single: { enabled: true }});
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
            debounce: { time: 10 }
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
            single: { enabled: true }
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
            debounce: { time: 100 },
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
            debounce: { time: 100 },
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
            single: { enabled: true },
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
            debounce: { time: 30 },
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