export interface Payload {
  credentialId: string;
  username: string;
  publicKey: string;
}
export interface SessionToken {
  token: string;
  signature: string;
}
