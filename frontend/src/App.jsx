import { useState, useEffect } from 'react'

function App() {
  // Aquí guardaremos los datos que vengan de la base de datos
  const [estudiantes, setEstudiantes] = useState([]);

  // useEffect hace que la llamada a la base de datos ocurra en cuanto la página cargue
  useEffect(() => {
    // IMPORTANTE: Esta es la URL de tu backend en el puerto 3000
    const backendUrl = 'https://miniature-tribble-r47wxjx6g599hxrq5-3000.app.github.dev/api/estudiantes';

    fetch(backendUrl)
      .then(response => response.json())
      .then(data => setEstudiantes(data))
      .catch(error => console.error("Error al cargar estudiantes:", error));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: '#4f46e5', textAlign: 'center' }}>Gestión de Estudiantes - ERP Académico</h1>
        
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px' }}>Carnet</th>
              <th style={{ padding: '12px' }}>Nombre</th>
              <th style={{ padding: '12px' }}>Correo</th>
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((estudiante) => (
              <tr key={estudiante.carnet} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{estudiante.carnet}</td>
                <td style={{ padding: '12px' }}>{estudiante.nombre}</td>
                <td style={{ padding: '12px' }}>{estudiante.correo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App