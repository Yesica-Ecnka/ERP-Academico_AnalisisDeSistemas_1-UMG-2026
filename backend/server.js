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
// Ruta GET: Obtener listado de cursos para el menú desplegable
app.get('/api/cursos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id_curso, nombre FROM Cursos');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({ error: 'Error al cargar los cursos' });
  }
});
// Ruta POST: Inscribir estudiante (RF-08 y Validación RF-09)
app.post('/api/inscripciones', async (req, res) => {
  // Recibimos los datos enviados desde el frontend
  const { carnet_estudiante, id_curso } = req.body;

  try {
    // 1er Paso (Validación Crítica): Verificar si el estudiante ya está inscrito en ese curso
    const [inscripcionesPrevias] = await pool.query(
      'SELECT * FROM Inscripciones WHERE carnet_estudiante = ? AND id_curso = ?',
      [carnet_estudiante, id_curso]
    );

    // Si ya existe un registro, disparamos el "Unhappy Path" (camino de error)
    if (inscripcionesPrevias.length > 0) {
      return res.status(400).json({ error: 'Validación de Malla: El estudiante ya se encuentra asignado a este curso.' });
    }

    // 2do Paso: Si pasa la validación, insertamos la inscripción (Happy Path)
    const fechaActual = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    await pool.query(
      'INSERT INTO Inscripciones (carnet_estudiante, id_curso, fecha, estado) VALUES (?, ?, ?, ?)',
      [carnet_estudiante, id_curso, fechaActual, 'ACTIVA']
    );

    res.status(201).json({ mensaje: '¡Inscripción realizada con éxito en la Base de Datos!' });
  } catch (error) {
    console.error('Error en el proceso de inscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar la inscripción.' });
  }
});


// Ruta GET: Obtener las inscripciones recientes para la tabla
app.get('/api/inscripciones', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.id_inscripcion, u.nombre AS estudiante, c.nombre AS curso, i.fecha
      FROM Inscripciones i
      JOIN Estudiantes e ON i.carnet_estudiante = e.carnet
      JOIN Usuarios u ON e.id_usuario = u.id_usuario
      JOIN Cursos c ON i.id_curso = c.id_curso
      ORDER BY i.id_inscripcion DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al cargar las inscripciones' });
  }
});

// 3. Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor ERP corriendo en el puerto ${PORT}`);
});