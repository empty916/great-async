export const sleep = async (time: number = 0) =>
	await new Promise((resolve) => setTimeout(resolve, time));
