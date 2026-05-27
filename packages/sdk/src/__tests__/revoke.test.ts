import { describe, expect, it, vi } from 'vitest';
import { revokeAttestation } from '../revoke.js';
import { EAS_ABI, EAS_ADDRESSES } from '../eas.js';
import { CLAIM_OVER18_V1 } from '../schemas.js';

function makeMockWalletClient() {
  const writeContract = vi.fn().mockResolvedValue('0xabc123');
  return {
    walletClient: {
      account: { address: '0x1111111111111111111111111111111111111111' },
      chain: { id: 84532, name: 'Base Sepolia' },
      writeContract,
    },
    writeContract,
  };
}

describe('revokeAttestation', () => {
  it('submits a revoke call to the EAS contract on the configured network', async () => {
    const { walletClient, writeContract } = makeMockWalletClient();
    const uid = ('0x' + 'aa'.repeat(32)) as `0x${string}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await revokeAttestation({
      walletClient: walletClient as any,
      network: 'baseSepolia',
      schemaUid: CLAIM_OVER18_V1.uid,
      uid,
    });

    expect(result.transactionHash).toBe('0xabc123');
    expect(writeContract).toHaveBeenCalledOnce();
    const call = writeContract.mock.calls[0][0];
    expect(call.address).toBe(EAS_ADDRESSES.baseSepolia.eas);
    expect(call.abi).toBe(EAS_ABI);
    expect(call.functionName).toBe('revoke');
    expect(call.args[0].schema).toBe(CLAIM_OVER18_V1.uid);
    expect(call.args[0].data.uid).toBe(uid);
    expect(call.args[0].data.value).toBe(0n);
  });

  it('throws when no account is connected', async () => {
    const { walletClient } = makeMockWalletClient();
    const noAccountClient = { ...walletClient, account: undefined };
    await expect(
      revokeAttestation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        walletClient: noAccountClient as any,
        network: 'baseSepolia',
        schemaUid: CLAIM_OVER18_V1.uid,
        uid: '0x00',
      }),
    ).rejects.toThrow(/connected account/);
  });

  it('uses mainnet EAS address when network is "base"', async () => {
    const { walletClient, writeContract } = makeMockWalletClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await revokeAttestation({
      walletClient: walletClient as any,
      network: 'base',
      schemaUid: CLAIM_OVER18_V1.uid,
      uid: ('0x' + '11'.repeat(32)) as `0x${string}`,
    });
    expect(writeContract.mock.calls[0][0].address).toBe(EAS_ADDRESSES.base.eas);
  });
});
