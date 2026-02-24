import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

const C = {
  bg: "#F4F3EF", cd: "#FFF", ca: "#F9F8F5", bd: "#E8E5DE", bl: "#F0EDE6",
  tx: "#2D3436", tm: "#828A8F", tl: "#A8AEB3", ac: "#5B9A6F", as: "#E8F0EA",
  go: "#B8965A", sh: "0 1px 3px rgba(0,0,0,.04)",
  danger: "#D46A6A", warn: "#D4A06A", info: "#6B9BC3",
};

export default function InventoryManager({ items, centros }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterCentro, setFilterCentro] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [entryHistory, setEntryHistory] = useState(null);
  const [photoViewer, setPhotoViewer] = useState(null);

  // Form state
  const [formQty, setFormQty] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");
  const [formPhotos, setFormPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all entries from Supabase
  const fetchEntries = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const { data, error: fetchError } = await supabase
        .from("inventory_entries")
        .select("*, entry_photos(*)")
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      setEntries(data || []);
    } catch (err) {
      console.error("Error fetching entries:", err);
      setError("Error al cargar entradas: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Calculate received quantities per item_code
  const receivedByItem = {};
  entries.forEach((e) => {
    const key = e.item_code + "|" + e.centro_consumo;
    receivedByItem[key] = (receivedByItem[key] || 0) + e.quantity_received;
  });

  // Enrich items with received/pending data
  const enrichedItems = items.map((item) => {
    const key = item.ic + "|" + item.cc;
    const received = receivedByItem[key] || 0;
    const pending = Math.max(0, item.qty - received);
    const pct = item.qty > 0 ? Math.min(100, Math.round((received / item.qty) * 100)) : 0;
    return { ...item, received, pending, pct };
  });

  // Filter items
  const filtered = enrichedItems.filter((item) => {
    if (filterCentro && item.cc !== filterCentro) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        item.ic.toLowerCase().includes(term) ||
        item.desc.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Summary stats
  const totalExpected = filtered.reduce((s, i) => s + i.qty, 0);
  const totalReceived = filtered.reduce((s, i) => s + i.received, 0);
  const totalPending = filtered.reduce((s, i) => s + i.pending, 0);
  const completedItems = filtered.filter((i) => i.pct >= 100).length;

  // Open form for a specific item
  const openForm = (item) => {
    setSelectedItem(item);
    setFormQty("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setFormPhotos([]);
    setError(null);
    setShowForm(true);
  };

  // Upload photo to Supabase Storage
  const uploadPhoto = async (file) => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error: uploadError } = await supabase.storage
      .from("entry-photos")
      .upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage
      .from("entry-photos")
      .getPublicUrl(data.path);
    return { url: urlData.publicUrl, fileName: file.name };
  };

  // Submit new entry
  const handleSubmit = async () => {
    if (!selectedItem || !formQty || parseInt(formQty) <= 0) {
      setError("Ingresa una cantidad valida");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Supabase no esta configurado. Revisa las variables de entorno.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Insert entry
      const { data: entry, error: insertError } = await supabase
        .from("inventory_entries")
        .insert({
          item_code: selectedItem.ic,
          centro_consumo: selectedItem.cc,
          quantity_received: parseInt(formQty),
          received_date: formDate,
          notes: formNotes || null,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // Upload photos
      for (const file of formPhotos) {
        const { url, fileName } = await uploadPhoto(file);
        const { error: photoError } = await supabase.from("entry_photos").insert({
          entry_id: entry.id,
          photo_url: url,
          file_name: fileName,
        });
        if (photoError) console.error("Error saving photo ref:", photoError);
      }

      await fetchEntries();
      setShowForm(false);
      setSelectedItem(null);
    } catch (err) {
      console.error("Error submitting entry:", err);
      setError("Error al registrar entrada: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch entry history for a specific item
  const viewHistory = async (item) => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error: histError } = await supabase
        .from("inventory_entries")
        .select("*, entry_photos(*)")
        .eq("item_code", item.ic)
        .eq("centro_consumo", item.cc)
        .order("received_date", { ascending: false });
      if (histError) throw histError;
      setEntryHistory({ item, entries: data || [] });
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const StatusBadge = ({ pct }) => {
    const color = pct >= 100 ? C.ac : pct > 0 ? C.warn : C.tl;
    const label = pct >= 100 ? "Completo" : pct > 0 ? `${pct}%` : "Pendiente";
    return (
      <span style={{
        padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600,
        background: color + "18", color, border: "1px solid " + color + "30",
      }}>
        {label}
      </span>
    );
  };

  if (!isSupabaseConfigured()) {
    return (
      <div style={{ background: C.cd, borderRadius: 16, border: "1px solid " + C.bd, padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>Configuracion Requerida</div>
        <p style={{ color: C.tm, fontSize: 14, lineHeight: 1.6, maxWidth: 500, margin: "0 auto 20px" }}>
          Para usar el sistema de inventario necesitas configurar Supabase.
          Crea un archivo <code style={{ background: C.ca, padding: "2px 6px", borderRadius: 4 }}>.env</code> en
          la raiz del proyecto con:
        </p>
        <div style={{
          background: "#1a1a2e", color: "#e0e0e0", padding: 20, borderRadius: 12, textAlign: "left",
          fontFamily: "monospace", fontSize: 13, lineHeight: 1.8, maxWidth: 460, margin: "0 auto",
        }}>
          VITE_SUPABASE_URL=https://tu-proyecto.supabase.co<br />
          VITE_SUPABASE_ANON_KEY=tu-anon-key
        </div>
        <p style={{ color: C.tl, fontSize: 12, marginTop: 16 }}>
          Consulta el archivo <code style={{ background: C.ca, padding: "2px 6px", borderRadius: 4 }}>supabase-setup.sql</code> para crear las tablas necesarias.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Esperado", value: totalExpected.toLocaleString(), color: C.info },
          { label: "Recibido", value: totalReceived.toLocaleString(), color: C.ac },
          { label: "Pendiente", value: totalPending.toLocaleString(), color: C.warn },
          { label: "Items Completos", value: `${completedItems} / ${filtered.length}`, color: C.go },
        ].map((s) => (
          <div key={s.label} style={{
            background: C.cd, borderRadius: 12, border: "1px solid " + C.bd, padding: 16,
            boxShadow: C.sh,
          }}>
            <div style={{ fontSize: 11, color: C.tm, fontWeight: 500, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center",
      }}>
        <select
          value={filterCentro}
          onChange={(e) => setFilterCentro(e.target.value)}
          style={{
            padding: "8px 14px", borderRadius: 10, border: "1px solid " + C.bd, background: C.cd,
            fontSize: 13, color: C.tx, minWidth: 200, outline: "none",
          }}
        >
          <option value="">Todos los Centros</option>
          {centros.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
        </select>
        <input
          type="text"
          placeholder="Buscar por codigo o descripcion..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "8px 14px", borderRadius: 10, border: "1px solid " + C.bd, background: C.cd,
            fontSize: 13, color: C.tx, flex: 1, minWidth: 200, outline: "none",
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.tm }}>Cargando...</div>
      ) : (
        /* Items Table */
        <div style={{
          background: C.cd, borderRadius: 16, border: "1px solid " + C.bd, boxShadow: C.sh, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr 80px 80px 80px 140px 110px",
            background: C.ca, borderBottom: "1px solid " + C.bd, padding: "12px 16px",
            fontSize: 11, fontWeight: 600, color: C.tm, gap: 8,
          }}>
            <span>Codigo</span>
            <span>Descripcion</span>
            <span style={{ textAlign: "right" }}>Esperado</span>
            <span style={{ textAlign: "right" }}>Recibido</span>
            <span style={{ textAlign: "right" }}>Pendiente</span>
            <span style={{ textAlign: "center" }}>Progreso</span>
            <span style={{ textAlign: "center" }}>Acciones</span>
          </div>
          {/* Rows */}
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: C.tl }}>No se encontraron items</div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 1fr 80px 80px 80px 140px 110px",
                    padding: "10px 16px", borderBottom: "1px solid " + C.bl, fontSize: 12,
                    alignItems: "center", gap: 8,
                    background: item.pct >= 100 ? C.ac + "08" : "transparent",
                  }}
                >
                  <span style={{
                    fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: C.ac,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }} title={item.ic}>
                    {item.ic}
                  </span>
                  <div>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.desc}>
                      {item.desc}
                    </div>
                    <div style={{ fontSize: 10, color: C.tl, marginTop: 2 }}>{item.cc}</div>
                  </div>
                  <span style={{ textAlign: "right", fontWeight: 600 }}>{item.qty}</span>
                  <span style={{ textAlign: "right", fontWeight: 600, color: C.ac }}>{item.received}</span>
                  <span style={{
                    textAlign: "right", fontWeight: 600,
                    color: item.pending > 0 ? C.warn : C.ac,
                  }}>
                    {item.pending}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                    <div style={{
                      flex: 1, height: 6, borderRadius: 3, background: C.bl, overflow: "hidden",
                    }}>
                      <div style={{
                        width: item.pct + "%", height: "100%", borderRadius: 3,
                        background: item.pct >= 100 ? C.ac : item.pct > 50 ? C.warn : C.danger,
                        transition: "width 0.3s",
                      }} />
                    </div>
                    <StatusBadge pct={item.pct} />
                  </div>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                    <button
                      onClick={() => openForm(item)}
                      style={{
                        padding: "5px 10px", borderRadius: 8, border: "1px solid " + C.ac,
                        background: C.as, color: C.ac, fontSize: 11, fontWeight: 600,
                        cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      + Entrada
                    </button>
                    <button
                      onClick={() => viewHistory(item)}
                      style={{
                        padding: "5px 8px", borderRadius: 8, border: "1px solid " + C.bd,
                        background: C.ca, color: C.tm, fontSize: 11, cursor: "pointer",
                      }}
                      title="Ver historial"
                    >
                      Hist.
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Footer summary */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr 80px 80px 80px 140px 110px",
            background: C.ca, borderTop: "2px solid " + C.bd, padding: "12px 16px",
            fontSize: 12, fontWeight: 700, gap: 8,
          }}>
            <span style={{ color: C.go }}>TOTAL</span>
            <span style={{ color: C.tl }}>{filtered.length} items</span>
            <span style={{ textAlign: "right" }}>{totalExpected.toLocaleString()}</span>
            <span style={{ textAlign: "right", color: C.ac }}>{totalReceived.toLocaleString()}</span>
            <span style={{ textAlign: "right", color: C.warn }}>{totalPending.toLocaleString()}</span>
            <span style={{ textAlign: "center", color: C.tm }}>
              {totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0}% total
            </span>
            <span />
          </div>
        </div>
      )}

      {/* Entry Form Modal */}
      {showForm && selectedItem && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{
            background: C.cd, borderRadius: 20, padding: 28, width: "90%", maxWidth: 520,
            maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.15)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: C.tl, letterSpacing: 1, fontWeight: 500 }}>REGISTRAR ENTRADA</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{selectedItem.desc}</div>
                <div style={{ fontSize: 12, color: C.tm, marginTop: 2 }}>
                  {selectedItem.ic} | {selectedItem.cc}
                </div>
              </div>
              <button onClick={() => setShowForm(false)} style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid " + C.bd,
                background: C.ca, color: C.tm, fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>x</button>
            </div>

            {/* Current status */}
            <div style={{
              background: C.ca, borderRadius: 12, padding: 14, marginBottom: 18,
              border: "1px solid " + C.bl,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span>Esperado: <strong>{selectedItem.qty}</strong></span>
                <span style={{ color: C.ac }}>Recibido: <strong>{selectedItem.received}</strong></span>
                <span style={{ color: C.warn }}>Pendiente: <strong>{selectedItem.pending}</strong></span>
              </div>
              <div style={{
                height: 6, borderRadius: 3, background: C.bl, marginTop: 10, overflow: "hidden",
              }}>
                <div style={{
                  width: selectedItem.pct + "%", height: "100%", borderRadius: 3,
                  background: selectedItem.pct >= 100 ? C.ac : C.warn,
                }} />
              </div>
            </div>

            {/* Quantity */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.tm, display: "block", marginBottom: 6 }}>
                Cantidad Recibida *
              </label>
              <input
                type="number"
                min="1"
                value={formQty}
                onChange={(e) => setFormQty(e.target.value)}
                placeholder={`Max pendiente: ${selectedItem.pending}`}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid " + C.bd,
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Date */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.tm, display: "block", marginBottom: 6 }}>
                Fecha de Recepcion
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid " + C.bd,
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.tm, display: "block", marginBottom: 6 }}>
                Notas (opcional)
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Ej: Paquete en buenas condiciones, verificado con guia #123"
                rows={3}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid " + C.bd,
                  fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Photo Upload */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.tm, display: "block", marginBottom: 6 }}>
                Evidencia Fotografica (opcional)
              </label>
              <label style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: 20, borderRadius: 12, border: "2px dashed " + C.bd, background: C.ca,
                cursor: "pointer", transition: "border-color 0.2s",
              }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFormPhotos([...formPhotos, ...Array.from(e.target.files)])}
                  style={{ display: "none" }}
                />
                <div style={{ fontSize: 24, color: C.tl, marginBottom: 4 }}>+</div>
                <span style={{ fontSize: 12, color: C.tm }}>Haz clic para agregar fotos</span>
                <span style={{ fontSize: 10, color: C.tl, marginTop: 2 }}>JPG, PNG - Multiples archivos</span>
              </label>
              {formPhotos.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {formPhotos.map((file, idx) => (
                    <div key={idx} style={{
                      position: "relative", width: 72, height: 72, borderRadius: 8,
                      overflow: "hidden", border: "1px solid " + C.bd,
                    }}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <button
                        onClick={() => setFormPhotos(formPhotos.filter((_, i) => i !== idx))}
                        style={{
                          position: "absolute", top: 2, right: 2, width: 18, height: 18,
                          borderRadius: 9, background: "rgba(0,0,0,0.6)", color: "#fff",
                          border: "none", fontSize: 10, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div style={{
                background: C.danger + "12", border: "1px solid " + C.danger + "30",
                borderRadius: 10, padding: "10px 14px", marginBottom: 14,
                fontSize: 12, color: C.danger,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: "100%", padding: "12px 20px", borderRadius: 12, border: "none",
                background: submitting ? C.tl : C.ac, color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: submitting ? "default" : "pointer", transition: "background 0.2s",
              }}
            >
              {submitting ? "Registrando..." : "Registrar Entrada"}
            </button>
          </div>
        </div>
      )}

      {/* Entry History Modal */}
      {entryHistory && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={(e) => { if (e.target === e.currentTarget) setEntryHistory(null); }}>
          <div style={{
            background: C.cd, borderRadius: 20, padding: 28, width: "90%", maxWidth: 560,
            maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.15)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: C.tl, letterSpacing: 1, fontWeight: 500 }}>HISTORIAL DE ENTRADAS</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{entryHistory.item.desc}</div>
                <div style={{ fontSize: 12, color: C.tm, marginTop: 2 }}>
                  {entryHistory.item.ic} | {entryHistory.item.cc}
                </div>
              </div>
              <button onClick={() => setEntryHistory(null)} style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid " + C.bd,
                background: C.ca, color: C.tm, fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>x</button>
            </div>

            {/* Summary bar */}
            <div style={{
              background: C.ca, borderRadius: 12, padding: 14, marginBottom: 18,
              border: "1px solid " + C.bl,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span>Esperado: <strong>{entryHistory.item.qty}</strong></span>
                <span style={{ color: C.ac }}>Recibido: <strong>{entryHistory.item.received}</strong></span>
                <span style={{ color: C.warn }}>Pendiente: <strong>{entryHistory.item.pending}</strong></span>
              </div>
            </div>

            {entryHistory.entries.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: C.tl }}>
                No hay entradas registradas para este articulo
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {entryHistory.entries.map((entry) => (
                  <div key={entry.id} style={{
                    border: "1px solid " + C.bl, borderRadius: 12, padding: 14, background: C.ca,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 18, fontWeight: 700, color: C.ac }}>
                          +{entry.quantity_received}
                        </span>
                        <span style={{ fontSize: 12, color: C.tm, marginLeft: 8 }}>unidades</span>
                      </div>
                      <span style={{ fontSize: 12, color: C.tl }}>
                        {new Date(entry.received_date).toLocaleDateString("es-MX", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </span>
                    </div>
                    {entry.notes && (
                      <div style={{ fontSize: 12, color: C.tm, marginTop: 8, lineHeight: 1.5 }}>
                        {entry.notes}
                      </div>
                    )}
                    {entry.entry_photos && entry.entry_photos.length > 0 && (
                      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                        {entry.entry_photos.map((photo) => (
                          <div
                            key={photo.id}
                            onClick={() => setPhotoViewer(photo.photo_url)}
                            style={{
                              width: 56, height: 56, borderRadius: 8, overflow: "hidden",
                              border: "1px solid " + C.bd, cursor: "pointer",
                            }}
                          >
                            <img
                              src={photo.photo_url}
                              alt={photo.file_name || "Evidencia"}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {photoViewer && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100,
            cursor: "pointer",
          }}
          onClick={() => setPhotoViewer(null)}
        >
          <img
            src={photoViewer}
            alt="Evidencia"
            style={{ maxWidth: "90%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }}
          />
        </div>
      )}
    </div>
  );
}
