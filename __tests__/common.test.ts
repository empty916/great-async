import { shallowEqual } from "../src";



test('shallow equal', () => {
    const arr1 = [1,2,'3', true];
    const arr2 = [1,2,'3', true];
    expect(shallowEqual(arr1, arr2)).toBe(true);
});

test('array length does not equal', () => {
    const arr1 = [1,2,'3'];
    const arr2 = [1,2,'3', true];
    expect(shallowEqual(arr1, arr2)).toBe(false);
});
