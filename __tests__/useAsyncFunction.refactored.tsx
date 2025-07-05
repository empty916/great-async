import { sleep } from '../src/utils';
import { useAsyncFunction } from '../src';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { useEffect, useState } from 'react';
import React from 'react';
import { sharedLoadingStateManager } from '../src/SharedLoadingStateManager';
import { 
  createTrackedAsyncFunction, 
  createErrorAsyncFunction, 
  expectUserDataInDOM, 
  waitForAppState,
  waitForLoadingState,
  DEFAULT_USER_DATA
} from './test-helpers';

describe('useAsyncFunction', () => {
  // Suppress React act warnings for internal async state updates
  let consoleErrorSpy: jest.SpyInstance;
  
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((message) => {
      // Only suppress React act warnings, let other errors through
      if (typeof message === 'string' && message.includes('Warning: An update to') && message.includes('was not wrapped in act')) {
        return;
      }
      // Let other console.error calls through
      console.warn('Non-act error:', message);
    });
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Basic functionality', () => {
    test('should load data successfully on mount', async () => {
      const getUserInfo = createTrackedAsyncFunction();

      const App = () => {
        const { loading, data } = useAsyncFunction(getUserInfo);
        if (loading) {
          return <span role="loading">loading</span>;
        }
        return (
          <div role="app">
            <span>{data.id}</span>
            <span>{data.name}</span>
            <span>{data.age}</span>
          </div>
        );
      };
      
      render(<App />);
      expect(screen.getByRole('loading')).toHaveTextContent('loading');
      await waitForAppState(screen);
      expectUserDataInDOM(screen);
    });

    test('should handle async function errors', async () => {
      const getUserInfo = createErrorAsyncFunction();

      const App = () => {
        const { loading, error } = useAsyncFunction(getUserInfo);
        if (loading) {
          return <span role="loading">loading</span>;
        }
        return (
          <div role="app">
            {error.message}
          </div>
        );
      };
      
      render(<App />);
      expect(screen.getByRole('loading')).toHaveTextContent('loading');
      await waitForAppState(screen);
      expect(screen.getByRole('app')).toHaveTextContent('Test error');
    });

    test('should not auto-execute when auto is false', async () => {
      const getUserInfo = createTrackedAsyncFunction();

      const App = () => {
        const { loading, data, fn } = useAsyncFunction(getUserInfo, {
          auto: false,
        });

        useEffect(() => {
          fn();
        }, []);

        if (loading || !data) {
          return <span role="loading">loading</span>;
        }
        return (
          <div role="app">
            <span>{data.id}</span>
            <span>{data.name}</span>
            <span>{data.age}</span>
          </div>
        );
      };
      
      render(<App />);
      await waitForAppState(screen);
      expect(getUserInfo.getCallCount()).toBe(1);
    });
  });

  describe('Loading state management', () => {
    test('should share loading state with same loadingId', async () => {
      const getUserInfo = createTrackedAsyncFunction();

      const App = () => {
        const { loading, data } = useAsyncFunction(getUserInfo, {
          loadingId: 'app',
        });
        if (loading) {
          return <span role="loading">loading</span>;
        }
        return (
          <div role="app">
            <span>{data.id}</span>
            <span>{data.name}</span>
            <span>{data.age}</span>
          </div>
        );
      };
      
      const App2 = () => {
        const { loading, data } = useAsyncFunction(getUserInfo, {
          loadingId: 'app',
        });
        if (loading) {
          return <span role="loading2">loading2</span>;
        }
        return (
          <div role="app2">
            <span>{data.id}</span>
            <span>{data.name}</span>
            <span>{data.age}</span>
          </div>
        );
      };
      
      render(
        <>
          <App />
          <App2 />
        </>
      );
      
      expect(sharedLoadingStateManager.isLoading('app')).toBe(true);
      expect(screen.getByRole('loading')).toHaveTextContent('loading');
      expect(screen.getByRole('loading2')).toHaveTextContent('loading2');
      await waitForAppState(screen);

      expect(sharedLoadingStateManager.isLoading('app')).toBe(false);
      expectUserDataInDOM(screen);

      // Test manual loading control
      act(() => {
        useAsyncFunction.showLoading('app');
      });
      await waitForLoadingState(screen);

      expect(sharedLoadingStateManager.isLoading('app')).toBe(true);
      expect(screen.getByRole('loading')).toHaveTextContent('loading');
      expect(screen.getByRole('loading2')).toHaveTextContent('loading2');
      
      act(() => {
        useAsyncFunction.hideLoading('app');
      });

      await waitForAppState(screen);
      expect(sharedLoadingStateManager.isLoading('app')).toBe(false);
    });
  });

  describe('Caching functionality', () => {
    test('should cache data with TTL configuration', async () => {
      const getUserInfo = createTrackedAsyncFunction();

      const App = () => {
        const { loading, data, fn } = useAsyncFunction(getUserInfo, { ttl: 30 });
        useEffect(() => {
          if (!data) {
            return;
          }
          fn().then(res => {
            expect(res).toBe(data);
          });
        }, [data]);
        
        if (loading) {
          return <span role="loading">loading</span>;
        }
        return (
          <div role="app">
            <span>{data.id}</span>
            <span>{data.name}</span>
            <span>{data.age}</span>
          </div>
        );
      };
      
      render(<App />);
      expect(screen.getByRole('loading')).toHaveTextContent('loading');
      await waitForAppState(screen);
      expectUserDataInDOM(screen);
      expect(getUserInfo.getCallCount()).toBe(1);
    });

    test('should combine TTL with single mode', async () => {
      const getUserInfo = createTrackedAsyncFunction();

      const App = () => {
        const { loading, data, fn } = useAsyncFunction(getUserInfo, { 
          ttl: 30, 
          single: true 
        });
        
        useEffect(() => {
          fn();
        }, []);
        
        if (loading) {
          return <span role="loading">loading</span>;
        }
        return (
          <div role="app">
            <span>{data.id}</span>
            <span>{data.name}</span>
            <span>{data.age}</span>
          </div>
        );
      };
      
      render(<App />);
      expect(screen.getByRole('loading')).toHaveTextContent('loading');
      await waitForAppState(screen);
      expectUserDataInDOM(screen);
      expect(getUserInfo.getCallCount()).toBe(1);
    });
  });

  describe('Single mode functionality', () => {
    test('should prevent duplicate calls in single mode', async () => {
      const getUserInfo = createTrackedAsyncFunction();

      const App = () => {
        const { loading, data, fn } = useAsyncFunction(getUserInfo, {
          single: true,
          auto: false,
        });

        useEffect(() => {
          // Trigger multiple calls rapidly
          fn();
          fn();
          fn();
        }, []);

        if (loading || !data) {
          return <span role="loading">loading</span>;
        }
        return (
          <div role="app">
            <span>{data.id}</span>
            <span>{data.name}</span>
            <span>{data.age}</span>
          </div>
        );
      };
      
      render(<App />);
      await waitForAppState(screen);
      expect(getUserInfo.getCallCount()).toBe(1);
    });
  });

  describe('Debounce functionality', () => {
    test('should debounce multiple rapid calls', async () => {
      const getUserInfo = createTrackedAsyncFunction();

      const App = () => {
        const { loading, data, fn } = useAsyncFunction(getUserInfo, {
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
          })();
        }, []);

        if (loading || !data) {
          return <span role="loading">loading</span>;
        }
        return (
          <div role="app">
            <span>{data.id}</span>
            <span>{data.name}</span>
            <span>{data.age}</span>
          </div>
        );
      };
      
      render(<App />);
      await waitForAppState(screen);
      expect(getUserInfo.getCallCount()).toBe(1);
    });
  });

  describe('Dependencies functionality', () => {
    test('should re-run when dependencies change', async () => {
      const getUserInfo = createTrackedAsyncFunction();

      const App = () => {
        const [flag, setFlag] = useState(1);
        const { loading, data } = useAsyncFunction(getUserInfo, {
          deps: [flag]
        });

        if (loading || !data) {
          return <span role="loading">loading</span>;
        }
        return (
          <div role="app">
            <span>{data.id}</span>
            <span>{data.name}</span>
            <span>{data.age}</span>
            <button role="change" onClick={() => setFlag(v => v + 1)}>
              change flag
            </button>
          </div>
        );
      };
      
      render(<App />);
      await waitForAppState(screen);
      expectUserDataInDOM(screen);
      expect(getUserInfo.getCallCount()).toBe(1);
      
      fireEvent.click(screen.getByRole('change'));
      await waitForLoadingState(screen);
      await waitForAppState(screen);
      expectUserDataInDOM(screen);
      expect(getUserInfo.getCallCount()).toBe(2);
    });

    test('should throw error when deps is not an array', async () => {
      const getUserInfo = createTrackedAsyncFunction();

      const App = () => {
        const [flag] = useState(1);
        const { loading, data } = useAsyncFunction(getUserInfo, {
          // @ts-ignore
          deps: flag
        });

        if (loading || !data) {
          return <span role="loading">loading</span>;
        }
        return (
          <div role="app">
            <span>{data.id}</span>
            <span>{data.name}</span>
            <span>{data.age}</span>
          </div>
        );
      };
      
      // Temporarily restore the spy to catch the actual error
      consoleErrorSpy.mockRestore();
      const localConsoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => render(<App />)).toThrow();
      
      // Restore and re-setup the main spy
      localConsoleSpy.mockRestore();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((message) => {
        if (typeof message === 'string' && message.includes('Warning: An update to') && message.includes('was not wrapped in act')) {
          return;
        }
        console.warn('Non-act error:', message);
      });
    });

    test('should combine dependencies with single mode', async () => {
      const getUserInfo = createTrackedAsyncFunction();

      const App = () => {
        const [flag, setFlag] = useState(1);
        const { loading, data } = useAsyncFunction(getUserInfo, {
          deps: [flag],
          single: true,
        });

        if (loading || !data) {
          return <span role="loading">loading</span>;
        }
        return (
          <div role="app">
            <span>{data.id}</span>
            <span>{data.name}</span>
            <span>{data.age}</span>
            <button role="change" onClick={() => setFlag(v => v + 1)}>
              change flag
            </button>
          </div>
        );
      };
      
      render(<App />);
      await waitForAppState(screen);
      expect(getUserInfo.getCallCount()).toBe(1);
      
      // Trigger multiple rapid changes
      fireEvent.click(screen.getByRole('change'));
      fireEvent.click(screen.getByRole('change'));
      fireEvent.click(screen.getByRole('change'));
      await waitForLoadingState(screen);
      await waitForAppState(screen);
      expect(getUserInfo.getCallCount()).toBe(2);
    });

    test('should combine dependencies with debounce', async () => {
      const getUserInfo = createTrackedAsyncFunction();

      const App = () => {
        const [flag, setFlag] = useState(1);
        const { loading, data } = useAsyncFunction(getUserInfo, {
          deps: [flag],
          debounceTime: 30,
        });

        if (loading || !data) {
          return <span role="loading">loading</span>;
        }
        return (
          <div role="app">
            <span>{data.id}</span>
            <span>{data.name}</span>
            <span>{data.age}</span>
            <button role="change" onClick={() => setFlag(v => v + 1)}>
              change flag
            </button>
          </div>
        );
      };
      
      render(<App />);
      await waitForAppState(screen);
      expect(getUserInfo.getCallCount()).toBe(1);
      
      // Trigger multiple rapid changes
      fireEvent.click(screen.getByRole('change'));
      fireEvent.click(screen.getByRole('change'));
      fireEvent.click(screen.getByRole('change'));
      await waitForLoadingState(screen);
      await waitForAppState(screen);
      expect(getUserInfo.getCallCount()).toBe(2);
    });
  });
}); 