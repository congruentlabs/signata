/**
 * DID resolution for the verifier. Supports the methods we actually need
 * to verify issuer signatures.
 *
 * - `did:web` via `web-did-resolver` (fetches `/.well-known/did.json` over HTTPS)
 * - `did:jwk` via a tiny inline decoder (no network — the DID is the JWK)
 *
 * Other methods (did:key, did:ethr) will be added when an issuer that
 * uses them needs to be supported.
 */

import { Resolver, type DIDDocument, type VerificationMethod } from 'did-resolver';
import { getResolver as getWebResolver } from 'web-did-resolver';
import { base64url, type JWK } from 'jose';

function decodeBase64Url(input: string): Uint8Array {
  // jose's base64url helper exposes encode/decode; use the bundled one to
  // avoid bringing in another dependency.
  return base64url.decode(input);
}

function jwkResolver() {
  return {
    jwk: async (did: string): Promise<{ didDocument: DIDDocument | null; didDocumentMetadata: object; didResolutionMetadata: { contentType?: string; error?: string } }> => {
      const prefix = 'did:jwk:';
      if (!did.startsWith(prefix)) {
        return { didDocument: null, didDocumentMetadata: {}, didResolutionMetadata: { error: 'invalidDid' } };
      }
      const encoded = did.slice(prefix.length);
      let jwk: JWK;
      try {
        const json = new TextDecoder().decode(decodeBase64Url(encoded));
        jwk = JSON.parse(json) as JWK;
      } catch {
        return { didDocument: null, didDocumentMetadata: {}, didResolutionMetadata: { error: 'invalidDid' } };
      }
      const vmId = `${did}#0`;
      const verificationMethod: VerificationMethod = {
        id: vmId,
        type: 'JsonWebKey2020',
        controller: did,
        publicKeyJwk: jwk,
      };
      const didDocument: DIDDocument = {
        '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
        id: did,
        verificationMethod: [verificationMethod],
        assertionMethod: [vmId],
        authentication: [vmId],
      };
      return {
        didDocument,
        didDocumentMetadata: {},
        didResolutionMetadata: { contentType: 'application/did+ld+json' },
      };
    },
  };
}

let cachedResolver: Resolver | undefined;

function getResolver(): Resolver {
  if (!cachedResolver) {
    cachedResolver = new Resolver({
      ...getWebResolver(),
      ...jwkResolver(),
    });
  }
  return cachedResolver;
}

export interface ResolvedIssuer {
  document: DIDDocument;
  method: VerificationMethod;
}

/**
 * Resolve an issuer DID and pick the verification method that matches the
 * JWS header's `kid`. If no `kid` is supplied, returns the first assertion
 * method (or the first verification method as a last resort).
 *
 * Throws if the DID cannot be resolved or no usable verification method is
 * present.
 */
export async function resolveIssuer(did: string, kid?: string): Promise<ResolvedIssuer> {
  const resolver = getResolver();
  const result = await resolver.resolve(did);
  if (!result.didDocument) {
    throw new Error(
      `Issuer DID not resolvable: ${did} (${result.didResolutionMetadata.error ?? 'no document returned'})`,
    );
  }
  const document = result.didDocument;
  const methods = document.verificationMethod ?? [];
  if (methods.length === 0) {
    throw new Error(`Issuer DID document has no verification methods: ${did}`);
  }

  // If kid is provided, prefer an exact match (fully-qualified or fragment-only)
  if (kid) {
    const exact = methods.find((m) => m.id === kid);
    if (exact) return { document, method: exact };
    const fragment = kid.startsWith('#') ? kid : `#${kid.split('#').pop() ?? ''}`;
    const byFragment = methods.find((m) => m.id.endsWith(fragment));
    if (byFragment) return { document, method: byFragment };
  }

  // Otherwise prefer one referenced by assertionMethod
  const assertionRefs = (document.assertionMethod ?? []).filter(
    (ref): ref is string => typeof ref === 'string',
  );
  for (const ref of assertionRefs) {
    const match = methods.find((m) => m.id === ref);
    if (match) return { document, method: match };
  }

  // Fall back to the first verification method.
  const fallback = methods[0];
  if (!fallback) {
    throw new Error(`Issuer DID document has no verification methods: ${did}`);
  }
  return { document, method: fallback };
}

export function publicKeyJwkFromMethod(method: VerificationMethod): JWK {
  if (!method.publicKeyJwk) {
    throw new Error(`Verification method ${method.id} has no publicKeyJwk`);
  }
  return method.publicKeyJwk as JWK;
}
