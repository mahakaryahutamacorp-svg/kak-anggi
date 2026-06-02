'use strict';

const path = require('path');
const fs = require('fs');
const { getSchema } = require('./schema');

// Adapter database dual-driver.
// - SQLite  : mode lokal/offline & desktop portable (sinkron, dibungkus Promise)
// - MySQL   : mode server/Hostinger (asinkron, connection pool)
//
// Semua method query bersifat async sehingga server.js cukup memakai satu
// API yang sama tanpa peduli driver mana yang aktif.

function createSqliteAdapter() {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (err) {
    throw new Error(
      'Driver SQLite tidak tersedia. Jalankan "npm install better-sqlite3" ' +
        'atau set DB_DRIVER=mysql di file .env.'
    );
  }

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'm3chicken.db');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');

  const api = {
    dialect: 'sqlite',
    label: `SQLite (${dbPath})`,
    async init() {
      for (const stmt of getSchema('sqlite')) {
        sqlite.exec(stmt);
      }
    },
    async all(sql, params = []) {
      return sqlite.prepare(sql).all(...params);
    },
    async get(sql, params = []) {
      return sqlite.prepare(sql).get(...params);
    },
    async run(sql, params = []) {
      const info = sqlite.prepare(sql).run(...params);
      return { changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid) };
    },
    async tx(fn) {
      sqlite.exec('BEGIN');
      try {
        const result = await fn(api);
        sqlite.exec('COMMIT');
        return result;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    },
    dateExpr: (col) => `substr(${col}, 1, 10)`,
    monthExpr: (col) => `substr(${col}, 1, 7)`,
    isUniqueError: (err) => /UNIQUE/i.test((err && err.message) || ''),
    async close() {
      sqlite.close();
    }
  };

  return api;
}

function createMysqlAdapter() {
  const mysql = require('mysql2/promise');
  let pool;

  function scoped(conn) {
    return {
      dialect: 'mysql',
      async all(sql, params = []) {
        const [rows] = await conn.query(sql, params);
        return rows;
      },
      async get(sql, params = []) {
        const [rows] = await conn.query(sql, params);
        return rows[0];
      },
      async run(sql, params = []) {
        const [res] = await conn.query(sql, params);
        return { changes: res.affectedRows, lastInsertRowid: res.insertId };
      },
      dateExpr: (col) => `LEFT(${col}, 10)`,
      monthExpr: (col) => `LEFT(${col}, 7)`,
      isUniqueError: (err) => !!err && err.code === 'ER_DUP_ENTRY'
    };
  }

  const api = {
    dialect: 'mysql',
    label: `MySQL (${process.env.MYSQL_DATABASE}@${process.env.MYSQL_HOST})`,
    async init() {
      pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        charset: 'utf8mb4',
        // Kembalikan hasil DECIMAL (mis. SUM/COALESCE) sebagai number,
        // agar konsisten dengan perilaku SQLite & frontend.
        decimalNumbers: true
      });
      for (const stmt of getSchema('mysql')) {
        await pool.query(stmt);
      }
    },
    async all(sql, params = []) {
      const [rows] = await pool.query(sql, params);
      return rows;
    },
    async get(sql, params = []) {
      const [rows] = await pool.query(sql, params);
      return rows[0];
    },
    async run(sql, params = []) {
      const [res] = await pool.query(sql, params);
      return { changes: res.affectedRows, lastInsertRowid: res.insertId };
    },
    async tx(fn) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const result = await fn(scoped(conn));
        await conn.commit();
        return result;
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    },
    dateExpr: (col) => `LEFT(${col}, 10)`,
    monthExpr: (col) => `LEFT(${col}, 7)`,
    isUniqueError: (err) => !!err && err.code === 'ER_DUP_ENTRY',
    async close() {
      if (pool) await pool.end();
    }
  };

  return api;
}

function createDatabase() {
  const driver = (process.env.DB_DRIVER || 'sqlite').toLowerCase();
  if (driver === 'mysql') {
    return createMysqlAdapter();
  }
  return createSqliteAdapter();
}

module.exports = { createDatabase };
