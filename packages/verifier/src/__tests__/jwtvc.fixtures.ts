/**
 * Test helpers for issuing W3C JWT-VC credentials in-memory with a
 * `did:jwk` test key. Mirrors the SD-JWT VC fixtures.
 */

import { SignJWT, importJWK, type JWK } from 'jose';

function base64UrlString(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface JwtVcIssuer {
  did: string;
  issue(input: {
    type: string;
    subject: Record<string, unknown>;
    issuedAt?: Date;
    expiresAt?: Date;
    notBefore?: Date;
  }): Promise<string>;
}

export async function createJwtVcIssuer(): Promise<JwtVcIssuer> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const publicJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as JsonWebKey;
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';
  const canonical = JSON.stringify({
    crv: publicJwk.crv ?? 'P-256',
    kty: publicJwk.kty ?? 'EC',
    x: publicJwk.x ?? '',
    y: publicJwk.y ?? '',
  });
  const did = `did:jwk:${base64UrlString(canonical)}`;

  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const privKey = await importJWK(privateJwk as JWK, 'ES256');

  return {
    did,
    async issue({ type, subject, issuedAt, expiresAt, notBefore }) {
      const nowSec = Math.floor((issuedAt ?? new Date()).getTime() / 1000);
      const payload: Record<string, unknown> = {
        iss: did,
        iat: nowSec,
        vc: {
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          type: ['VerifiableCredential', type],
          issuer: did,
          credentialSubject: subject,
        },
      };
      if (expiresAt) payload['exp'] = Math.floor(expiresAt.getTime() / 1000);
      if (notBefore) payload['nbf'] = Math.floor(notBefore.getTime() / 1000);

      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'ES256', typ: 'vc+jwt', kid: `${did}#0` })
        .sign(privKey);
      return jwt;
    },
  };
}

export function allowList(...dids: string[]) {
  const set = new Set(dids);
  return {
    isTrusted(did: string) {
      return set.has(did);
    },
  };
}
