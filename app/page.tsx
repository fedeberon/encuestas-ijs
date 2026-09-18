"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { SurveyBarChart } from "./components/SurveyBarChart";

const interestAreas = [
  "Tecnología y creatividad digital",
  "Seguridad laboral y medio ambiente",
  "Imágenes médicas y diagnóstico",
  "Comunicación, diseño y redes sociales",
  "Gastronomía y cocina",
] as const;

const careerTopics = [
  "Análisis de Datos e Inteligencia Artificial",
  "Laboratorio de Análisis Clínicos",
  "Prácticas Deportivas",
  "Marketing",
  "Comunicación Social para el Desarrollo",
  "Diseño, Imagen y Sonido",
  "Radio y Televisión",
  "Tiempo Libre y Recreación",
  "Gastronomía",
] as const;

const careerValues = [
  "Rápida salida laboral",
  "Posibilidad de seguir estudiando después",
  "Formación práctica desde el primer año",
  "Tecnología y equipamiento moderno",
  "Trabajo en equipo y creatividad",
  "Ayudar a las personas / trabajar en salud",
  "Flexibilidad para trabajar y estudiar",
] as const;

const allSelections = [...interestAreas, ...careerTopics, ...careerValues] as const;
type Selection = (typeof allSelections)[number];
type SelectedState = Record<Selection, boolean>;

const emptySelections = (): SelectedState =>
  Object.fromEntries(allSelections.map((option) => [option, false])) as SelectedState;

const groups = [
  { number: "01", title: "Áreas de interés", options: interestAreas },
  { number: "02", title: "Carreras / temas de interés", options: careerTopics },
  { number: "03", title: "Qué valora en una carrera", options: careerValues },
] as const;

type View = "carga" | "resultados" | "estadisticas" | "exportar" | "configuracion";
type SurveyData = { headers: string[]; rows: string[][] };
type StatsData = {
  total: number;
  areas: { label: string; count: number }[];
  carreras: { label: string; count: number }[];
  valora: { label: string; count: number }[];
  contact: Record<string, number>;
  visit: Record<string, number>;
};

const viewCopy: Record<View, { title: string; subtitle: string }> = {
  carga: { title: "Carga de encuestas", subtitle: "Ingresá las respuestas de las encuestas realizadas en papel." },
  resultados: { title: "Resultados de encuestas", subtitle: "Consultá y buscá las respuestas cargadas en Google Sheets." },
  estadisticas: { title: "Estadísticas", subtitle: "Visualizá los principales indicadores de las encuestas." },
  exportar: { title: "Exportar datos", subtitle: "Descargá una copia de las respuestas para trabajarla localmente." },
  configuracion: { title: "Configuración", subtitle: "Información de la conexión con el Spreadsheet." },
};

