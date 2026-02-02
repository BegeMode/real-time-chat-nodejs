export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface IToast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

class ToastStore {
	#toasts = $state<IToast[]>([]);

	get toasts() {
		return this.#toasts;
	}

	add(message: string, type: ToastType = 'info', duration = 3000) {
		const id = Math.random().toString(36).substring(2, 9);
		const toast: IToast = { id, message, type, duration };

		this.#toasts = [...this.#toasts, toast];

		if (duration > 0) {
			setTimeout(() => {
				this.remove(id);
			}, duration);
		}

		return id;
	}

	remove(id: string) {
		this.#toasts = this.#toasts.filter((t) => t.id !== id);
	}

	success(message: string, duration?: number) {
		return this.add(message, 'success', duration);
	}

	error(message: string, duration?: number) {
		return this.add(message, 'error', duration);
	}

	warning(message: string, duration?: number) {
		return this.add(message, 'warning', duration);
	}

	info(message: string, duration?: number) {
		return this.add(message, 'info', duration);
	}
}

export const toastStore = new ToastStore();
