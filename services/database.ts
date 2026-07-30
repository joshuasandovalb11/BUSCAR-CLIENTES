import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;
try {
  db = SQLite.openDatabaseSync('rutas.db');
} catch (e) {
  console.error("SQLite corrupto al abrir. Aplicando Tierra Arrasada...", e);
  // Borrado atómico síncrono disponible en Expo SQLite
  SQLite.deleteDatabaseSync('rutas.db');
  db = SQLite.openDatabaseSync('rutas.db');
}

export const initDB = () => {
  // Activar modo WAL (Write-Ahead Logging) para permitir lecturas y escrituras concurrentes sin bloquear
  db.execSync('PRAGMA journal_mode = WAL;');

  db.execSync(
    'CREATE TABLE IF NOT EXISTS ubicaciones (id INTEGER PRIMARY KEY AUTOINCREMENT, latitud REAL, longitud REAL, velocidad REAL, timestamp INTEGER);'
  );
};

export const insertarUbicacion = (lat: number, lon: number, vel: number, timestamp: number) => {
  db.runSync(
    'INSERT INTO ubicaciones (latitud, longitud, velocidad, timestamp) VALUES (?, ?, ?, ?)',
    [lat, lon, vel, timestamp]
  );
};

export const obtenerUbicaciones = (limit: number = 500, offset: number = 0) => {
  return db.getAllSync(`SELECT * FROM ubicaciones ORDER BY timestamp ASC LIMIT ${limit} OFFSET ${offset}`);
};

export const contarUbicaciones = (): number => {
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM ubicaciones');
  return row ? row.count : 0;
};

export const limpiarUbicaciones = () => {
  db.runSync('DELETE FROM ubicaciones');
  db.execSync('PRAGMA wal_checkpoint(TRUNCATE);');
};

export const limpiarUbicacionesPorIds = (ids: number[]) => {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  db.runSync(`DELETE FROM ubicaciones WHERE id IN (${placeholders})`, ids);
  db.execSync('PRAGMA wal_checkpoint(TRUNCATE);');
};
