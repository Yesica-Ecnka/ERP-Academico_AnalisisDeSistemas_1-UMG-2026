import { useState, useEffect } from 'react';

// --- COMPONENTE DE LOGIN ---
function LoginForm({ onLogin, error }) {
  const [correo, setCorreo] = useState('');
  const [pass, setPass] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(correo, pass);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '2rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#4f46e5' }}>Sistema ERP Académico</h2>
      {error && <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', textAlign: 'center', fontSize: '14px' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Correo Institucional" value={correo} onChange={e => setCorreo(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd' }} required />
        <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #ddd' }} required />
        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Ingresar</button>
      </form>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
function App() {
  const [usuario, setUsuario] = useState(null);
  const [errorLogin, setErrorLogin] = useState(null);
  const API_URL = 'https://miniature-tribble-r47wxjx6g599hxrq5-3000.app.github.dev';

  // --- ESTADOS: ESTUDIANTE ---
  const [cursos, setCursos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [alerta, setAlerta] = useState(null);

  // --- ESTADOS: DOCENTE (LOS QUE FALTABAN) ---
  const [cursosDocente, setCursosDocente] = useState([]);
  const [cursoActivo, setCursoActivo] = useState(null);
  const [alumnosCurso, setAlumnosCurso] = useState([]);

  // --- FUNCIONES DE CARGA DE DATOS ---
  const cargarDatosEstudiante = () => {
    fetch(`${API_URL}/api/cursos`).then(res => res.json()).then(data => setCursos(data));
    fetch(`${API_URL}/api/inscripciones`).then(res => res.json()).then(data => {
        const miHistorial = data.filter(reg => reg.estudiante === usuario.nombre);
        setHistorial(miHistorial);
    });
  };

  const cargarCursosDocente = async (id_usuario) => {
    try {
      const res = await fetch(`${API_URL}/api/docente/${id_usuario}/cursos`);
      const data = await res.json();
      setCursosDocente(data);
    } catch (error) {
      console.error("Error al cargar cursos del docente", error);
    }
  };

  const cargarAlumnosCurso = async (id_curso) => {
    try {
      const res = await fetch(`${API_URL}/api/cursos/${id_curso}/estudiantes`);
      const data = await res.json();
      setAlumnosCurso(data);
    } catch (error) {
      console.error("Error al cargar alumnos", error);
    }
  };

  // --- EFECTOS (Se disparan automáticamente) ---
  useEffect(() => {
    if (usuario) {
      if (usuario.rol === 'ESTUDIANTE') {
        cargarDatosEstudiante();
      } else if (usuario.rol === 'DOCENTE') {
        cargarCursosDocente(usuario.id_usuario);
      }
    }
  }, [usuario]);

  useEffect(() => {
    // Si el docente selecciona un curso, cargamos sus alumnos
    if (cursoActivo) {
      cargarAlumnosCurso(cursoActivo.id_curso);
    }
  }, [cursoActivo]);

  // --- LÓGICA DE LOGIN ---
  const login = async (correo, password) => {
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password })
      });
      const data = await res.json();
      if (res.ok) {
        setUsuario(data);
        setErrorLogin(null);
      } else {
        setErrorLogin(data.error); 
      }
    } catch (err) {
      setErrorLogin('Error de conexión con el servidor.');
    }
  };

  // --- LÓGICA DE ESTUDIANTE: INSCRIBIRSE ---
  const manejarInscripcion = async (e) => {
    e.preventDefault();
    if (!cursoSeleccionado) {
      setAlerta({ tipo: 'error', texto: 'Por favor selecciona un curso.' });
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/inscripciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carnet_estudiante: usuario.carnet, id_curso: cursoSeleccionado })
      });
      const data = await response.json();
      if (!response.ok) {
        setAlerta({ tipo: 'error', texto: data.error });
      } else {
        setAlerta({ tipo: 'exito', texto: data.mensaje });
        cargarDatosEstudiante(); 
        setCursoSeleccionado('');
      }
    } catch (error) {
      setAlerta({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  // --- LÓGICA DE DOCENTE: GUARDAR NOTA ---
  const guardarNota = async (id_inscripcion) => {
    // Capturamos el valor del input directamente por su ID
    const notaValor = document.getElementById(`nota-${id_inscripcion}`).value;
    
    try {
      const response = await fetch(`${API_URL}/api/inscripciones/${id_inscripcion}/nota`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nota: notaValor })
      });
      
      if (response.ok) {
        alert("Nota guardada y estado actualizado a FINALIZADA.");
        cargarAlumnosCurso(cursoActivo.id_curso); // Recargamos para ver los cambios
      } else {
        alert("Hubo un problema al guardar la nota.");
      }
    } catch (error) {
      alert("Error de conexión al servidor.");
    }
  };

  // Si no hay usuario, mostramos el login
  if (!usuario) return <LoginForm onLogin={login} error={errorLogin} />;

  // Si ya ingresó, mostramos la plataforma
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'white', marginBottom: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <span>Bienvenido, <b>{usuario.nombre}</b> ({usuario.rol})</span>
        <button onClick={() => { setUsuario(null); setErrorLogin(null); setAlerta(null); setCursoActivo(null); }} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Cerrar Sesión</button>
      </nav>

      {/* VISTA DEL ESTUDIANTE */}
      {usuario.rol === 'ESTUDIANTE' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
            <h2 style={{ color: '#1f2937', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px' }}>Inscripción de Cursos</h2>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Tu carnet asignado es: <b>{usuario.carnet}</b></p>
            {alerta && <div style={{ padding: '10px', marginTop: '15px', borderRadius: '6px', backgroundColor: alerta.tipo === 'error' ? '#fee2e2' : '#dcfce3', color: alerta.tipo === 'error' ? '#991b1b' : '#166534' }}>{alerta.texto}</div>}
            <form onSubmit={manejarInscripcion} style={{ marginTop: '20px', display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#4b5563', fontSize: '14px' }}>Seleccionar Curso</label>
                <select value={cursoSeleccionado} onChange={(e) => setCursoSeleccionado(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                  <option value="">Seleccionar curso...</option>
                  {cursos.map(curso => <option key={curso.id_curso} value={curso.id_curso}>{curso.nombre}</option>)}
                </select>
              </div>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '42px' }}>Inscribirme</button>
            </form>
          </div>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#1f2937', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', marginTop: 0 }}>Mis Inscripciones</h3>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '15px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', color: '#4b5563' }}>Curso</th>
                  <th style={{ padding: '12px', color: '#4b5563' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((reg) => (
                  <tr key={reg.id_inscripcion} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>{reg.curso}</td>
                    <td style={{ padding: '12px' }}>{new Date(reg.fecha).toLocaleDateString()}</td>
                  </tr>
                ))}
                {historial.length === 0 && <tr><td colSpan="2" style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>No tienes cursos inscritos aún.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA DEL DOCENTE */}
      {usuario.rol === 'DOCENTE' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
            {/* Columna Izquierda: Mis Cursos */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0 }}>Mis Materias</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {cursosDocente.map(c => (
                  <li 
                    key={c.id_curso} 
                    onClick={() => setCursoActivo(c)}
                    style={{ padding: '10px', cursor: 'pointer', borderRadius: '6px', backgroundColor: cursoActivo?.id_curso === c.id_curso ? '#eef2ff' : 'transparent', color: cursoActivo?.id_curso === c.id_curso ? '#4f46e5' : '#4b5563', fontWeight: cursoActivo?.id_curso === c.id_curso ? 'bold' : 'normal', marginBottom: '5px' }}
                  >
                    {c.nombre}
                  </li>
                ))}
              </ul>
            </div>

            {/* Columna Derecha: Listado de Alumnos y Notas */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              {cursoActivo ? (
                <>
                  <h3 style={{ marginTop: 0 }}>Alumnos en {cursoActivo.nombre}</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f3f4f6', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Estudiante</th>
                        <th style={{ padding: '10px' }}>Nota</th>
                        <th style={{ padding: '10px' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumnosCurso.map(a => (
                        <tr key={a.id_inscripcion} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '10px' }}>{a.nombre} <br/><small>{a.carnet_estudiante}</small></td>
                          <td style={{ padding: '10px' }}>
                            <input 
                              type="number" 
                              defaultValue={a.nota} 
                              id={`nota-${a.id_inscripcion}`}
                              style={{ width: '80px', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                          </td>
                          <td style={{ padding: '10px' }}>
                            <button 
                              onClick={() => guardarNota(a.id_inscripcion)}
                              style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Guardar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {alumnosCurso.length === 0 && (
                        <tr><td colSpan="3" style={{ padding: '10px', textAlign: 'center', color: '#9ca3af' }}>No hay estudiantes inscritos.</td></tr>
                      )}
                    </tbody>
                  </table>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '40px' }}>
                  Selecciona una materia para ver el listado de alumnos y registrar notas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;