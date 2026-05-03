import { useState, useEffect } from 'react'

function App() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [historial, setHistorial] = useState([]);
  
  const [carnetSeleccionado, setCarnetSeleccionado] = useState('');
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [alerta, setAlerta] = useState(null);

  const API_URL = 'https://miniature-tribble-r47wxjx6g599hxrq5-3000.app.github.dev';

  const cargarDatos = () => {
    fetch(`${API_URL}/api/estudiantes`).then(res => res.json()).then(data => setEstudiantes(data));
    fetch(`${API_URL}/api/cursos`).then(res => res.json()).then(data => setCursos(data));
    fetch(`${API_URL}/api/inscripciones`).then(res => res.json()).then(data => setHistorial(data));
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const manejarInscripcion = async (e) => {
    e.preventDefault();
    if (!carnetSeleccionado || !cursoSeleccionado) {
      setAlerta({ tipo: 'error', texto: 'Por favor selecciona un estudiante y un curso.' });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/inscripciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carnet_estudiante: carnetSeleccionado, id_curso: cursoSeleccionado })
      });

      const data = await response.json();

      if (!response.ok) {
        setAlerta({ tipo: 'error', texto: data.error });
      } else {
        setAlerta({ tipo: 'exito', texto: data.mensaje });
        cargarDatos(); // Recarga la tabla de abajo automáticamente
        setCursoSeleccionado(''); // Limpia el formulario
      }
    } catch (error) {
      setAlerta({ tipo: 'error', texto: 'Error de conexión con el servidor.' });
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Sección Superior: Formulario */}
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h2 style={{ color: '#1f2937', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px' }}>Inscripción de Estudiantes</h2>
          
          {alerta && (
            <div style={{ padding: '10px', marginTop: '15px', borderRadius: '6px', backgroundColor: alerta.tipo === 'error' ? '#fee2e2' : '#dcfce3', color: alerta.tipo === 'error' ? '#991b1b' : '#166534' }}>
              {alerta.texto}
            </div>
          )}

          <form onSubmit={manejarInscripcion} style={{ marginTop: '20px', display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#4b5563', fontSize: '14px' }}>Estudiante</label>
              <select value={carnetSeleccionado} onChange={(e) => setCarnetSeleccionado(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="">Seleccionar estudiante...</option>
                {estudiantes.map(est => <option key={est.carnet} value={est.carnet}>{est.nombre}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#4b5563', fontSize: '14px' }}>Curso</label>
              <select value={cursoSeleccionado} onChange={(e) => setCursoSeleccionado(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="">Seleccionar curso...</option>
                {cursos.map(curso => <option key={curso.id_curso} value={curso.id_curso}>{curso.nombre}</option>)}
              </select>
            </div>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '42px' }}>
              Inscribir
            </button>
          </form>
        </div>

        {/* Sección Inferior: Historial */}
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#1f2937', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', marginTop: 0 }}>Todas las Inscripciones</h3>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '15px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px', color: '#4b5563' }}>Estudiante</th>
                <th style={{ padding: '12px', color: '#4b5563' }}>Curso</th>
                <th style={{ padding: '12px', color: '#4b5563' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((reg) => (
                <tr key={reg.id_inscripcion} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>{reg.estudiante}</td>
                  <td style={{ padding: '12px' }}>{reg.curso}</td>
                  <td style={{ padding: '12px' }}>{new Date(reg.fecha).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}

export default App