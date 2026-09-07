/**
 * Transaction Version Negotiation
 *
 * Permissive readers for the wallet-standard `supportedTransactionVersions`
 * field. Wallet-standard's own type is still `'legacy' | 0` and cannot yet
 * express v1 (SIMD-0296), so these helpers read the field structurally and
 * tolerate values the upstream types don't know about.
 */

import type { Wallet } from '@wallet-standard/base';
import type { SolanaTransactionVersionLike } from '../types/transactions';

const SIGN_FEATURES = ['solana:signTransaction', 'solana:signAndSendTransaction'] as const;

function readFeatureVersions(feature: unknown): readonly SolanaTransactionVersionLike[] | undefined {
    if (!feature || typeof feature !== 'object') return undefined;
    const versions = (feature as { supportedTransactionVersions?: unknown }).supportedTransactionVersions;
    if (!Array.isArray(versions)) return undefined;
    return versions.filter((v): v is SolanaTransactionVersionLike => v === 'legacy' || typeof v === 'number');
}

/**
 * Collect the transaction versions a wallet advertises across its sign
 * features (`solana:signTransaction` and `solana:signAndSendTransaction`).
 *
 * @returns The union of declared versions, or `undefined` when no sign
 *          feature declares the field at all.
 */
export function getWalletSupportedTransactionVersions(
    wallet: Pick<Wallet, 'features'>,
): readonly SolanaTransactionVersionLike[] | undefined {
    const features = wallet.features as Record<string, unknown>;
    let declared = false;
    const union = new Set<SolanaTransactionVersionLike>();

    for (const featureName of SIGN_FEATURES) {
        const versions = readFeatureVersions(features[featureName]);
        if (!versions) continue;
        declared = true;
        for (const version of versions) union.add(version);
    }

    return declared ? [...union] : undefined;
}

/**
 * Whether a wallet can sign transactions of the given version.
 *
 * Wallets that declare `supportedTransactionVersions` on a sign feature are
 * taken at their word. Wallets that don't declare it are assumed to handle
 * legacy and version 0 only — the universally supported baseline — so v1
 * (SIMD-0296) requires an explicit declaration.
 *
 * @example
 * ```ts
 * if (walletSupportsTransactionVersion(wallet, 1)) {
 *     // safe to send this wallet a v1 transaction
 * }
 * ```
 */
export function walletSupportsTransactionVersion(
    wallet: Pick<Wallet, 'features'>,
    version: SolanaTransactionVersionLike,
): boolean {
    const declared = getWalletSupportedTransactionVersions(wallet);
    if (declared === undefined) {
        return version === 'legacy' || version === 0;
    }
    return declared.includes(version);
}
