"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

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
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedInstitution = window.localStorage.getItem("encuesta-institution");
    if (savedInstitution) window.requestAnimationFrame(() => setInstitution(savedInstitution));
    nameRef.current?.focus();
  }, []);

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

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">ISJ</div>
          <div>
            <strong>Instituto</strong>
            <strong>Jesús Sacramentado</strong>
            <span>Nivel Superior</span>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          <a className="nav-item nav-item-active" href="#carga">
            <span className="nav-icon" aria-hidden="true">↗</span>
            <span>Cargar encuesta</span>
          </a>
          <a className="nav-item nav-item-muted" href="#sesion">
            <span className="nav-icon" aria-hidden="true">▥</span>
            <span>Resultados</span>
          </a>
          <a className="nav-item nav-item-muted" href="#sesion">
            <span className="nav-icon" aria-hidden="true">▥</span>
            <span>Estadísticas</span>
          </a>
          <a className="nav-item nav-item-muted" href="#sesion">
            <span className="nav-icon" aria-hidden="true">⇧</span>
            <span>Exportar</span>
          </a>
          <a className="nav-item nav-item-muted" href="#sesion">
            <span className="nav-icon" aria-hidden="true">⚙</span>
            <span>Configuración</span>
          </a>
        </nav>
        <div className="sidebar-footer">Carga manual<br /><span>Panel operativo</span></div>
      </aside>

      <section className="workspace" id="carga">
        <header className="topbar">
          <div>
            <p className="breadcrumb">Inicio <span>/</span> Carga de encuesta</p>
            <h1>Carga de encuestas</h1>
            <p className="page-subtitle">Ingresá las respuestas de las encuestas realizadas en papel.</p>
          </div>
          <div className="session-counter" id="sesion" aria-live="polite">
            <span className="counter-icon" aria-hidden="true">▣</span>
            <div><span>Encuestas cargadas</span><strong>{count}</strong></div>
          </div>
        </header>

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
      </section>

      {feedback && <div className={`toast toast-${feedback.type}`} role="status"><span>{feedback.type === "success" ? "✓" : "!"}</span>{feedback.message}</div>}
    </main>
  );
}
