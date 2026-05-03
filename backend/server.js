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



// RUTA DE REGISTRO
app.post('/api/registro', async (req, res) => {
  const { nombre, correo, password } = req.body;

  try {
    // 1. Validar si el correo está en la lista de la institución
    const [autorizado] = await pool.query('SELECT * FROM Autorizaciones WHERE correo = ?', [correo]);

    if (autorizado.length === 0) {
      return res.status(403).json({ error: 'Este correo no está autorizado por la institución.' });
    }

    const rol = autorizado[0].rol_asignado;

    // 2. Crear el Usuario base
    const [result] = await pool.query(
      'INSERT INTO Usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, correo, password, rol]
    );

    const idUsuario = result.insertId;

    // 3. Crear el registro específico según el rol
    if (rol === 'ESTUDIANTE') {
      const carnetGen = `2026-${Math.floor(1000 + Math.random() * 9000)}`;
      await pool.query('INSERT INTO Estudiantes (carnet, id_usuario) VALUES (?, ?)', [carnetGen, idUsuario]);
    } else {
      await pool.query('INSERT INTO Docentes (id_usuario, especialidad) VALUES (?, ?)', [idUsuario, 'General']);
    }

    res.status(201).json({ mensaje: `Usuario ${rol} creado exitosamente.` });
  } catch (error) {
    res.status(500).json({ error: 'El correo ya tiene una cuenta activa o hubo un error interno.' });
  }
});

// RUTA DE LOGIN
app.post('/api/login', async (req, res) => {
  const { correo, password } = req.body;
  try {
    const [user] = await pool.query(
      'SELECT u.id_usuario, u.nombre, u.rol, e.carnet FROM Usuarios u LEFT JOIN Estudiantes e ON u.id_usuario = e.id_usuario WHERE u.correo = ? AND u.password = ?',
      [correo, password]
    );

    if (user.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    res.json(user[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor.' });
  }
});

// GET: Obtener cursos asignados a un docente específico
app.get('/api/docente/:id_usuario/cursos', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT c.id_curso, c.nombre 
      FROM AsignacionesDocentes ad
      JOIN Cursos c ON ad.id_curso = c.id_curso
      JOIN Docentes d ON ad.id_docente = d.id_docente
      WHERE d.id_usuario = ?`, [id_usuario]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cursos del docente' });
  }
});

// GET: Obtener alumnos inscritos en un curso específico para que el docente los califique
app.get('/api/cursos/:id_curso/estudiantes', async (req, res) => {
  const { id_curso } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT i.id_inscripcion, u.nombre, i.carnet_estudiante, i.nota
      FROM Inscripciones i
      JOIN Estudiantes e ON i.carnet_estudiante = e.carnet
      JOIN Usuarios u ON e.id_usuario = u.id_usuario
      WHERE i.id_curso = ?`, [id_curso]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener alumnos' });
  }
});

// PUT: Guardar la nota de un estudiante
app.put('/api/inscripciones/:id/nota', async (req, res) => {
  const { id } = req.params;
  const { nota } = req.body;
  try {
    await pool.query('UPDATE Inscripciones SET nota = ?, estado = "FINALIZADA" WHERE id_inscripcion = ?', [nota, id]);
    res.json({ mensaje: 'Nota guardada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar la nota' });
  }
});

// 3. Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor ERP corriendo en el puerto ${PORT}`);
});