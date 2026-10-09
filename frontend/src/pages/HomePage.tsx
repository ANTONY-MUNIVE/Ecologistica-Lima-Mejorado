export function HomePage() {
  return (
    <section className="home-page" aria-labelledby="home-title">
      <div className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Panel operativo · Sprint 2</p>
          <h1 id="home-title">Rutas sostenibles para Lima</h1>
          <p className="lead">
            Planifica entregas con una vista clara de tu operación y prepara
            decisiones de ruta más eficientes para DistriRápido.
          </p>
          <div className="status" role="status">
            <span className="status-marker" aria-hidden="true" />
            Aplicación iniciada correctamente
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <span className="route-line route-line-one" />
          <span className="route-line route-line-two" />
          <span className="route-point route-point-start" />
          <span className="route-point route-point-middle" />
          <span className="route-point route-point-end" />
          <span className="hero-badge">Lima Este</span>
        </div>
      </div>

      <div className="home-section-heading">
        <div>
          <p className="eyebrow">Módulos disponibles</p>
          <h2>Una operación conectada</h2>
        </div>
        <p>Gestiona cada etapa desde un mismo lugar.</p>
      </div>
      <div className="feature-grid">
        <article className="feature-card">
          <span className="feature-index">01</span>
          <h3>Gestión operativa</h3>
          <p>Administra pedidos, vehículos, conductores y preferencias de entrega.</p>
        </article>
        <article className="feature-card feature-card-highlight">
          <span className="feature-index">02</span>
          <h3>Rutas sostenibles</h3>
          <p>Prepara una planificación que considera capacidad, tiempos y emisiones.</p>
        </article>
        <article className="feature-card">
          <span className="feature-index">03</span>
          <h3>Seguimiento claro</h3>
          <p>Consulta el itinerario y comunica alertas relevantes durante la jornada.</p>
        </article>
      </div>
    </section>
  )
}
