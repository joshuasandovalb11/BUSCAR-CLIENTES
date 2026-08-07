import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;
try {
  db = SQLite.openDatabaseSync('rutas.db');
} catch (e) {
  console.error("SQLite corrupto al abrir. Aplicando recuperación...", e);
  try {
    SQLite.deleteDatabaseSync('rutas.db');
    db = SQLite.openDatabaseSync('rutas.db');
  } catch (err) {
    console.error("Fallo fatal abriendo SQLite:", err);
  }
}

export const initDB = () => {
  try {
    if (!db) db = SQLite.openDatabaseSync('rutas.db');
    db.execSync('PRAGMA journal_mode = WAL;');
    db.execSync(
      'CREATE TABLE IF NOT EXISTS ubicaciones (id INTEGER PRIMARY KEY AUTOINCREMENT, latitud REAL, longitud REAL, velocidad REAL, timestamp INTEGER);'
    );
  } catch (e) {
    console.error("Error inicializando DB:", e);
  }
};

export const insertarUbicacion = (lat: number, lon: number, vel: number, timestamp: number) => {
  try {
    if (!db) db = SQLite.openDatabaseSync('rutas.db');
    db.runSync(
      'INSERT INTO ubicaciones (latitud, longitud, velocidad, timestamp) VALUES (?, ?, ?, ?)',
      [lat, lon, vel, timestamp]
    );
  } catch (e) {
    console.error("Error insertando ubicación en SQLite:", e);
  }
};

export const obtenerUbicaciones = (limit: number = 500, offset: number = 0) => {
  try {
    if (!db) db = SQLite.openDatabaseSync('rutas.db');
    return db.getAllSync(`SELECT * FROM ubicaciones ORDER BY timestamp ASC LIMIT ${limit} OFFSET ${offset}`);
  } catch (e) {
    console.error("Error obteniendo ubicaciones:", e);
    return [];
  }
};

export const obtenerUbicacionesAnteriores = (timestampLimite: number, limit: number = 500) => {
  try {
    if (!db) db = SQLite.openDatabaseSync('rutas.db');
    return db.getAllSync(
      `SELECT * FROM ubicaciones WHERE timestamp < ? ORDER BY timestamp ASC LIMIT ${limit}`,
      [timestampLimite]
    ) as { id: number; latitud: number; longitud: number; velocidad: number; timestamp: number }[];
  } catch (e) {
    console.error("Error obteniendo ubicaciones anteriores:", e);
    return [];
  }
};

export const obtenerUltimaUbicacion = (): { id: number; latitud: number; longitud: number; velocidad: number; timestamp: number } | null => {
  try {
    if (!db) db = SQLite.openDatabaseSync('rutas.db');
    const row = db.getFirstSync<{ id: number; latitud: number; longitud: number; velocidad: number; timestamp: number }>(
      'SELECT * FROM ubicaciones ORDER BY timestamp DESC LIMIT 1'
    );
    return row || null;
  } catch (e) {
    console.error("Error obteniendo última ubicación de DB:", e);
    return null;
  }
};

export const contarUbicaciones = (): number => {
  try {
    if (!db) db = SQLite.openDatabaseSync('rutas.db');
    const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM ubicaciones');
    return row ? row.count : 0;
  } catch (e) {
    console.error("Error contando ubicaciones:", e);
    return 0;
  }
};

export const limpiarUbicaciones = () => {
  try {
    if (!db) db = SQLite.openDatabaseSync('rutas.db');
    db.runSync('DELETE FROM ubicaciones');
    db.execSync('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch (e) {
    console.error("Error limpiando ubicaciones:", e);
  }
};

export const limpiarUbicacionesPorIds = (ids: number[]) => {
  try {
    if (!db || ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    db.runSync(`DELETE FROM ubicaciones WHERE id IN (${placeholders})`, ids);
    db.execSync('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch (e) {
    console.error("Error limpiando ubicaciones por IDs:", e);
  }
};
