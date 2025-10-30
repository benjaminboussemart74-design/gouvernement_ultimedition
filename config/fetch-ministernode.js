(function (global) {
  if (!global) {
    return;
  }

  let cachedClient = null;

  function resolveClient() {
    if (cachedClient) {
      return cachedClient;
    }
    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
      throw new Error('Supabase client factory is not available.');
    }
    const url = typeof global.SUPABASE_URL === 'string' ? global.SUPABASE_URL : '';
    const key = typeof global.SUPABASE_ANON_KEY === 'string' ? global.SUPABASE_ANON_KEY : '';
    if (!url || !key) {
      throw new Error('Supabase configuration is missing.');
    }
    cachedClient = global.supabase.createClient(url, key);
    return cachedClient;
  }

  async function fetchMinisterNodes() {
    const client = resolveClient();
    const { data, error } = await client
      .from('vw_ministernode')
      .select('person_id, full_name, is_leader, ministry_name, color, photo_url')
      .order('is_leader', { ascending: false })
      .order('full_name', { ascending: true });

    if (error) {
      throw error;
    }

    return (Array.isArray(data) ? data : []).map((row) => ({
      id: row.person_id,
      name: row.full_name,
      role: row.is_leader ? 'leader' : 'minister',
      portfolio: row.ministry_name,
      photo: row.photo_url ?? null,
      color: row.color ?? null,
      isLeader: !!row.is_leader,
    }));
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fetchMinisterNodes };
  } else {
    global.fetchMinisterNodes = fetchMinisterNodes;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
