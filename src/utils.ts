import { useCallback, useRef } from "react";
import { AnyFn } from "./common";

export const sleep = async (time: number = 0) =>
	await new Promise((resolve) => setTimeout(resolve, time));

export function useFn<F extends AnyFn>(fn: F): F {
	const fnRef = useRef(fn);
	fnRef.current = fn;
	return useCallback((...args: Parameters<F>) => {
		return fnRef.current(...args);
	}, []) as F;
}
