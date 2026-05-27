import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useChainId } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { CLAIM_OVER18_V1, findAttestations, type AttestationRecord } from '@signata/sdk';
import { DEFAULT_NETWORK } from '../lib/wagmi.js';

export interface GateContext {
  status: 'no-wallet' | 'wrong-chain' | 'no-attestation' | 'pending' | 'allowed' | 'error';
  attestation?: AttestationRecord<{ verified: boolean; verifiedAt: bigint; issuerDid: string; jurisdiction: string }>;
  error?: string;
  refetch: () => void;
}

interface Props {
  /**
   * Renderless gate. Receives the current gate status and renders the
   * children accordingly. Lets each consumer decide the UX rather than
   * baking it in here.
   */
  children: (ctx: GateContext) => React.ReactNode;
}

export default function AttestationGate({ children }: Props): React.ReactElement {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const query = useQuery({
    queryKey: ['attestation', 'over18', address],
    enabled: Boolean(address) && chainId === baseSepolia.id,
    queryFn: async () => {
      if (!address) return [];
      return findAttestations<{
        verified: boolean;
        verifiedAt: bigint;
        issuerDid: string;
        jurisdiction: string;
      }>({
        network: DEFAULT_NETWORK,
        recipient: address,
        schemaUid: CLAIM_OVER18_V1.uid,
        // POC: the user attests to themselves, so attester == recipient
        attester: address,
      });
    },
    retry: 1,
  });

  let ctx: GateContext;
  if (!isConnected) {
    ctx = { status: 'no-wallet', refetch: () => query.refetch() };
  } else if (chainId !== baseSepolia.id) {
    ctx = { status: 'wrong-chain', refetch: () => query.refetch() };
  } else if (query.isLoading) {
    ctx = { status: 'pending', refetch: () => query.refetch() };
  } else if (query.error) {
    ctx = {
      status: 'error',
      error: query.error instanceof Error ? query.error.message : String(query.error),
      refetch: () => query.refetch(),
    };
  } else if (!query.data || query.data.length === 0) {
    ctx = { status: 'no-attestation', refetch: () => query.refetch() };
  } else {
    const newest = query.data[0];
    // Filter out attestations that say verified=false
    if (!newest?.data.verified) {
      ctx = { status: 'no-attestation', refetch: () => query.refetch() };
    } else {
      ctx = { status: 'allowed', attestation: newest, refetch: () => query.refetch() };
    }
  }

  return <>{children(ctx)}</>;
}
