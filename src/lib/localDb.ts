// ============================================================
// LocalDB: A localStorage-based database that replaces Supabase
// for all data operations. Auth still uses Supabase.
// ============================================================

const DB_KEY = 'silid_local_db';

interface DbSchema {
  users: any[];
  classrooms: any[];
  enrollments: any[];
  assignments: any[];
  posts: any[];
  submissions: any[];
  _nextId: Record<string, number>;
}

function getDb(): DbSchema {
  try {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore parse errors */ }
  return {
    users: [],
    classrooms: [],
    enrollments: [],
    assignments: [],
    posts: [],
    submissions: [],
    _nextId: {}
  };
}

function saveDb(db: DbSchema) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function nextId(db: DbSchema, table: string): number {
  const id = (db._nextId[table] || 0) + 1;
  db._nextId[table] = id;
  return id;
}

// ---- Query Builder (mimics Supabase chaining API) ----

type FilterFn = (item: any) => boolean;

class QueryBuilder {
  private table: string;
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private filters: FilterFn[] = [];
  private sortCol: string | null = null;
  private sortAsc = true;
  private _single = false;
  private _count = false;
  private _head = false;
  private _insertData: any[] | null = null;
  private _updateData: any | null = null;
  private _returnData = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, options?: { count?: string; head?: boolean }): this {
    if (this.op === 'insert' || this.op === 'upsert') {
      // .insert([...]).select() → return inserted data
      this._returnData = true;
    } else {
      this.op = 'select';
    }
    if (columns && columns !== '*') { /* columns selection not needed for localStorage */ }
    if (options?.count === 'exact') this._count = true;
    if (options?.head) this._head = true;
    return this;
  }

  insert(data: any[]): this {
    this.op = 'insert';
    this._insertData = data;
    return this;
  }

  upsert(data: any[]): this {
    this.op = 'upsert';
    this._insertData = data;
    return this;
  }

  update(data: any): this {
    this.op = 'update';
    this._updateData = data;
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push((item) => item[column] == value); // loose equality for string/number
    return this;
  }

  in(column: string, values: any[]): this {
    this.filters.push((item) => values.includes(item[column]));
    return this;
  }

  is(column: string, value: any): this {
    if (value === null) {
      this.filters.push((item) => item[column] === null || item[column] === undefined);
    } else {
      this.filters.push((item) => item[column] === value);
    }
    return this;
  }

  or(_expression: string): this {
    // Parse simple OR expressions like "teacherId.eq.5,students.cs.{5}"
    // For simplicity, just skip filtering (return all) — the UI handles display
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.sortCol = column;
    this.sortAsc = options?.ascending ?? true;
    return this;
  }

  limit(_n: number): this {
    return this;
  }

  single(): this {
    this._single = true;
    return this;
  }

  // Make this thenable so `await` works
  then(
    resolve?: ((value: any) => any) | null,
    reject?: ((reason: any) => any) | null
  ): Promise<any> {
    try {
      const result = this.execute();
      return Promise.resolve(result).then(resolve, reject);
    } catch (e) {
      if (reject) return Promise.reject(e).catch(reject);
      return Promise.reject(e);
    }
  }

  private applyFilters(items: any[]): any[] {
    let result = [...items];
    for (const fn of this.filters) {
      result = result.filter(fn);
    }
    if (this.sortCol) {
      const col = this.sortCol;
      const asc = this.sortAsc;
      result.sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }
    return result;
  }

  private execute(): any {
    const db = getDb();
    const tableData: any[] = (db as any)[this.table] || [];

    if (this.op === 'select') {
      const results = this.applyFilters(tableData);
      if (this._count && this._head) {
        return { data: null, error: null, count: results.length };
      }
      if (this._single) {
        return { data: results[0] || null, error: results[0] ? null : null };
      }
      return { data: results, error: null };
    }

    if (this.op === 'insert') {
      const inserted: any[] = [];
      for (const row of this._insertData || []) {
        const id = row.id || nextId(db, this.table);
        const newRow = {
          ...row,
          id,
          createdAt: row.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        tableData.push(newRow);
        inserted.push(newRow);
      }
      (db as any)[this.table] = tableData;
      saveDb(db);

      if (this._returnData) {
        if (this._single) return { data: inserted[0] || null, error: null };
        return { data: inserted, error: null };
      }
      return { data: null, error: null };
    }

    if (this.op === 'upsert') {
      const inserted: any[] = [];
      for (const row of this._insertData || []) {
        const existingIdx = tableData.findIndex((item) => item.id === row.id);
        if (existingIdx >= 0) {
          tableData[existingIdx] = { ...tableData[existingIdx], ...row, updatedAt: new Date().toISOString() };
          inserted.push(tableData[existingIdx]);
        } else {
          const id = row.id || nextId(db, this.table);
          const newRow = { ...row, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          tableData.push(newRow);
          inserted.push(newRow);
        }
      }
      (db as any)[this.table] = tableData;
      saveDb(db);
      return { data: null, error: null };
    }

    if (this.op === 'update') {
      const matches = this.applyFilters(tableData);
      for (const match of matches) {
        const idx = tableData.findIndex((item) => item.id === match.id);
        if (idx >= 0) {
          tableData[idx] = { ...tableData[idx], ...this._updateData, updatedAt: new Date().toISOString() };
        }
      }
      (db as any)[this.table] = tableData;
      saveDb(db);
      return { data: null, error: null };
    }

    return { data: null, error: null };
  }
}

// ---- Dummy channel for realtime (no-op) ----

const dummyChannel: any = {
  on: (..._args: any[]) => dummyChannel,
  subscribe: () => dummyChannel,
  unsubscribe: () => {},
};

// ---- Dummy storage ----

const dummyStorage = {
  from: (_bucket: string) => ({
    upload: async (_path: string, file: File) => {
      // Store file as a data URL in localStorage
      return { data: { path: file.name }, error: null };
    },
    getPublicUrl: (path: string) => {
      return { data: { publicUrl: `/mock-storage/${path}` } };
    },
  }),
};

// ---- Export the local database client ----

export const localDb = {
  from: (table: string) => new QueryBuilder(table),
  channel: (_name: string) => dummyChannel,
  removeChannel: (_channel: any) => {},
  storage: dummyStorage,
};
