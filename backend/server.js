require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Configurar la conexión a la base de datos de Aiven
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  // Aiven requiere SSL para conexiones seguras
  ssl: { rejectUnauthorized: false } 
});

// 2. Ruta de prueba: Obtener listado de estudiantes
app.get('/api/estudiantes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.carnet, u.nombre, u.correo 
      FROM Estudiantes e
      INNER JOIN Usuarios u ON e.id_usuario = u.id_usuario
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).json({ error: 'Error al conectar con la base de datos' });
  }
});

// 3. Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor ERP corriendo en el puerto ${PORT}`);
});