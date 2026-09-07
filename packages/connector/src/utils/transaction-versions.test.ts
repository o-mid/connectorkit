/**
 * Tests for transaction version negotiation helpers
 */

import { describe, it, expect } from 'vitest';
import {
    getWalletSupportedTransactionVersions,
    walletSupportsTransactionVersion,
} from './transaction-versions';

function walletWithFeatures(features: Record<string, unknown>) {
    return { features } as Parameters<typeof walletSupportsTransactionVersion>[0];
}

describe('getWalletSupportedTransactionVersions', () => {
    it('returns undefined when no sign feature declares versions', () => {
        const wallet = walletWithFeatures({
            'solana:signTransaction': { signTransaction: () => {}, version: '1.0.0' },
        });

        expect(getWalletSupportedTransactionVersions(wallet)).toBeUndefined();
    });

    it('returns undefined for a wallet with no sign features at all', () => {
        expect(getWalletSupportedTransactionVersions(walletWithFeatures({}))).toBeUndefined();
    });

    it('reads versions from a single sign feature', () => {
        const wallet = walletWithFeatures({
            'solana:signTransaction': { supportedTransactionVersions: ['legacy', 0] },
        });

        expect(getWalletSupportedTransactionVersions(wallet)).toEqual(['legacy', 0]);
    });

    it('unions versions across both sign features', () => {
        const wallet = walletWithFeatures({
            'solana:signAndSendTransaction': { supportedTransactionVersions: [0, 1] },
            'solana:signTransaction': { supportedTransactionVersions: ['legacy', 0] },
        });

        const versions = getWalletSupportedTransactionVersions(wallet);
        expect([...versions!].sort()).toEqual(['legacy', 0, 1].sort());
    });

    it('ignores malformed version entries', () => {
        const wallet = walletWithFeatures({
            'solana:signTransaction': { supportedTransactionVersions: ['legacy', 'bogus', 1, null] },
        });

        expect(getWalletSupportedTransactionVersions(wallet)).toEqual(['legacy', 1]);
    });
});

describe('walletSupportsTransactionVersion', () => {
    it('supports v1 when a sign feature declares it', () => {
        const wallet = walletWithFeatures({
            'solana:signTransaction': { supportedTransactionVersions: ['legacy', 0, 1] },
        });

        expect(walletSupportsTransactionVersion(wallet, 1)).toBe(true);
        expect(walletSupportsTransactionVersion(wallet, 0)).toBe(true);
        expect(walletSupportsTransactionVersion(wallet, 'legacy')).toBe(true);
    });

    it('rejects v1 when declared versions exclude it', () => {
        const wallet = walletWithFeatures({
            'solana:signTransaction': { supportedTransactionVersions: ['legacy', 0] },
        });

        expect(walletSupportsTransactionVersion(wallet, 1)).toBe(false);
        expect(walletSupportsTransactionVersion(wallet, 0)).toBe(true);
    });

    it('assumes legacy/v0 only for wallets that declare nothing', () => {
        const wallet = walletWithFeatures({
            'solana:signTransaction': { signTransaction: () => {} },
        });

        expect(walletSupportsTransactionVersion(wallet, 'legacy')).toBe(true);
        expect(walletSupportsTransactionVersion(wallet, 0)).toBe(true);
        expect(walletSupportsTransactionVersion(wallet, 1)).toBe(false);
    });

    it('takes an explicit declaration at its word even when it excludes legacy', () => {
        const wallet = walletWithFeatures({
            'solana:signTransaction': { supportedTransactionVersions: [0] },
        });

        expect(walletSupportsTransactionVersion(wallet, 'legacy')).toBe(false);
        expect(walletSupportsTransactionVersion(wallet, 0)).toBe(true);
    });
});
