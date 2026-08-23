import {
  Category,
  Customer,
  Admin,
  Seller,
  Product,
  Review,
  Order,
  CartItem,
  UserRole,
  Address,
  SellerStatus,
  ProductStatus,
  OrderStatus,
} from '../types';
import {
  initialCategories,
  initialSellers,
  initialCustomers,
  initialAdmin,
  initialProducts,
  initialReviews,
  initialOrders,
} from '../data/seedData';

export interface SqlQueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
}

export interface SqlLogEntry {
  id: string;
  sql: string;
  params?: any[];
  executionTimeMs: number;
  timestamp: string;
  rowCount: number;
  command: string;
}

// In-Memory & LocalStorage Raw SQL Database Engine
class RawSqlDatabase {
  private tables: { [tableName: string]: any[] } = {};
  private sqlLogs: SqlLogEntry[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.isInitialized) return;
    const savedDb = typeof window !== 'undefined' ? localStorage.getItem('marketpulse_raw_sql_db_v4') : null;
    if (savedDb) {
      try {
        this.tables = JSON.parse(savedDb);
        // Ensure seller usernames are updated if old format exists
        if (this.tables.users && this.tables.sellers) {
          const auraSeller = this.tables.sellers.find((s: any) => s.id === 'SEL-1');
          if (auraSeller) auraSeller.username = 'auratech';
          const auraUser = this.tables.users.find((u: any) => u.entity_id === 'SEL-1');
          if (auraUser) auraUser.username = 'auratech';
        }
        this.isInitialized = true;
        return;
      } catch (e) {
        console.warn('Failed to parse saved raw SQL database, re-seeding...', e);
      }
    }
    this.createTablesAndSeed();
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('marketpulse_raw_sql_db_v4', JSON.stringify(this.tables));
      } catch (e) {
        console.error('Failed to persist raw SQL database to localStorage', e);
      }
    }
  }

  public createTablesAndSeed() {
    this.tables = {};

    // 1. DDL: Create Tables via Raw SQL
    this.executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT,
        role TEXT,
        entity_id TEXT,
        created_at TEXT
      );
    `);

    this.executeSql(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        username TEXT,
        name TEXT,
        email TEXT,
        password TEXT,
        number TEXT,
        address_house_name TEXT,
        address_street TEXT,
        address_city TEXT,
        address_postal_code TEXT,
        address_additional_info TEXT
      );
    `);

    this.executeSql(`
      CREATE TABLE IF NOT EXISTS sellers (
        id TEXT PRIMARY KEY,
        username TEXT,
        name TEXT,
        email TEXT,
        password TEXT,
        number TEXT,
        logo TEXT,
        description TEXT,
        status TEXT,
        address_house_name TEXT,
        address_street TEXT,
        address_city TEXT,
        address_postal_code TEXT,
        address_additional_info TEXT,
        created_at TEXT
      );
    `);

    this.executeSql(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        username TEXT,
        name TEXT,
        email TEXT,
        password TEXT,
        number TEXT,
        address_house_name TEXT,
        address_street TEXT,
        address_city TEXT,
        address_postal_code TEXT,
        address_additional_info TEXT
      );
    `);

    this.executeSql(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT
      );
    `);

    this.executeSql(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        image TEXT,
        description TEXT,
        price REAL,
        voucher TEXT,
        stock INTEGER,
        product_status TEXT,
        category_id TEXT,
        seller_id TEXT,
        review_id TEXT
      );
    `);

    this.executeSql(`
      CREATE TABLE IF NOT EXISTS cart (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        product_id TEXT,
        quantity INTEGER
      );
    `);

    this.executeSql(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        tracking_id TEXT,
        customer_id TEXT,
        items_json TEXT,
        subtotal REAL,
        shipping_fee REAL,
        status TEXT,
        shipping_address_json TEXT,
        billing_address_json TEXT,
        order_placed_at TEXT,
        additional_info TEXT
      );
    `);

    this.executeSql(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        customer_id TEXT,
        customer_name TEXT,
        review_text TEXT,
        rating INTEGER,
        created_at TEXT
      );
    `);

    // 2. Seed Data via Raw SQL INSERT statements
    for (const cat of initialCategories) {
      this.executeSql(
        `INSERT INTO categories (id, name) VALUES (?, ?)`,
        [cat.Category_ID, cat.Name]
      );
    }

    for (const cust of initialCustomers) {
      const username = cust.Email.split('@')[0].toLowerCase();
      this.executeSql(
        `INSERT INTO customers (id, username, name, email, password, number, address_house_name, address_street, address_city, address_postal_code, address_additional_info)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cust.Customer_ID,
          username,
          cust.Name,
          cust.Email,
          cust.Password || 'password123',
          cust.Number,
          cust.Address.House_Name,
          cust.Address.Street,
          cust.Address.City,
          cust.Address.Postal_Code,
          cust.Address.Additional_Info || '',
        ]
      );

      this.executeSql(
        `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `USR-${cust.Customer_ID}`,
          username,
          cust.Password || 'password123',
          cust.Email,
          'customer',
          cust.Customer_ID,
          new Date().toISOString(),
        ]
      );
    }

    const sellerUsernames: { [id: string]: string } = {
      'SEL-1': 'auratech',
      'SEL-2': 'artisanhome',
      'SEL-3': 'urbanthread',
    };

    for (const sel of initialSellers) {
      const username = sellerUsernames[sel.Seller_ID] || sel.Email.split('@')[0].toLowerCase() || sel.Name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'seller';
      this.executeSql(
        `INSERT INTO sellers (id, username, name, email, password, number, logo, description, status, address_house_name, address_street, address_city, address_postal_code, address_additional_info, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sel.Seller_ID,
          username,
          sel.Name,
          sel.Email,
          sel.Password || 'password123',
          sel.Number,
          sel.Logo,
          sel.Description,
          sel.Status,
          sel.Address.House_Name,
          sel.Address.Street,
          sel.Address.City,
          sel.Address.Postal_Code,
          sel.Address.Additional_Info || '',
          sel.Created_At,
        ]
      );

      this.executeSql(
        `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `USR-${sel.Seller_ID}`,
          username,
          sel.Password || 'password123',
          sel.Email,
          'seller',
          sel.Seller_ID,
          sel.Created_At,
        ]
      );
    }

    // Seed Admin
    this.executeSql(
      `INSERT INTO admins (id, username, name, email, password, number, address_house_name, address_street, address_city, address_postal_code, address_additional_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        initialAdmin.Admin_ID,
        'admin',
        initialAdmin.Name,
        initialAdmin.Email,
        initialAdmin.Password || 'ADMIN123',
        initialAdmin.Number,
        initialAdmin.Address.House_Name,
        initialAdmin.Address.Street,
        initialAdmin.Address.City,
        initialAdmin.Address.Postal_Code,
        initialAdmin.Address.Additional_Info || '',
      ]
    );

    this.executeSql(
      `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        `USR-${initialAdmin.Admin_ID}`,
        'admin',
        initialAdmin.Password || 'ADMIN123',
        initialAdmin.Email,
        'admin',
        initialAdmin.Admin_ID,
        new Date().toISOString(),
      ]
    );

    for (const prod of initialProducts) {
      this.executeSql(
        `INSERT INTO products (id, name, image, description, price, voucher, stock, product_status, category_id, seller_id, review_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prod.Product_ID,
          prod.Name,
          prod.Image,
          prod.Description,
          prod.Price,
          prod.Voucher || '',
          prod.Stock,
          prod.Product_Status,
          prod.Category_ID,
          prod.Seller_ID,
          prod.Review_ID || null,
        ]
      );
    }

    for (const rev of initialReviews) {
      this.executeSql(
        `INSERT INTO reviews (id, product_id, customer_id, customer_name, review_text, rating, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          rev.Review_ID,
          rev.Product_ID,
          rev.Customer_ID,
          rev.Customer_Name,
          rev.Review_text,
          rev.Rating,
          rev.Created_At,
        ]
      );
    }

    for (const ord of initialOrders) {
      this.executeSql(
        `INSERT INTO orders (id, tracking_id, customer_id, items_json, subtotal, shipping_fee, status, shipping_address_json, billing_address_json, order_placed_at, additional_info)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ord.Order_ID,
          ord.Tracking_ID,
          ord.Customer_ID,
          JSON.stringify(ord.Items),
          ord.Subtotal,
          ord.Shipping_Fee,
          ord.Status,
          JSON.stringify(ord.Shipping_Address),
          JSON.stringify(ord.Billing_Address),
          ord.Order_Placed_At,
          ord.Additional_Info || '',
        ]
      );
    }

    this.save();
  }

  // --- RAW SQL STATEMENT PARSER & EXECUTOR ---
  public executeSql<T = any>(sql: string, params: any[] = []): SqlQueryResult<T> {
    const startTime = performance.now();
    const cleanSql = sql.trim().replace(/;\s*$/, '');
    const firstWord = cleanSql.split(/\s+/)[0].toUpperCase();

    let result: SqlQueryResult<T> = { rows: [], rowCount: 0, command: firstWord };

    try {
      if (firstWord === 'CREATE') {
        result = this.handleCreateTable(cleanSql);
      } else if (firstWord === 'DROP') {
        result = this.handleDropTable(cleanSql);
      } else if (firstWord === 'INSERT') {
        result = this.handleInsert(cleanSql, params);
        this.save();
      } else if (firstWord === 'UPDATE') {
        result = this.handleUpdate(cleanSql, params);
        this.save();
      } else if (firstWord === 'DELETE') {
        result = this.handleDelete(cleanSql, params);
        this.save();
      } else if (firstWord === 'SELECT') {
        result = this.handleSelect<T>(cleanSql, params);
      } else {
        throw new Error(`Unsupported SQL command: ${firstWord}`);
      }
    } catch (err: any) {
      console.error('SQL Execution Error for Query:', cleanSql, 'Params:', params, err);
      throw err;
    }

    const elapsed = performance.now() - startTime;
    this.sqlLogs.unshift({
      id: 'LOG-' + Math.random().toString(36).substring(2, 9),
      sql: cleanSql,
      params,
      executionTimeMs: Math.round(elapsed * 100) / 100,
      timestamp: new Date().toLocaleTimeString(),
      rowCount: result.rowCount,
      command: firstWord,
    });

    if (this.sqlLogs.length > 50) {
      this.sqlLogs.pop();
    }

    return result;
  }

  public getSqlLogs(): SqlLogEntry[] {
    return this.sqlLogs;
  }

  private handleCreateTable(sql: string): SqlQueryResult {
    const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
    if (!match) throw new Error('Malformed CREATE TABLE SQL');
    const tableName = match[1].toLowerCase();
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }
    return { rows: [], rowCount: 0, command: 'CREATE TABLE' };
  }

  private handleDropTable(sql: string): SqlQueryResult {
    const match = sql.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
    if (match) {
      const tableName = match[1].toLowerCase();
      delete this.tables[tableName];
    }
    return { rows: [], rowCount: 0, command: 'DROP TABLE' };
  }

  private handleInsert(sql: string, params: any[]): SqlQueryResult {
    const match = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (!match) throw new Error(`Malformed INSERT SQL: ${sql}`);

    const tableName = match[1].toLowerCase();
    const columns = match[2].split(',').map((c) => c.trim().toLowerCase());
    const valuesPart = match[3].split(',').map((v) => v.trim());

    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }

    let paramIdx = 0;
    const newRecord: any = {};

    columns.forEach((col, i) => {
      const rawVal = valuesPart[i];
      if (rawVal === '?') {
        newRecord[col] = params[paramIdx++];
      } else {
        newRecord[col] = this.parseLiteral(rawVal);
      }
    });

    // Check primary key duplicate if id exists
    if (newRecord.id) {
      const existingIdx = this.tables[tableName].findIndex((r) => r.id === newRecord.id);
      if (existingIdx >= 0) {
        this.tables[tableName][existingIdx] = newRecord;
        return { rows: [newRecord], rowCount: 1, command: 'INSERT' };
      }
    }

    this.tables[tableName].push(newRecord);
    return { rows: [newRecord], rowCount: 1, command: 'INSERT' };
  }

  private handleUpdate(sql: string, params: any[]): SqlQueryResult {
    const match = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
    if (!match) throw new Error(`Malformed UPDATE SQL: ${sql}`);

    const tableName = match[1].toLowerCase();
    const setClause = match[2];
    const whereClause = match[3] || '';

    if (!this.tables[tableName]) {
      return { rows: [], rowCount: 0, command: 'UPDATE' };
    }

    let paramIdx = 0;

    // Parse SET statements
    const setAssignments = setClause.split(',').map((s) => s.trim());
    const updates: { col: string; val: any; isParam: boolean; rawVal: string }[] = [];

    for (const assign of setAssignments) {
      const [colRaw, valRaw] = assign.split('=').map((x) => x.trim());
      const col = colRaw.toLowerCase();
      if (valRaw === '?') {
        updates.push({ col, val: params[paramIdx++], isParam: true, rawVal: valRaw });
      } else {
        updates.push({ col, val: this.parseLiteral(valRaw), isParam: false, rawVal: valRaw });
      }
    }

    const whereParams = params.slice(paramIdx);
    const tableData = this.tables[tableName];
    let updatedCount = 0;
    const updatedRows: any[] = [];

    for (let i = 0; i < tableData.length; i++) {
      const row = tableData[i];
      if (this.evalWhere(row, whereClause, whereParams)) {
        for (const up of updates) {
          // Handle relative math operations like stock = stock - ?
          if (up.rawVal.includes('+') || up.rawVal.includes('-')) {
            const mathParts = up.rawVal.split(/([+-])/).map((x) => x.trim());
            const baseCol = mathParts[0].toLowerCase();
            const op = mathParts[1];
            const operandVal = mathParts[2] === '?' ? up.val : this.parseLiteral(mathParts[2]);
            const currentVal = Number(row[baseCol]) || 0;
            row[up.col] = op === '+' ? currentVal + Number(operandVal) : Math.max(0, currentVal - Number(operandVal));
          } else {
            row[up.col] = up.val;
          }
        }
        updatedCount++;
        updatedRows.push(row);
      }
    }

    return { rows: updatedRows, rowCount: updatedCount, command: 'UPDATE' };
  }

  private handleDelete(sql: string, params: any[]): SqlQueryResult {
    const match = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/i);
    if (!match) throw new Error(`Malformed DELETE SQL: ${sql}`);

    const tableName = match[1].toLowerCase();
    const whereClause = match[2] || '';

    if (!this.tables[tableName]) {
      return { rows: [], rowCount: 0, command: 'DELETE' };
    }

    const tableData = this.tables[tableName];
    const initialLen = tableData.length;
    this.tables[tableName] = tableData.filter((row) => !this.evalWhere(row, whereClause, params));
    const deletedCount = initialLen - this.tables[tableName].length;

    return { rows: [], rowCount: deletedCount, command: 'DELETE' };
  }

  private handleSelect<T = any>(sql: string, params: any[]): SqlQueryResult<T> {
    const match = sql.match(
      /SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i
    );

    if (!match) {
      throw new Error(`Malformed SELECT SQL: ${sql}`);
    }

    const selectColumnsStr = match[1].trim();
    const tableName = match[2].toLowerCase();
    const whereClause = match[3] || '';
    const orderByClause = match[4] || '';
    const limitClause = match[5] ? parseInt(match[5], 10) : undefined;

    const tableData = this.tables[tableName] || [];

    // Filter by WHERE
    let filtered = tableData.filter((row) => this.evalWhere(row, whereClause, params));

    // Handle Aggregations like COUNT(*), SUM(col)
    if (selectColumnsStr.toUpperCase().includes('COUNT(') || selectColumnsStr.toUpperCase().includes('SUM(')) {
      const aggResult: any = {};
      const selectParts = selectColumnsStr.split(',').map((s) => s.trim());
      for (const part of selectParts) {
        const countMatch = part.match(/COUNT\(([^)]+)\)(?:\s+AS\s+([a-zA-Z0-9_]+))?/i);
        if (countMatch) {
          const alias = countMatch[2] || 'count';
          aggResult[alias] = filtered.length;
        }
        const sumMatch = part.match(/SUM\(([^)]+)\)(?:\s+AS\s+([a-zA-Z0-9_]+))?/i);
        if (sumMatch) {
          const col = sumMatch[1].trim().toLowerCase();
          const alias = sumMatch[2] || 'sum';
          aggResult[alias] = filtered.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
        }
      }
      return { rows: [aggResult] as T[], rowCount: 1, command: 'SELECT' };
    }

    // ORDER BY
    if (orderByClause) {
      const [orderColRaw, direction] = orderByClause.trim().split(/\s+/);
      const orderCol = orderColRaw.toLowerCase();
      const isDesc = (direction || '').toUpperCase() === 'DESC';

      filtered = [...filtered].sort((a, b) => {
        const valA = a[orderCol];
        const valB = b[orderCol];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return isDesc ? valB - valA : valA - valB;
        }
        return isDesc ? String(valB).localeCompare(String(valA)) : String(valA).localeCompare(String(valB));
      });
    }

    // LIMIT
    if (limitClause !== undefined) {
      filtered = filtered.slice(0, limitClause);
    }

    // Select projection
    let projectedRows: any[] = filtered;
    if (selectColumnsStr !== '*') {
      const selectedCols = selectColumnsStr.split(',').map((c) => c.trim().toLowerCase());
      projectedRows = filtered.map((row) => {
        const proj: any = {};
        for (const col of selectedCols) {
          proj[col] = row[col];
        }
        return proj;
      });
    }

    return { rows: projectedRows as T[], rowCount: projectedRows.length, command: 'SELECT' };
  }

  private evalWhere(row: any, whereClause: string, params: any[]): boolean {
    if (!whereClause || !whereClause.trim()) return true;

    // Tokenize WHERE condition by AND/OR while preserving quotes and params
    const conditions = whereClause.split(/\s+AND\s+/i);
    let paramIndex = 0;

    for (const cond of conditions) {
      const cleanCond = cond.trim();

      // Parenthesized OR condition, e.g. (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))
      if (cleanCond.startsWith('(') && cleanCond.endsWith(')') && cleanCond.toUpperCase().includes(' OR ')) {
        const subConds = cleanCond.slice(1, -1).split(/\s+OR\s+/i);
        let orMatched = false;
        for (const sub of subConds) {
          const subCountQuestion = (sub.match(/\?/g) || []).length;
          const subParams = params.slice(paramIndex, paramIndex + subCountQuestion);
          if (this.evalSingleCondition(row, sub.trim(), subParams)) {
            orMatched = true;
          }
        }
        const totalParamsInSub = (cleanCond.match(/\?/g) || []).length;
        paramIndex += totalParamsInSub;
        if (!orMatched) return false;
        continue;
      }

      // Check parameter count in this condition
      const paramCount = (cleanCond.match(/\?/g) || []).length;
      const condParams = params.slice(paramIndex, paramIndex + paramCount);
      paramIndex += paramCount;

      if (!this.evalSingleCondition(row, cleanCond, condParams)) {
        return false;
      }
    }

    return true;
  }

  private evalSingleCondition(row: any, cond: string, params: any[]): boolean {
    let pIdx = 0;

    // 1. IS NULL / IS NOT NULL
    if (/IS\s+NULL/i.test(cond)) {
      const col = cond.replace(/IS\s+NULL/i, '').trim().toLowerCase();
      return row[col] === null || row[col] === undefined || row[col] === '';
    }
    if (/IS\s+NOT\s+NULL/i.test(cond)) {
      const col = cond.replace(/IS\s+NOT\s+NULL/i, '').trim().toLowerCase();
      return row[col] !== null && row[col] !== undefined && row[col] !== '';
    }

    // 2. Equality = or !=
    const opMatch = cond.match(/(?:LOWER\(([^)]+)\)|([a-zA-Z0-9_]+))\s*(=|!=|<>|LIKE)\s*(?:LOWER\((\?|'[^']*')\)|(\?|'[^']*'|[0-9.]+))/i);
    if (opMatch) {
      const col = (opMatch[1] || opMatch[2]).toLowerCase();
      const op = opMatch[3].toUpperCase();
      const rawVal = opMatch[4] || opMatch[5];
      const targetVal = rawVal === '?' ? params[pIdx++] : this.parseLiteral(rawVal);

      let rowVal = row[col];
      const isCaseInsensitive = cond.toUpperCase().includes('LOWER(');

      if (isCaseInsensitive) {
        rowVal = rowVal ? String(rowVal).toLowerCase() : '';
        const compareVal = targetVal ? String(targetVal).toLowerCase() : '';
        if (op === '=' || op === 'LIKE') return rowVal === compareVal;
        return rowVal !== compareVal;
      }

      if (op === '=' || op === 'LIKE') {
        return String(rowVal ?? '') === String(targetVal ?? '');
      } else {
        return String(rowVal ?? '') !== String(targetVal ?? '');
      }
    }

    return true;
  }

  private parseLiteral(val: string): any {
    if (!val) return '';
    const clean = val.trim();
    if (clean.startsWith("'") && clean.endsWith("'")) {
      return clean.slice(1, -1);
    }
    if (clean.toUpperCase() === 'NULL') return null;
    if (clean.toUpperCase() === 'TRUE') return true;
    if (clean.toUpperCase() === 'FALSE') return false;
    if (!isNaN(Number(clean))) return Number(clean);
    return clean;
  }
}

