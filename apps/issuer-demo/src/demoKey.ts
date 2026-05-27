/**
 * Demo signing key for the mock issuer.
 *
 * ⚠️  NOT FOR PRODUCTION. ⚠️
 *
 * The private key below is committed in source and therefore publicly
 * known. Any credential issued by this app is signed by a key that anyone
 * on the internet can also use to sign credentials. The issuer's
 * `accreditationLevel` in the Signata trust registry is "demo" precisely
 * so consumers know not to treat these credentials as real.
 *
 * The pair was generated with WebCrypto's `generateKey({name: 'ECDSA',
 * namedCurve: 'P-256'})`. The matching `did.json` lives at
 * `public/.well-known/did.json` and is served at
 * `https://issuer-demo.signata.xyz/.well-known/did.json`.
 */

export const ISSUER_DID = 'did:web:issuer-demo.signata.xyz';
export const KID = `${ISSUER_DID}#key-1`;

export const DEMO_PUBLIC_JWK = {
  kty: 'EC',
  crv: 'P-256',
  x: 'cbWQ5P4YoKK2rQKXjcI7mHWEcGivo1ezx-IFrbRYRvk',
  y: 'eob2FK3xvIETfWa-1lbRfAQZ3SwT2HvmOBirIj2BXhQ',
  alg: 'ES256',
  use: 'sig',
} as const;

export const DEMO_PRIVATE_JWK = {
  kty: 'EC',
  crv: 'P-256',
  x: 'cbWQ5P4YoKK2rQKXjcI7mHWEcGivo1ezx-IFrbRYRvk',
  y: 'eob2FK3xvIETfWa-1lbRfAQZ3SwT2HvmOBirIj2BXhQ',
  d: 'SyrhgYk2WFBn1NWAyl5s-sFMfaowNyYEcBXYap5RTw0',
  alg: 'ES256',
  use: 'sig',
} as const;
