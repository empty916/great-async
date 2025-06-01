import { createPromiseDebounceFn } from "../src/promiseDebounce";
import { sleep } from "../src/utils";




const mockServer = (time: number = 100, value = 'mock server', status: 'resolve' | 'reject' = 'resolve') => {   
    return new Promise<string>((resolve, reject) => setTimeout(() => {
        if (status === 'resolve') {
            resolve(value);
        } else {
            reject(value);
        }
    }, time))
};

describe('promiseDebounce', () => {

  it('should return a function', () => {
    const mockServerFn = createPromiseDebounceFn(mockServer, () => '1');
    expect(typeof mockServerFn).toBe('function');
  })


  it('should return latest value before', () => {
    const mockServerFn = createPromiseDebounceFn(mockServer, () => '2');
    const res1 = mockServerFn(100, '1');
    const res2 = mockServerFn(120, '2');
    const res3 = mockServerFn(140, '3');
    const res4 = mockServerFn(90, '4');
    

    return Promise.all([res1, res2, res3, res4]).then((res) => {
      expect(res).toEqual(['4', '4', '4', '4']);
    })
  });

  it('should return latest value after', () => {
    const mockServerFn = createPromiseDebounceFn(mockServer, () => '3');
    const res1 = mockServerFn(100, '1');
    const res2 = mockServerFn(120, '2');
    const res3 = mockServerFn(140, '3');
    const res4 = mockServerFn(170, '4');


    return Promise.all([res1, res2, res3, res4]).then((res) => {
      expect(res).toEqual(['4', '4', '4', '4']);
    })
  });

  it('should return latest value after reject in middle', () => {
    const mockServerFn = createPromiseDebounceFn(mockServer, () => '4');
    const res1 = mockServerFn(100, '1');
    const res2 = mockServerFn(120, '2');
    const res3 = mockServerFn(120, '3', 'reject');
    const res4 = mockServerFn(140, '4');
    const res5 = mockServerFn(170, '5');

    return Promise.all([res1, res2, res3, res4, res5]).then((res) => {
      expect(res).toEqual(['5', '5', '5', '5', '5']);
    })
  });


  it('should return latest value insert another', async () => {
    const mockServerFn = createPromiseDebounceFn(mockServer, () => '5');
    const res1 = mockServerFn(100, '1');
    const res2 = mockServerFn(120, '2');
    const res3 = mockServerFn(140, '3');
    const res4 = mockServerFn(170, '4');


    sleep(120).then(() => {
        mockServerFn(190, '5');
    });

    return Promise.all([res1, res2, res3, res4]).then((res) => {
      expect(res).toEqual(['5', '5', '5', '5']);
    })
  });



  it('should return latest value insert another', async () => {
    const mockServerFn = createPromiseDebounceFn(mockServer, () => '6');
    const res1 = mockServerFn(100, '1');
    const res2 = mockServerFn(120, '2');
    const res3 = mockServerFn(140, '3');
    const res4 = mockServerFn(170, '4');


    sleep(120).then(() => {
        mockServerFn(190, '5');
    });

    return Promise.all([res1, res2, res3, res4]).then((res) => {
      expect(res).toEqual(['5', '5', '5', '5']);

      return mockServerFn(100, '1').then((res) => {
        expect(res).toEqual('1');
      });
    })
  });


  it('should return latest value insert another', async () => {
    const mockServerFn = createPromiseDebounceFn(mockServer, () => '7');
    const res1 = mockServerFn(100, '1');
    const res2 = mockServerFn(120, '2');
    const res3 = mockServerFn(140, '3');
    const res4 = mockServerFn(170, '4');


    sleep(120).then(() => {
        mockServerFn(190, '5');
    });

    return Promise.all([res1, res2, res3, res4]).then((res) => {
      expect(res).toEqual(['5', '5', '5', '5']);

      return mockServerFn(100, '1').then((res) => {
        expect(res).toEqual('1');
      });
    })
  });

  test('should return latest value after reject in last', async () => {
    const mockServerFn = createPromiseDebounceFn(mockServer, () => '8');
    const res1 = mockServerFn(100, '1');
    const res2 = mockServerFn(120, '2');
    const res3 = mockServerFn(120, '3');
    const res4 = mockServerFn(140, '4');
    const res5 = mockServerFn(170, '5', 'reject');

    return Promise.all([
        res1.catch((r) => expect(r).toBe('5')),
        res2.catch((r) => expect(r).toBe('5')),
        res3.catch((r) => expect(r).toBe('5')),
        res4.catch((r) => expect(r).toBe('5')),
        res5.catch((r) => expect(r).toBe('5')),
    ]);
  });

  it('should return latest value insert another with error', async () => {
    const mockServerFn = createPromiseDebounceFn(mockServer, () => '9');
    mockServerFn(100, '1').catch((r) => expect(r).toBe('5'));
    mockServerFn(120, '2').catch((r) => expect(r).toBe('5'));
    mockServerFn(140, '3').catch((r) => expect(r).toBe('5'));
    mockServerFn(170, '4').catch((r) => expect(r).toBe('5'));

    return sleep(120).then(() => {
        return mockServerFn(190, '5', 'reject').catch((r) => expect(r).toBe('5'));
    });
  });

})