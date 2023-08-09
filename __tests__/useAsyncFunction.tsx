
import { sleep } from '../src/utils';
import { useAsyncFunction } from '../src';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import React from 'react';
import { sharedPendingStateManager } from '../src/SharedPendingStateManager';

test('normal', async () => {
    const getUserInfo = async () => {
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const { pending, data } = useAsyncFunction(getUserInfo);
        if (pending) {
            return <span role="pending">pending</span>;
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
    expect(screen.getByRole('pending')).toHaveTextContent('pending');
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(screen.getByRole('app')).toHaveTextContent('tom');
    expect(screen.getByRole('app')).toHaveTextContent('10');
});



test('pendingId', async () => {
    const getUserInfo = async () => {
        await sleep(10);
        return {
            name: 'tom',
            age: 10,
            id: 'xxx',
        };
    };

    const App = () => {
        const { pending, data } = useAsyncFunction(getUserInfo, {
            pendingId: 'app',
        });
        if (pending) {
            return <span role="pending">pending</span>;
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
        const { pending, data } = useAsyncFunction(getUserInfo, {
            pendingId: 'app',
        });
        if (pending) {
            return <span role="pending2">pending2</span>;
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
    expect(sharedPendingStateManager.isPending('app')).toBe(true);
    expect(screen.getByRole('pending')).toHaveTextContent('pending');
    expect(screen.getByRole('pending2')).toHaveTextContent('pending2');
    await waitFor(() => screen.getByRole('app'));

    expect(sharedPendingStateManager.isPending('app')).toBe(false);
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(screen.getByRole('app')).toHaveTextContent('tom');
    expect(screen.getByRole('app')).toHaveTextContent('10');

    expect(screen.getByRole('app2')).toHaveTextContent('xxx');
    expect(screen.getByRole('app2')).toHaveTextContent('tom');
    expect(screen.getByRole('app2')).toHaveTextContent('10');
});

test('ttl', async () => {
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
        const { pending, data, fn } = useAsyncFunction(getUserInfo, {ttl: 30});
        useEffect(() => {
            if (!data) {
                return;
            }
            fn().then(res => {
                expect(res).toBe(data);
            })
        }, [data]);
        if (pending) {
            return <span role="pending">pending</span>;
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
    expect(screen.getByRole('pending')).toHaveTextContent('pending');
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(screen.getByRole('app')).toHaveTextContent('tom');
    expect(screen.getByRole('app')).toHaveTextContent('10');
    expect(times).toBe(1);
});


test('ttl and single', async () => {
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
        const { pending, data, fn } = useAsyncFunction(getUserInfo, {ttl: 30, single: true});
        fn().then(res => {
            if (!data) {
                return;
            }
            expect(res).toBe(data);
        })
        if (pending) {
            return <span role="pending">pending</span>;
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
    expect(screen.getByRole('pending')).toHaveTextContent('pending');
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(screen.getByRole('app')).toHaveTextContent('tom');
    expect(screen.getByRole('app')).toHaveTextContent('10');
    expect(times).toBe(1);
});



test('error', async () => {
    const getUserInfo = async () => {
        await sleep(10);
        return Promise.reject(new Error('error message'));
    };

    const App = () => {
        const { pending, error } = useAsyncFunction(getUserInfo);
        if (pending) {
            return <span role="pending">pending</span>;
        }

        return (
            <div role={'app'}>
                {error.message}
            </div>
        );
    };
    render(<App />);
    expect(screen.getByRole('pending')).toHaveTextContent('pending');
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('error message');
});


test('auto', async () => {
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
        const { pending, data, fn } = useAsyncFunction(getUserInfo, {
            auto: false,
        });

        useEffect(() => {
            fn();
        }, [])

        if (pending || !data) {
            return <span role="pending">pending</span>;
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


test('auto with error', async () => {

    const getUserInfo = async () => {
        await sleep(100);
        throw new Error('error message');
    };

    const App = () => {
        const { pending, error, fn } = useAsyncFunction(getUserInfo, {
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

        if (pending || !error) {
            return <span role="pending">pending</span>;
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

test('single', async () => {
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
        const { pending, data, fn } = useAsyncFunction(getUserInfo, {
            auto: false,
            single: true
        });

        useEffect(() => {
            fn();
            fn();
            fn();
        }, [])

        if (pending || !data) {
            return <span role="pending">pending</span>;
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

test('debounceTime', async () => {
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
        const { pending, data, fn } = useAsyncFunction(getUserInfo, {
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

        if (pending || !data) {
            return <span role="pending">pending</span>;
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

test('debounceTime and auto', async () => {
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
        const { pending, data, fn } = useAsyncFunction(getUserInfo, {
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

        if (pending || !data) {
            return <span role="pending">pending</span>;
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

test('deps auto', async () => {
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
        const { pending, data } = useAsyncFunction(getUserInfo, {
            deps: [flag]
        });

        if (pending || !data) {
            return <span role="pending">pending</span>;
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
    await waitFor(() => screen.getByRole('pending'));
    await waitFor(() => screen.getByRole('app'));
    expect(screen.getByRole('app')).toHaveTextContent('xxx');
    expect(times).toBe(2);
});


test('deps to auto', async () => {
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
        const { pending, data } = useAsyncFunction(getUserInfo, {
            deps: [flag],
            auto: flag !== 2,
        });

        if (pending || !data) {
            return <span role="pending">pending</span>;
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


test('deps error', async () => {
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
        const { pending, data } = useAsyncFunction(getUserInfo, {
            // @ts-ignore
            deps: flag
        });

        if (pending || !data) {
            return <span role="pending">pending</span>;
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
    expect(() => render(<App />)).toThrow();
});

test('deps and triggle multiply', async () => {
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
        const { pending, data } = useAsyncFunction(getUserInfo, {
            deps: [flag],
        });

        if (pending || !data) {
            return <span role="pending">pending</span>;
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
    await waitFor(() => screen.getByRole('pending'));
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(4);
});

test('deps and single', async () => {
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
        const { pending, data } = useAsyncFunction(getUserInfo, {
            deps: [flag],
            single: true,
        });

        if (pending || !data) {
            return <span role="pending">pending</span>;
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
    await waitFor(() => screen.getByRole('pending'));
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(2);
});

test('deps and debounce', async () => {
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
        const { pending, data } = useAsyncFunction(getUserInfo, {
            deps: [flag],
            debounceTime: 30,
        });

        if (pending || !data) {
            return <span role="pending">pending</span>;
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
    await waitFor(() => screen.getByRole('pending'));
    await waitFor(() => screen.getByRole('app'));
    expect(times).toBe(2);
});






