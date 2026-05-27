import React from 'react';
import { Button, Chip, Stack } from '@mui/material';
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const shorten = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function ConnectButton(): React.ReactElement {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <Button
        variant="contained"
        size="small"
        onClick={() => connect({ connector: injected() })}
        disabled={connecting}
      >
        {connecting ? 'Connecting…' : 'Connect wallet'}
      </Button>
    );
  }

  const wrongChain = chainId !== baseSepolia.id;

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      {wrongChain && switchChain ? (
        <Button
          size="small"
          color="warning"
          variant="contained"
          onClick={() => switchChain({ chainId: baseSepolia.id })}
        >
          Switch to Base Sepolia
        </Button>
      ) : (
        <Chip label={`Connected · ${shorten(address ?? '')}`} color="success" size="small" />
      )}
      <Button size="small" variant="outlined" onClick={() => disconnect()}>
        Disconnect
      </Button>
    </Stack>
  );
}
