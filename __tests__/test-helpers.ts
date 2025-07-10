import { sleep } from '../src/utils';

// Default test data
export const DEFAULT_USER_DATA = {
  name: 'tom',
  age: 10,
  id: 'xxx',
};

// Create test data factory function
export const createUserData = (overrides = {}) => ({
  ...DEFAULT_USER_DATA,
  ...overrides,
});

// Create an async function with call count tracking
export const createTrackedAsyncFunction = (
  data = DEFAULT_USER_DATA,
  delay = 10,
  shouldError = false,
  errorMessage = 'Test error'
) => {
  let callCount = 0;
  
  const asyncFunction = async () => {
    callCount++;
    await sleep(delay);
    
    if (shouldError) {
      throw new Error(errorMessage);
    }
    
    return data;
  };
  
  // Add utility methods
  asyncFunction.getCallCount = () => callCount;
  asyncFunction.resetCallCount = () => { callCount = 0; };
  
  return asyncFunction;
};

// Create an error async function
export const createErrorAsyncFunction = (
  delay = 10,
  errorMessage = 'Test error'
) => createTrackedAsyncFunction(DEFAULT_USER_DATA, delay, true, errorMessage);

// Test assertion helper function
export const expectUserDataInDOM = (screen: any, userData = DEFAULT_USER_DATA) => {
  const appElement = screen.getByRole('app');
  expect(appElement).toHaveTextContent(userData.id);
  expect(appElement).toHaveTextContent(userData.name);
  expect(appElement).toHaveTextContent(userData.age.toString());
};

// Helper function to wait for app state change
export const waitForAppState = async (screen: any) => {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => screen.getByRole('app'), { timeout: 3000 });
};

export const waitForLoadingState = async (screen: any) => {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => screen.getByRole('loading'), { timeout: 3000 });
};

export const waitForErrorState = async (screen: any) => {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => screen.getByRole('error'), { timeout: 3000 });
};

// General act wrapper function
export const actWrapper = async (fn: () => void | Promise<void>) => {
  const { act } = await import('@testing-library/react');
  await act(async () => {
    await fn();
  });
};

// Common test component template
export const createBasicTestComponent = (asyncFn: any, options = {}) => {
  const React = require('react');
  const { useAsync } = require('../src');

  return () => {
    const { loading, data, error } = useAsync(asyncFn, options);
    
    if (loading) {
      return React.createElement('span', { role: 'loading' }, 'loading');
    }
    
    if (error) {
      return React.createElement('div', { role: 'error' }, error.message);
    }
    
    return React.createElement('div', { role: 'app' }, [
      React.createElement('span', { key: 'id' }, data?.id),
      React.createElement('span', { key: 'name' }, data?.name),
      React.createElement('span', { key: 'age' }, data?.age)
    ]);
  };
};

// Create interactive test component
export const createInteractiveTestComponent = (asyncFn: any, options = {}) => {
  const React = require('react');
  const { useAsync } = require('../src');
  const { useState } = React;

  return () => {
    const [flag, setFlag] = useState(1);
    const { loading, data, error } = useAsync(asyncFn, {
      ...options,
      deps: [flag]
    });
    
    if (loading || !data) {
      return React.createElement('span', { role: 'loading' }, 'loading');
    }
    
    if (error) {
      return React.createElement('div', { role: 'error' }, error.message);
    }
    
    return React.createElement('div', { role: 'app' }, [
      React.createElement('span', { key: 'id' }, data.id),
      React.createElement('span', { key: 'name' }, data.name),
      React.createElement('span', { key: 'age' }, data.age),
      React.createElement('button', {
        key: 'change',
        role: 'change',
        onClick: () => setFlag((v: number) => v + 1)
      }, 'change flag')
    ]);
  };
}; 