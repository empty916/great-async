import { FalsyValue, shallowEqual } from "../src";



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

test('falsy value', () => {
    expect(new FalsyValue(null).getValue()).toBe(null);
    expect(new FalsyValue(undefined).getValue()).toBe(undefined);

    let obj = {};
    expect(new FalsyValue(obj).getValue()).toBe(obj);
})