// Global Singleton Instance
export const rawSql = new RawSqlDatabase();

// --- High Level Domain Mapping Layer strictly querying via RAW SQL statements ---
export const db = {
  // RAW SQL EXECUTION
  query: <T = any>(sql: string, params: any[] = []): SqlQueryResult<T> => {
    return rawSql.executeSql<T>(sql, params);
  },
  getLogs: () => rawSql.getSqlLogs(),

  // CATEGORIES
  getCategories: (): Category[] => {
    const res = rawSql.executeSql<{ id: string; name: string }>(
      'SELECT id, name FROM categories ORDER BY name ASC'
    );
    return res.rows.map((r) => ({
      Category_ID: r.id,
      Name: r.name,
    }));
  },
  createCategory: (name: string): Category => {
    const id = 'CAT-' + (Date.now() % 100000);
    rawSql.executeSql(
      'INSERT INTO categories (id, name) VALUES (?, ?)',
      [id, name]
    );
    return { Category_ID: id, Name: name };
  },
  updateCategory: (id: string, name: string): Category => {
    rawSql.executeSql(
      'UPDATE categories SET name = ? WHERE id = ?',
      [name, id]
    );
    return { Category_ID: id, Name: name };
  },
  deleteCategory: (id: string) => {
    rawSql.executeSql('DELETE FROM categories WHERE id = ?', [id]);
    return { success: true };
  },

  // SELLERS
  getSellers: (): Seller[] => {
    const res = rawSql.executeSql<any>('SELECT * FROM sellers ORDER BY created_at DESC');
    return res.rows.map((r) => ({
      Seller_ID: r.id,
      Name: r.name,
      Email: r.email,
      Password: r.password,
      Number: r.number,
      Logo: r.logo,
      Description: r.description,
      Status: r.status as SellerStatus,
      Created_At: r.created_at,
      Address: {
        House_Name: r.address_house_name || '',
        Street: r.address_street || '',
        City: r.address_city || '',
        Postal_Code: r.address_postal_code || '',
        Additional_Info: r.address_additional_info || '',
      },
    }));
  },
  createSeller: (data: Partial<Seller> & { Username?: string }): Seller => {
    const id = 'SEL-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const createdAt = new Date().toISOString();
    const username = (data.Username || data.Name?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'seller' + (Date.now() % 1000)).trim();
    const password = data.Password || 'password123';
    const status: SellerStatus = 'pending';

    rawSql.executeSql(
      `INSERT INTO sellers (id, username, name, email, password, number, logo, description, status, address_house_name, address_street, address_city, address_postal_code, address_additional_info, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        username,
        data.Name || 'New Seller',
        data.Email || '',
        password,
        data.Number || '',
        data.Logo || 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=200',
        data.Description || '',
        status,
        data.Address?.House_Name || '',
        data.Address?.Street || '',
        data.Address?.City || '',
        data.Address?.Postal_Code || '',
        data.Address?.Additional_Info || '',
        createdAt,
      ]
    );

    rawSql.executeSql(
      `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'USR-' + id,
        username,
        password,
        data.Email || '',
        'seller',
        id,
        createdAt,
      ]
    );

    return {
      Seller_ID: id,
      Name: data.Name || '',
      Email: data.Email || '',
      Password: password,
      Number: data.Number || '',
      Logo: data.Logo || '',
      Description: data.Description || '',
      Status: status,
      Created_At: createdAt,
      Address: data.Address || { Street: '', House_Name: '', City: '', Postal_Code: '' },
    };
  },
  updateSellerStatus: (id: string, status: SellerStatus) => {
    rawSql.executeSql('UPDATE sellers SET status = ? WHERE id = ?', [status, id]);
  },

  // CUSTOMERS
  getCustomers: (): Customer[] => {
    const res = rawSql.executeSql<any>('SELECT * FROM customers ORDER BY id ASC');
    return res.rows.map((r) => ({
      Customer_ID: r.id,
      Name: r.name,
      Email: r.email,
      Password: r.password,
      Number: r.number,
      Address: {
        House_Name: r.address_house_name || '',
        Street: r.address_street || '',
        City: r.address_city || '',
        Postal_Code: r.address_postal_code || '',
        Additional_Info: r.address_additional_info || '',
      },
    }));
  },
  createCustomer: (data: Partial<Customer> & { Username?: string }): Customer => {
    const id = 'CUST-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const username = (data.Username || data.Email?.split('@')[0] || data.Name?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'cust' + (Date.now() % 1000)).trim();
    const password = data.Password || 'password123';

    rawSql.executeSql(
      `INSERT INTO customers (id, username, name, email, password, number, address_house_name, address_street, address_city, address_postal_code, address_additional_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        username,
        data.Name || '',
        data.Email || '',
        password,
        data.Number || '',
        data.Address?.House_Name || '',
        data.Address?.Street || '',
        data.Address?.City || '',
        data.Address?.Postal_Code || '',
        data.Address?.Additional_Info || '',
      ]
    );

    rawSql.executeSql(
      `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'USR-' + id,
        username,
        password,
        data.Email || '',
        'customer',
        id,
        new Date().toISOString(),
      ]
    );

    return {
      Customer_ID: id,
      Name: data.Name || '',
      Email: data.Email || '',
      Password: password,
      Number: data.Number || '',
      Address: data.Address || { Street: '', House_Name: '', City: '', Postal_Code: '' },
    };
  },
  updateCustomer: (id: string, data: Partial<Customer>) => {
    rawSql.executeSql(
      `UPDATE customers SET name = ?, email = ?, number = ?, address_house_name = ?, address_street = ?, address_city = ?, address_postal_code = ?, address_additional_info = ? WHERE id = ?`,
      [
        data.Name || '',
        data.Email || '',
        data.Number || '',
        data.Address?.House_Name || '',
        data.Address?.Street || '',
        data.Address?.City || '',
        data.Address?.Postal_Code || '',
        data.Address?.Additional_Info || '',
        id,
      ]
    );
  },

  // ADMINS
  getAdmins: (): Admin[] => {
    const res = rawSql.executeSql<any>('SELECT * FROM admins ORDER BY id ASC');
    return res.rows.map((r) => ({
      Admin_ID: r.id,
      Name: r.name,
      Email: r.email,
      Password: r.password,
      Number: r.number,
      Address: {
        House_Name: r.address_house_name || '',
        Street: r.address_street || '',
        City: r.address_city || '',
        Postal_Code: r.address_postal_code || '',
        Additional_Info: r.address_additional_info || '',
      },
    }));
  },
  createAdmin: (data: Partial<Admin> & { Username?: string }): Admin => {
    const id = 'ADM-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const username = (data.Username || 'admin_' + (Date.now() % 1000)).trim();
    const password = data.Password || 'ADMIN123';

    rawSql.executeSql(
      `INSERT INTO admins (id, username, name, email, password, number, address_house_name, address_street, address_city, address_postal_code, address_additional_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        username,
        data.Name || 'Admin User',
        data.Email || '',
        password,
        data.Number || '',
        data.Address?.House_Name || '',
        data.Address?.Street || '',
        data.Address?.City || '',
        data.Address?.Postal_Code || '',
        data.Address?.Additional_Info || '',
      ]
    );

    rawSql.executeSql(
      `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'USR-' + id,
        username,
        password,
        data.Email || '',
        'admin',
        id,
        new Date().toISOString(),
      ]
    );

    return {
      Admin_ID: id,
      Name: data.Name || '',
      Email: data.Email || '',
      Password: password,
      Number: data.Number || '',
      Address: data.Address || { Street: '', House_Name: '', City: '', Postal_Code: '' },
    };
  },

  // PRODUCTS
  getProducts: (params?: { sellerId?: string; categoryId?: string; status?: string }): Product[] => {
    const res = rawSql.executeSql<any>('SELECT * FROM products ORDER BY id DESC');
    let products: Product[] = res.rows.map((r) => ({
      Product_ID: r.id,
      Name: r.name,
      Image: r.image,
      Description: r.description,
      Price: Number(r.price),
      Voucher: r.voucher || '',
      Stock: Number(r.stock),
      Product_Status: r.product_status as ProductStatus,
      Category_ID: r.category_id,
      Seller_ID: r.seller_id,
      Review_ID: r.review_id || undefined,
    }));

    if (params?.sellerId) {
      products = products.filter((p) => p.Seller_ID === params.sellerId);
    }
    if (params?.categoryId) {
      products = products.filter((p) => p.Category_ID === params.categoryId);
    }
    if (params?.status) {
      products = products.filter((p) => p.Product_Status === params.status);
    }

    return products;
  },
  createProduct: (data: Partial<Product>): Product => {
    const id = 'PROD-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const status: ProductStatus = data.Product_Status || 'active';

    rawSql.executeSql(
      `INSERT INTO products (id, name, image, description, price, voucher, stock, product_status, category_id, seller_id, review_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.Name || '',
        data.Image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        data.Description || '',
        Number(data.Price) || 0,
        data.Voucher || '',
        Number(data.Stock) || 0,
        status,
        data.Category_ID || '',
        data.Seller_ID || '',
        data.Review_ID || null,
      ]
    );

    return {
      Product_ID: id,
      Name: data.Name || '',
      Image: data.Image || '',
      Description: data.Description || '',
      Price: Number(data.Price) || 0,
      Voucher: data.Voucher || '',
      Stock: Number(data.Stock) || 0,
      Product_Status: status,
      Category_ID: data.Category_ID || '',
      Seller_ID: data.Seller_ID || '',
      Review_ID: data.Review_ID,
    };
  },
  updateProduct: (id: string, data: Partial<Product>) => {
    rawSql.executeSql(
      `UPDATE products SET name = ?, image = ?, description = ?, price = ?, voucher = ?, stock = ?, category_id = ?, product_status = ? WHERE id = ?`,
      [
        data.Name,
        data.Image,
        data.Description,
        Number(data.Price),
        data.Voucher || '',
        Number(data.Stock),
        data.Category_ID,
        data.Product_Status,
        id,
      ]
    );
  },
  updateProductStatus: (id: string, status: ProductStatus) => {
    rawSql.executeSql('UPDATE products SET product_status = ? WHERE id = ?', [status, id]);
  },
  deleteProduct: (id: string) => {
    rawSql.executeSql('DELETE FROM products WHERE id = ?', [id]);
  },

  // CART
  getCart: (customerId: string): CartItem[] => {
    const res = rawSql.executeSql<any>('SELECT * FROM cart WHERE customer_id = ?', [customerId]);
    const allProducts = db.getProducts();

    return res.rows.map((r) => ({
      Cart_ID: r.id,
      Customer_ID: r.customer_id,
      Product_ID: r.product_id,
      Quantity: Number(r.quantity),
      Product: allProducts.find((p) => p.Product_ID === r.product_id),
    }));
  },
  addToCart: (customerId: string, productId: string, quantity: number = 1): CartItem => {
    const existing = rawSql.executeSql<any>(
      'SELECT * FROM cart WHERE customer_id = ? AND product_id = ?',
      [customerId, productId]
    );

    if (existing.rowCount > 0) {
      const cartId = existing.rows[0].id;
      const newQty = Number(existing.rows[0].quantity) + quantity;
      rawSql.executeSql('UPDATE cart SET quantity = ? WHERE id = ?', [newQty, cartId]);
      return {
        Cart_ID: cartId,
        Customer_ID: customerId,
        Product_ID: productId,
        Quantity: newQty,
      };
    } else {
      const cartId = 'CART-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      rawSql.executeSql(
        'INSERT INTO cart (id, customer_id, product_id, quantity) VALUES (?, ?, ?, ?)',
        [cartId, customerId, productId, quantity]
      );
      return {
        Cart_ID: cartId,
        Customer_ID: customerId,
        Product_ID: productId,
        Quantity: quantity,
      };
    }
  },
  updateCartQuantity: (cartId: string, quantity: number) => {
    if (quantity <= 0) {
      rawSql.executeSql('DELETE FROM cart WHERE id = ?', [cartId]);
    } else {
      rawSql.executeSql('UPDATE cart SET quantity = ? WHERE id = ?', [quantity, cartId]);
    }
  },
  removeFromCart: (cartId: string) => {
    rawSql.executeSql('DELETE FROM cart WHERE id = ?', [cartId]);
  },
  clearCart: (customerId: string) => {
    rawSql.executeSql('DELETE FROM cart WHERE customer_id = ?', [customerId]);
  },

  // ORDERS
  getOrders: (params?: { customerId?: string; sellerId?: string }): Order[] => {
    const res = rawSql.executeSql<any>('SELECT * FROM orders ORDER BY order_placed_at DESC');
    let orders: Order[] = res.rows.map((r) => ({
      Order_ID: r.id,
      Tracking_ID: r.tracking_id,
      Customer_ID: r.customer_id,
      Items: typeof r.items_json === 'string' ? JSON.parse(r.items_json || '[]') : r.items_json,
      Subtotal: Number(r.subtotal),
      Shipping_Fee: Number(r.shipping_fee),
      Status: r.status as OrderStatus,
      Shipping_Address: typeof r.shipping_address_json === 'string' ? JSON.parse(r.shipping_address_json || '{}') : r.shipping_address_json,
      Billing_Address: typeof r.billing_address_json === 'string' ? JSON.parse(r.billing_address_json || '{}') : r.billing_address_json,
      Order_Placed_At: r.order_placed_at,
      Additional_Info: r.additional_info || '',
    }));

    if (params?.customerId) {
      orders = orders.filter((o) => o.Customer_ID === params.customerId);
    }
    if (params?.sellerId) {
      orders = orders.filter((o) => o.Items.some((item: any) => item.Seller_ID === params.sellerId));
    }

    return orders;
  },
  createOrder: (data: {
    Customer_ID: string;
    Items: any[];
    Shipping_Address: Address;
    Billing_Address: Address;
    Subtotal: number;
    Shipping_Fee: number;
    Additional_Info?: string;
  }): Order => {
    const id = 'ORD-' + (Date.now() % 1000000);
    const trackingId = 'TRK-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
    const placedAt = new Date().toISOString();
    const status: OrderStatus = 'placed';

    rawSql.executeSql(
      `INSERT INTO orders (id, tracking_id, customer_id, items_json, subtotal, shipping_fee, status, shipping_address_json, billing_address_json, order_placed_at, additional_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        trackingId,
        data.Customer_ID,
        JSON.stringify(data.Items),
        data.Subtotal,
        data.Shipping_Fee,
        status,
        JSON.stringify(data.Shipping_Address),
        JSON.stringify(data.Billing_Address),
        placedAt,
        data.Additional_Info || '',
      ]
    );

    // Reduce stock for each product via raw SQL
    for (const item of data.Items) {
      rawSql.executeSql('UPDATE products SET stock = stock - ? WHERE id = ?', [
        item.Quantity,
        item.Product_ID,
      ]);
    }

    // Clear cart for customer
    db.clearCart(data.Customer_ID);

    return {
      Order_ID: id,
      Tracking_ID: trackingId,
      Customer_ID: data.Customer_ID,
      Items: data.Items,
      Subtotal: data.Subtotal,
      Shipping_Fee: data.Shipping_Fee,
      Status: status,
      Shipping_Address: data.Shipping_Address,
      Billing_Address: data.Billing_Address,
      Order_Placed_At: placedAt,
      Additional_Info: data.Additional_Info,
    };
  },
  updateOrderStatus: (id: string, status: OrderStatus) => {
    rawSql.executeSql('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  },

  // REVIEWS
  getReviews: (params?: { productId?: string; sellerId?: string }): Review[] => {
    const res = rawSql.executeSql<any>('SELECT * FROM reviews ORDER BY created_at DESC');
    let reviews: Review[] = res.rows.map((r) => ({
      Review_ID: r.id,
      Product_ID: r.product_id,
      Customer_ID: r.customer_id,
      Customer_Name: r.customer_name,
      Review_text: r.review_text,
      Rating: Number(r.rating),
      Created_At: r.created_at,
    }));

    if (params?.productId) {
      reviews = reviews.filter((r) => r.Product_ID === params.productId);
    }
    return reviews;
  },
  createReview: (data: {
    Product_ID: string;
    Customer_ID: string;
    Customer_Name: string;
    Review_text: string;
    Rating: number;
  }): Review => {
    const id = 'REV-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const createdAt = new Date().toISOString();

    rawSql.executeSql(
      `INSERT INTO reviews (id, product_id, customer_id, customer_name, review_text, rating, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.Product_ID,
        data.Customer_ID,
        data.Customer_Name,
        data.Review_text,
        data.Rating,
        createdAt,
      ]
    );

    // Update product's latest review_id
    rawSql.executeSql('UPDATE products SET review_id = ? WHERE id = ?', [id, data.Product_ID]);

    return {
      Review_ID: id,
      Product_ID: data.Product_ID,
      Customer_ID: data.Customer_ID,
      Customer_Name: data.Customer_Name,
      Review_text: data.Review_text,
      Rating: data.Rating,
      Created_At: createdAt,
    };
  },

  // AUTHENTICATION: BY USERNAME AND PASSWORD SIMPLY
  login: (usernameOrEmail: string, password: string): { success: boolean; role: UserRole; entity: any; message?: string } => {
    const trimmedInput = usernameOrEmail.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // Query raw SQL users table
    let userRes = rawSql.executeSql<any>(
      `SELECT * FROM users WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND password = ? LIMIT 1`,
      [trimmedInput, trimmedInput, trimmedPassword]
    );

    // If not found and input is 'auratech', check for 'auratechso' alias or vice versa
    if (userRes.rowCount === 0) {
      if (trimmedInput === 'auratech') {
        userRes = rawSql.executeSql<any>(
          `SELECT * FROM users WHERE (LOWER(username) = 'auratechso' OR entity_id = 'SEL-1') AND password = ? LIMIT 1`,
          [trimmedPassword]
        );
      } else if (trimmedInput === 'artisanhome') {
        userRes = rawSql.executeSql<any>(
          `SELECT * FROM users WHERE (LOWER(username) = 'artisanhom' OR entity_id = 'SEL-2') AND password = ? LIMIT 1`,
          [trimmedPassword]
        );
      } else if (trimmedInput === 'urbanthread') {
        userRes = rawSql.executeSql<any>(
          `SELECT * FROM users WHERE (LOWER(username) = 'urbanthrea' OR entity_id = 'SEL-3') AND password = ? LIMIT 1`,
          [trimmedPassword]
        );
      }
    }

    if (userRes.rowCount === 0) {
      // Fallback check in customers, sellers, admins tables if user row wasn't linked
      const custCheck = rawSql.executeSql<any>(
        `SELECT * FROM customers WHERE (LOWER(username) = ? OR LOWER(email) = ? OR LOWER(name) = ?) AND password = ? LIMIT 1`,
        [trimmedInput, trimmedInput, trimmedInput, trimmedPassword]
      );
      if (custCheck.rowCount > 0) {
        const c = db.getCustomers().find((x) => x.Customer_ID === custCheck.rows[0].id);
        return { success: true, role: 'customer', entity: c };
      }

      const selCheck = rawSql.executeSql<any>(
        `SELECT * FROM sellers WHERE (LOWER(username) = ? OR LOWER(email) = ? OR LOWER(name) LIKE ? OR id = ?) AND password = ? LIMIT 1`,
        [trimmedInput, trimmedInput, `%${trimmedInput}%`, trimmedInput === 'auratech' ? 'SEL-1' : trimmedInput, trimmedPassword]
      );
      if (selCheck.rowCount > 0) {
        const s = db.getSellers().find((x) => x.Seller_ID === selCheck.rows[0].id);
        return { success: true, role: 'seller', entity: s };
      }

      const admCheck = rawSql.executeSql<any>(
        `SELECT * FROM admins WHERE (LOWER(username) = ? OR LOWER(email) = ? OR LOWER(name) = ?) AND password = ? LIMIT 1`,
        [trimmedInput, trimmedInput, trimmedInput, trimmedPassword]
      );
      if (admCheck.rowCount > 0) {
        const a = db.getAdmins().find((x) => x.Admin_ID === admCheck.rows[0].id);
        return { success: true, role: 'admin', entity: a };
      }

      return { success: false, role: 'customer', entity: null, message: 'Invalid username or password' };
    }

    const userRow = userRes.rows[0];
    const role = userRow.role as UserRole;
    const entityId = userRow.entity_id;

    let entity: any = null;
    if (role === 'customer') {
      entity = db.getCustomers().find((c) => c.Customer_ID === entityId);
    } else if (role === 'seller') {
      entity = db.getSellers().find((s) => s.Seller_ID === entityId);
    } else if (role === 'admin') {
      entity = db.getAdmins().find((a) => a.Admin_ID === entityId);
    }

    return { success: true, role, entity };
  },

  // RESET SEED DATABASE
  resetSeed: () => {
    rawSql.createTablesAndSeed();
    return { success: true, message: 'Database reset to initial raw SQL seed state.' };
  },
};
