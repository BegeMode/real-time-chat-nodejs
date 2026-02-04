export function debounce<T extends (...args: any[]) => any>(fn: T, wait: number) {
	let timeout: ReturnType<typeof setTimeout>;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), wait);
	};
}
