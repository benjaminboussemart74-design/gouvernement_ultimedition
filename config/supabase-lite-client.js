(function (global) {
  if (!global) {
    return;
  }

  if (global.supabase && typeof global.supabase.createClient === 'function') {
    return;
  }

  function sanitizeBaseUrl(input) {
    if (typeof input !== 'string') return '';
    const trimmed = input.trim();
    if (!trimmed) return '';
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return '';
      }
      parsed.hash = '';
      return parsed.toString().replace(/\/$/, '');
    } catch (err) {
      return '';
    }
  }

  function encodeFilterValue(value) {
    if (Array.isArray(value)) {
      return value.map((v) => encodeURIComponent(String(v))).join(',');
    }
    return encodeURIComponent(String(value));
  }

  function RestQuery(client, table) {
    this.client = client;
    this.table = table;
    this._select = '*';
    this._filters = [];
    this._orders = [];
    this._limit = null;
  }

  RestQuery.prototype.select = function select(columns) {
    this._select = columns || '*';
    return this;
  };

  RestQuery.prototype.eq = function eq(column, value) {
    this._filters.push({ type: 'eq', column, value });
    return this;
  };

  RestQuery.prototype.in = function inFilter(column, values) {
    const list = Array.isArray(values) ? values : [values];
    this._filters.push({ type: 'in', column, value: list });
    return this;
  };

  RestQuery.prototype.ilike = function ilike(column, pattern) {
    this._filters.push({ type: 'ilike', column, value: pattern });
    return this;
  };

  RestQuery.prototype.order = function order(column, options) {
    const opts = options || {};
    const direction = opts.ascending === false ? 'desc' : 'asc';
    const foreign = typeof opts.foreignTable === 'string' && opts.foreignTable ? opts.foreignTable : null;
    this._orders.push({ column, direction, foreign });
    return this;
  };

  RestQuery.prototype.limit = function limit(count) {
    const n = Number(count);
    if (!Number.isNaN(n) && n >= 0) {
      this._limit = n;
    }
    return this;
  };

  RestQuery.prototype.then = function then(resolve, reject) {
    return this._execute().then(resolve, reject);
  };

  RestQuery.prototype.catch = function catchFn(reject) {
    return this._execute().catch(reject);
  };

  RestQuery.prototype._buildQueryString = function _buildQueryString() {
    const params = [];
    if (this._select) {
      let sel = String(this._select).replace(/\s+/g, ' ').trim();
      sel = sel.replace(/\s*\(\s*/g, '(').replace(/\s*\)\s*/g, ')').replace(/\s*,\s*/g, ',');
      params.push(`select=${encodeURIComponent(sel)}`);
    }
    this._filters.forEach((filter) => {
      if (!filter || !filter.column) return;
      const key = encodeURIComponent(filter.column);
      if (filter.type === 'eq') {
        params.push(`${key}=eq.${encodeFilterValue(filter.value)}`);
      } else if (filter.type === 'in') {
        params.push(`${key}=in.(${encodeFilterValue(filter.value)})`);
      } else if (filter.type === 'ilike') {
        params.push(`${key}=ilike.${encodeFilterValue(filter.value)}`);
      }
    });
    if (this._orders.length) {
      this._orders.forEach((order) => {
        if (!order || !order.column) return;
        const prefix = order.foreign ? `${encodeURIComponent(order.foreign)}.` : '';
        params.push(`order=${prefix}${encodeURIComponent(order.column)}.${order.direction}`);
      });
    }
    if (this._limit !== null) {
      params.push(`limit=${encodeURIComponent(String(this._limit))}`);
    }
    return params.length ? `?${params.join('&')}` : '';
  };

  RestQuery.prototype._execute = async function _execute() {
    const query = this._buildQueryString();
    const url = `${this.client.baseUrl}/rest/v1/${encodeURIComponent(this.table)}${query}`;
    let response;
    try {
      response = await this.client.fetch(url);
    } catch (error) {
      return { data: null, error: { message: error.message || 'Network error' } };
    }
    let payload = null;
    if (response && typeof response.json === 'function') {
      try {
        payload = await response.json();
      } catch (err) {
        payload = null;
      }
    }
    if (!response || !response.ok) {
      const message = payload && payload.message ? payload.message : (response ? response.statusText : 'Request failed');
      return { data: null, error: payload || { message } };
    }
    return { data: Array.isArray(payload) ? payload : payload ?? null, error: null };
  };

  function RestClient(baseUrl, anonKey) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.anonKey = anonKey;
  }

  RestClient.prototype.fetch = function fetchWithHeaders(url) {
    const headers = {
      apikey: this.anonKey,
      Authorization: `Bearer ${this.anonKey}`,
      Accept: 'application/json',
    };
    return global.fetch(url, { headers });
  };

  RestClient.prototype.from = function from(table) {
    if (!table) {
      throw new Error('Supabase table name is required');
    }
    return new RestQuery(this, table);
  };

  function createClient(baseUrl, anonKey) {
    const sanitizedUrl = sanitizeBaseUrl(baseUrl);
    const key = typeof anonKey === 'string' ? anonKey.trim() : '';
    if (!sanitizedUrl) {
      throw new Error('Supabase URL must be an absolute http(s) URL');
    }
    if (!key) {
      throw new Error('Supabase anon key is required');
    }
    if (typeof global.fetch !== 'function') {
      throw new Error('Supabase client requires a fetch implementation');
    }
    return new RestClient(sanitizedUrl, key);
  }

  global.supabase = { createClient };
})(typeof globalThis !== 'undefined' ? globalThis : this);
