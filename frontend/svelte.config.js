import adapter from '@sveltejs/adapter-node';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			'@shared': path.resolve('../shared'),
			'@shared/*': path.resolve('../shared/*')
		}
	}
};

export default config;
