import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                blocks: resolve(__dirname, 'blocks.html'),
                txs: resolve(__dirname, 'txs.html'),
                address: resolve(__dirname, 'address.html'),
                block_detail: resolve(__dirname, 'block_detail.html'),
                tx_detail: resolve(__dirname, 'tx_detail.html'),
            },
        },
    },
});