function OptionGroup({
  number,
  title,
  options,
  selected,
  onToggle,
}: {
  number: string;
  title: string;
  options: readonly Selection[];
  selected: SelectedState;
  onToggle: (option: Selection) => void;
}) {
  return (
    <section className="panel option-group" aria-labelledby={`group-${number}`}>
      <div className="section-heading">
        <span className="section-number">{number}</span>
        <h2 id={`group-${number}`}>{title}</h2>
      </div>
      <div className="options-grid">
        {options.map((option) => (
          <label className={`option ${selected[option] ? "option-selected" : ""}`} key={option}>
            <input
              type="checkbox"
              checked={selected[option]}
              onChange={() => onToggle(option)}
            />
            <span className="checkmark" aria-hidden="true" />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function LoginScreen({ onLogin }: { onLogin: (user: { name: string; role: string }) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; user?: { name: string; role: string } };
      if (!response.ok || !result.user) throw new Error(result.error || "No se pudo iniciar sesión.");
      onLogin(result.user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-card">
        <Image className="login-logo" src="/logo-instituto.png" alt="Instituto Jesús Sacramentado" width={125} height={150} priority />
        <p className="login-kicker">DATA ENTRY</p>
        <h1>Ingresar al sistema</h1>
        <p className="login-subtitle">Carga y consulta de encuestas institucionales.</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="field" htmlFor="login-username"><span>Usuario</span><input id="login-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoFocus placeholder="Ingresá tu usuario" /></label>
          <label className="field" htmlFor="login-password"><span>Contraseña</span><input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Ingresá tu contraseña" /></label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="primary-button login-button" type="submit" disabled={isLoading}>{isLoading ? "INGRESANDO..." : "INGRESAR"}</button>
        </form>
      </section>
    </main>
  );
}

export default function Home() {
  const [institution, setInstitution] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [selected, setSelected] = useState<SelectedState>(emptySelections);
  const [contact, setContact] = useState("");
  const [visit, setVisit] = useState("");
  const [count, setCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeView, setActiveView] = useState<View>("carga");
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [search, setSearch] = useState("");
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedInstitution = window.localStorage.getItem("encuesta-institution");
    if (savedInstitution) window.requestAnimationFrame(() => setInstitution(savedInstitution));
    fetch("/api/auth/me")
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as { user?: { name: string; role: string } };
        if (!response.ok || !result.user) return setAuthStatus("unauthenticated");
        setCurrentUser(result.user);
        setAuthStatus("authenticated");
      })
      .catch(() => setAuthStatus("unauthenticated"));
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") nameRef.current?.focus();
  }, [authStatus]);

  useEffect(() => {
    if (institution.trim()) window.localStorage.setItem("encuesta-institution", institution);
  }, [institution]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const clearSelections = () => {
    setSelected(emptySelections());
    setContact("");
    setVisit("");
  };

  const clearForm = () => {
    setName("");
    setSurname("");
    clearSelections();
    setFeedback(null);
    nameRef.current?.focus();
  };

  const toggleSelection = (option: Selection) => {
    setSelected((current) => ({ ...current, [option]: !current[option] }));
  };

  const loadData = async (view: View) => {
    setActiveView(view);
    if (view === "carga" || view === "configuracion" || (view === "exportar" && surveyData)) return;
    setIsLoadingData(true);
    setDataError("");
    try {
      const action = view === "estadisticas" ? "stats" : "surveys";
      const response = await fetch(`/api/surveys?action=${action}`, { cache: "no-store" });
      const result = (await response.json().catch(() => ({}))) as SurveyData & { stats?: StatsData; error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudieron leer los datos");
      if (action === "stats") {
        if (!result.stats) throw new Error("La respuesta de estadísticas es inválida.");
        setStatsData(result.stats);
      } else {
        setSurveyData(result);
      }
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "No se pudieron leer los datos");
    } finally {
      setIsLoadingData(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!surveyData) return [];
    const term = search.trim().toLowerCase();
    if (!term) return surveyData.rows;
    return surveyData.rows.filter((row) => row.slice(0, 4).join(" ").toLowerCase().includes(term));
  }, [search, surveyData]);

  const exportCsv = () => {
    if (!surveyData) return;
    const csv = [surveyData.headers, ...surveyData.rows]
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `encuestas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setAuthStatus("unauthenticated");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      clearSelections();
      setFeedback({ type: "success", message: "Selecciones limpiadas" });
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (!isSaving) event.currentTarget.requestSubmit();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    const institutionValue = institution.trim();
    const nameValue = name.trim();
    const surnameValue = surname.trim();
    if (!institutionValue || !nameValue || !surnameValue) {
      setFeedback({ type: "error", message: "Completá institución, nombre y apellido" });
      if (!institutionValue) document.getElementById("institution")?.focus();
      else if (!nameValue) nameRef.current?.focus();
      else document.getElementById("surname")?.focus();
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution: institutionValue,
          name: nameValue,
          surname: surnameValue,
          selected,
          contact,
          visit,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la encuesta");

      setCount((current) => current + 1);
      setName("");
      setSurname("");
      clearSelections();
      setFeedback({ type: "success", message: "Encuesta guardada" });
      window.requestAnimationFrame(() => nameRef.current?.focus());
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo guardar. Intentá nuevamente.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authStatus === "loading") {
    return <main className="login-shell"><div className="login-loading">Verificando sesión...</div></main>;
  }

  if (authStatus === "unauthenticated") {
    return <LoginScreen onLogin={(user) => { setCurrentUser(user); setAuthStatus("authenticated"); }} />;
  }

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <div className="brand-lockup">
          <Image className="brand-logo" src="/logo-instituto.png" alt="Logo Instituto Jesús Sacramentado" width={46} height={58} priority />
          <div>
            <strong>Instituto</strong>
            <strong>Jesús Sacramentado</strong>
            <span>Nivel Superior</span>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          <button className={`nav-item ${activeView === "carga" ? "nav-item-active" : "nav-item-muted"}`} type="button" onClick={() => loadData("carga")}>
            <span className="nav-icon" aria-hidden="true">↗</span>
            <span>Cargar encuesta</span>
          </button>
          <button className={`nav-item ${activeView === "resultados" ? "nav-item-active" : "nav-item-muted"}`} type="button" onClick={() => loadData("resultados")}>
            <span className="nav-icon" aria-hidden="true">▥</span>
            <span>Resultados</span>
          </button>
          <button className={`nav-item ${activeView === "estadisticas" ? "nav-item-active" : "nav-item-muted"}`} type="button" onClick={() => loadData("estadisticas")}>
            <span className="nav-icon" aria-hidden="true">▥</span>
            <span>Estadísticas</span>
          </button>
          <button className={`nav-item ${activeView === "exportar" ? "nav-item-active" : "nav-item-muted"}`} type="button" onClick={() => loadData("exportar")}>
            <span className="nav-icon" aria-hidden="true">⇧</span>
            <span>Exportar</span>
          </button>
          <button className={`nav-item ${activeView === "configuracion" ? "nav-item-active" : "nav-item-muted"}`} type="button" onClick={() => loadData("configuracion")}>
            <span className="nav-icon" aria-hidden="true">⚙</span>
            <span>Configuración</span>
          </button>
        </nav>
        <div className="sidebar-user"><span className="user-avatar">{currentUser?.name?.slice(0, 1).toUpperCase() || "U"}</span><div><strong>{currentUser?.name || "Usuario"}</strong><span>{currentUser?.role || "Carga"}</span></div><button type="button" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión">↪</button></div>
        <div className="sidebar-footer">Carga manual<br /><span>Panel operativo</span></div>
      </aside>

      <section className="workspace" id="carga">
        <header className="topbar">
          <div>
            <p className="breadcrumb">Inicio <span>/</span> {viewCopy[activeView].title}</p>
            <h1>{viewCopy[activeView].title}</h1>
            <p className="page-subtitle">{viewCopy[activeView].subtitle}</p>
          </div>
          <div className="session-counter" id="sesion" aria-live="polite">
            <span className="counter-icon" aria-hidden="true">▣</span>
            <div><span>Encuestas cargadas</span><strong>{count}</strong></div>
          </div>
        </header>

        {activeView === "carga" ? (
          <form className="entry-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <section className="panel respondent-panel">
          <div className="section-heading respondent-heading">
            <span className="section-number">00</span>
            <div>
              <h2>Datos del encuestado</h2>
              <p>Completá los datos tal como aparecen en la encuesta en papel.</p>
            </div>
          </div>
          <div className="respondent-fields">
            <label className="field institution-field" htmlFor="institution">
              <span>Institución <em>*</em></span>
              <input
                id="institution"
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                placeholder="Institución / sede"
                autoComplete="organization"
              />
              <small>Se conserva para la próxima encuesta</small>
            </label>
            <label className="field" htmlFor="name">
              <span>Nombre <em>*</em></span>
              <input
                ref={nameRef}
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nombre"
                autoComplete="given-name"
              />
            </label>
            <label className="field" htmlFor="surname">
              <span>Apellido <em>*</em></span>
              <input
                id="surname"
                value={surname}
                onChange={(event) => setSurname(event.target.value)}
                placeholder="Apellido"
                autoComplete="family-name"
              />
            </label>
          </div>
        </section>

        <div className="groups-grid">
          {groups.map((group) => (
            <OptionGroup key={group.number} {...group} selected={selected} onToggle={toggleSelection} />
          ))}
        </div>

        <div className="bottom-grid">
          <section className="panel radio-panel">
            <div className="section-heading">
              <span className="section-number">04</span>
              <h2>Contacto</h2>
            </div>
            <div className="radio-options">
              {["WhatsApp", "Correo", "No desea contacto"].map((option) => (
                <label className="radio-option" key={option}>
                  <input type="radio" name="contact" value={option} checked={contact === option} onChange={() => setContact(option)} />
                  <span className="radio-mark" aria-hidden="true" />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </section>
          <section className="panel radio-panel">
            <div className="section-heading">
              <span className="section-number">05</span>
              <h2>Jornada informativa</h2>
            </div>
            <div className="radio-options radio-options-short">
              {["Sí", "No"].map((option) => (
                <label className="radio-option" key={option}>
                  <input type="radio" name="visit" value={option} checked={visit === option} onChange={() => setVisit(option)} />
                  <span className="radio-mark" aria-hidden="true" />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <footer className="form-footer">
          <div className="shortcut-hints">
            <span><kbd>⌘</kbd><kbd>↵</kbd> guardar</span>
            <span><kbd>esc</kbd> limpiar selecciones</span>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={clearForm}>Limpiar formulario</button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? <><span className="button-spinner" /> Guardando...</> : <>GUARDAR Y CARGAR SIGUIENTE <span aria-hidden="true">↗</span></>}
            </button>
          </div>
        </footer>
          </form>
        ) : (
          <div className="dashboard-view">
            {isLoadingData && <div className="panel loading-panel"><Image src="/loading.svg" alt="" width={78} height={78} priority /><div><strong>Leyendo datos</strong><span>Conectando con el Spreadsheet...</span></div></div>}
            {dataError && <div className="panel data-error" role="alert">{dataError}</div>}

            {!isLoadingData && !dataError && activeView === "resultados" && surveyData && (
              <section className="panel data-panel">
                <div className="data-panel-header">
                  <div><h2>Detalle de respuestas</h2><p>{filteredRows.length} de {surveyData.rows.length} encuestas</p></div>
                  <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por institución, nombre o apellido..." aria-label="Buscar encuestas" />
                </div>
                <div className="table-scroll">
                  <table className="results-table">
                    <thead><tr><th>#</th><th>Institución</th><th>Nombre</th><th>Apellido</th><th>Áreas de interés</th><th>Carreras</th><th>Contacto</th><th>Jornada</th><th>Fecha</th></tr></thead>
                    <tbody>
                      {filteredRows.map((row, index) => {
                        const areas = row.slice(4, 9).map((value, optionIndex) => value ? interestAreas[optionIndex] : "").filter(Boolean).join(", ");
                        const careers = row.slice(9, 18).map((value, optionIndex) => value ? careerTopics[optionIndex] : "").filter(Boolean).join(", ");
                        return <tr key={`${row[0]}-${row[1]}-${index}`}><td>{index + 1}</td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td>{areas || "—"}</td><td>{careers || "—"}</td><td>{row[25] || "—"}</td><td>{row[26] || "—"}</td><td>{row[0]}</td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredRows.length === 0 && <p className="empty-state">No hay encuestas que coincidan con la búsqueda.</p>}
              </section>
            )}

            {!isLoadingData && !dataError && activeView === "estadisticas" && statsData && (
              <div className="stats-dashboard">
                <div className="stat-card stat-card-blue"><span className="stat-symbol">◉</span><div><strong>{statsData.total}</strong><span>Encuestas cargadas</span></div></div>
                <div className="stat-card stat-card-green"><span className="stat-symbol">▥</span><div><strong>{Object.keys(statsData.contact).length}</strong><span>Canales de contacto</span></div></div>
                <section className="panel chart-panel"><h2>Áreas de mayor interés</h2><SurveyBarChart title="Áreas de mayor interés" items={statsData.areas} color="#378fe7" /></section>
                <section className="panel chart-panel"><h2>Carreras de mayor interés</h2><SurveyBarChart title="Carreras de mayor interés" items={statsData.carreras} color="#26a878" /></section>
                <section className="panel chart-panel"><h2>Qué valoran en una carrera</h2><SurveyBarChart title="Qué valoran en una carrera" items={statsData.valora} color="#f0a72b" /></section>
                <section className="panel chart-panel compact-stats"><h2>Contacto</h2>{Object.entries(statsData.contact).map(([label, value]) => <div className="summary-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}<h2 className="secondary-heading">Jornada informativa</h2>{Object.entries(statsData.visit).map(([label, value]) => <div className="summary-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
              </div>
            )}

            {activeView === "exportar" && (
              <section className="panel action-panel"><div className="action-icon">⇩</div><h2>Exportar respuestas</h2><p>Descargá todas las filas de la hoja Cargas en formato CSV, compatible con Excel y Google Sheets.</p><button className="primary-button" type="button" disabled={!surveyData || isLoadingData} onClick={exportCsv}>{surveyData ? `DESCARGAR ${surveyData.rows.length} ENCUESTAS` : "CARGAR DATOS PARA EXPORTAR"}</button></section>
            )}

            {activeView === "configuracion" && (
              <section className="panel settings-panel"><div className="settings-status"><span className="status-dot" /> Conexión configurada</div><h2>Google Sheets</h2><p>Los datos se leen desde la hoja <strong>Cargas</strong> mediante Google Apps Script. La URL permanece protegida en el servidor y no se expone al navegador.</p><dl><div><dt>Lectura</dt><dd>/api/surveys?action=surveys</dd></div><div><dt>Estadísticas</dt><dd>/api/surveys?action=stats</dd></div><div><dt>Guardado</dt><dd>/api/submit</dd></div></dl></section>
            )}
          </div>
        )}
      </section>

      {feedback && <div className={`toast toast-${feedback.type}`} role="status"><span>{feedback.type === "success" ? "✓" : "!"}</span>{feedback.message}</div>}
    </main>
  );
}
