// Pure factory lets tests inspect the production SDK calls without any network access.
export function createSupabaseAdapter(service, passwordClient) {
  return {
    // Release gate: only change after reviewed auth.users FK cascade is applied and tested.
    securityPrerequisites: false,
    async getUser(token) {
      const { data, error } = await service.auth.getUser(token);
      if (error) throw new Error('auth_failed');
      return data?.user;
    },
    async getVerifiedClaims(token) {
      // getClaims verifies asymmetric signatures via JWKS; symmetric tokens are
      // authenticated against the Auth server. No caller-provided JWT/JWK claims.
      const { data, error } = await service.auth.getClaims(token);
      if (error || !data?.claims) throw new Error('claims_verification_failed');
      return data.claims;
    },
    async reauthenticate(email, password) {
      // Separate anon client prevents password sign-in from replacing service-role auth.
      const { data, error } = await passwordClient.auth.signInWithPassword({ email, password });
      if (error || !data?.user) throw new Error('reauth_failed');
      const { error: signOutError } = await passwordClient.auth.signOut({ scope: 'local' });
      if (signOutError) throw new Error('reauth_cleanup_failed');
      return data.user;
    },
    async checkStorage(_userId) {
      // No buckets means no owned objects. With any bucket we fail closed until
      // an audited ownership adapter exists; never guess prefixes or expose storage schema.
      const { data, error } = await service.storage.listBuckets();
      if (error || !Array.isArray(data)) throw new Error('storage_check_failed');
      return data.length === 0 ? 'clear' : 'unverified';
    },
    async deleteAuthUser(id) {
      const { error } = await service.auth.admin.deleteUser(id, false);
      if (error) throw new Error('delete_auth_failed');
    },
  };
}
