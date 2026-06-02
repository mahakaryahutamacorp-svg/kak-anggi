'use strict';

const { TABLE_ORDER } = require('./schema');

const BACKUP_VERSION = 1;

// Ambil seluruh isi tiap tabel (urut sesuai dependensi FK).
async function dumpTables(db) {
  const data = {};
  for (const table of TABLE_ORDER) {
    data[table] = await db.all(`SELECT * FROM \`${table}\``);
  }
  return data;
}

async function buildJsonBackup(db) {
  const data = await dumpTables(db);
  return {
    version: BACKUP_VERSION,
    app: 'M3 Chicken POS',
    dialect: db.dialect,
    exportedAt: new Date().toISOString(),
    data
  };
}

function escapeSqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  const text = String(value).replace(/\\/g, '\\\\').replace(/'/g, "''");
  return `'${text}'`;
}

// Hasilkan SQL dump (data) yang bisa di-restore ke MySQL.
async function buildSqlBackup(db) {
  const data = await dumpTables(db);
  const now = new Date().toISOString();
  const lines = [
    '-- ============================================================',
    '-- M3 Chicken POS — SQL Backup (data)',
    `-- Sumber driver : ${db.dialect}`,
    `-- Dibuat        : ${now}`,
    '-- Restore       : import file ini via phpMyAdmin/MySQL.',
    '--                 Tabel akan dibuat otomatis oleh aplikasi saat',
    '--                 pertama kali dijalankan; file ini mengisi datanya.',
    '-- ============================================================',
    '',
    'SET FOREIGN_KEY_CHECKS = 0;',
    'SET NAMES utf8mb4;',
    ''
  ];

  for (const table of TABLE_ORDER) {
    const rows = data[table] || [];
    lines.push(`-- ----- Tabel: ${table} (${rows.length} baris) -----`);
    lines.push(`DELETE FROM \`${table}\`;`);
    if (rows.length) {
      const columns = Object.keys(rows[0]);
      const colList = columns.map((c) => `\`${c}\``).join(', ');
      for (const row of rows) {
        const values = columns.map((c) => escapeSqlValue(row[c])).join(', ');
        lines.push(`INSERT INTO \`${table}\` (${colList}) VALUES (${values});`);
      }
    }
    lines.push('');
  }

  lines.push('SET FOREIGN_KEY_CHECKS = 1;');
  lines.push('');
  return lines.join('\n');
}

function backupFilename(ext) {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return `M3Chicken_Backup_${yyyy}-${mm}-${dd}_${hh}${mi}.${ext}`;
}

module.exports = { buildJsonBackup, buildSqlBackup, backupFilename };
