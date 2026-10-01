"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function YeniKalibrasyon() {
  const [form, setForm] = useState({
    device_name: "",
    serial_no: "",
    device_type: "",
    department: "",
    location: "",
    last_calibration_date: "",
    next_calibration_date: "",
    calibration_period_months: "12",
    certificate_no: "",
    supplier: "",
    responsible: "",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };
  const handleSubmit = async () => {
    if (!form.device_name) {
      alert("Lütfen cihaz adını girin.");
      return;
    }

    if (!form.next_calibration_date) {
      alert("Lütfen sonraki kalibrasyon tarihini girin.");
      return;
    }

    const nextDate = new Date(form.next_calibration_date);
    const today = new Date();

    const diffDays = Math.ceil(
      (nextDate.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    let status = "Geçerli";

    if (diffDays < 0) {
      status = "Süresi Geçmiş";
    } else if (diffDays <= 30) {
      status = "Yaklaşıyor";
    }

    const { error } = await supabase
      .from("calibrations")
      .insert({
        device_name: form.device_name,
        serial_no: form.serial_no || null,
        device_type: form.device_type || null,
        department: form.department || null,
        location: form.location || null,
        last_calibration_date:
          form.last_calibration_date || null,
        next_calibration_date:
          form.next_calibration_date || null,
        calibration_period_months:
          Number(form.calibration_period_months) || 12,
        status: status,
        certificate_no: form.certificate_no || null,
        supplier: form.supplier || null,
        responsible: form.responsible || null,
        notes: form.notes || null,
      });

    if (error) {
      console.error("CİHAZ KAYDEDİLEMEDİ:", error);
      alert("Cihaz kaydedilemedi. Console'u kontrol et.");
      return;
    }

    alert("Cihaz başarıyla kaydedildi.");

    window.location.href = "/kalibrasyon";
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "25px" }}>
          <p
            style={{
              color: "#64748b",
              fontSize: "13px",
              marginBottom: "8px",
            }}
          >
            Kalibrasyon / Yeni Cihaz
          </p>

          <h1
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: "28px",
            }}
          >
            Yeni Kalibrasyon Cihazı
          </h1>

          <p
            style={{
              color: "#64748b",
              marginTop: "8px",
            }}
          >
            Kalibrasyon takip sistemine yeni ölçüm cihazı ekleyin.
          </p>
        </div>

        {/* CİHAZ BİLGİLERİ */}

        <div style={cardStyle}>
          <h2 style={titleStyle}>Cihaz Bilgileri</h2>

          <div style={gridStyle}>
            <Field
              label="Cihaz Adı *"
              name="device_name"
              value={form.device_name}
              onChange={handleChange}
              placeholder="Örn. 30 Ton Çekme Test Cihazı"
            />

            <Field
              label="Seri No"
              name="serial_no"
              value={form.serial_no}
              onChange={handleChange}
              placeholder="Örn. CT-001"
            />

            <Field
              label="Cihaz Türü"
              name="device_type"
              value={form.device_type}
              onChange={handleChange}
              placeholder="Örn. Çekme Test Cihazı"
            />

            <Field
              label="Bölüm"
              name="department"
              value={form.department}
              onChange={handleChange}
              placeholder="Örn. Kalite"
            />

            <Field
              label="Lokasyon"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Örn. Laboratuvar"
            />

            <Field
              label="Sorumlu"
              name="responsible"
              value={form.responsible}
              onChange={handleChange}
              placeholder="Örn. Kalite Departmanı"
            />
          </div>
        </div>

        {/* KALİBRASYON BİLGİLERİ */}

        <div style={cardStyle}>
          <h2 style={titleStyle}>Kalibrasyon Bilgileri</h2>

          <div style={gridStyle}>
            <Field
              label="Son Kalibrasyon Tarihi"
              name="last_calibration_date"
              type="date"
              value={form.last_calibration_date}
              onChange={handleChange}
            />

            <Field
              label="Sonraki Kalibrasyon Tarihi"
              name="next_calibration_date"
              type="date"
              value={form.next_calibration_date}
              onChange={handleChange}
            />

            <Field
              label="Kalibrasyon Periyodu (Ay)"
              name="calibration_period_months"
              type="number"
              value={form.calibration_period_months}
              onChange={handleChange}
            />

            <Field
              label="Sertifika No"
              name="certificate_no"
              value={form.certificate_no}
              onChange={handleChange}
              placeholder="Örn. CAL-2026-001"
            />

            <Field
              label="Kalibrasyon Firması"
              name="supplier"
              value={form.supplier}
              onChange={handleChange}
              placeholder="Örn. XYZ Kalibrasyon"
            />
          </div>
        </div>

        {/* AÇIKLAMA */}

        <div style={cardStyle}>
          <h2 style={titleStyle}>Açıklama</h2>

          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Cihazla ilgili ek açıklamalar..."
            rows={5}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* BUTONLAR */}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              window.location.href = "/kalibrasyon";
            }}
            style={cancelButtonStyle}
          >
            Vazgeç
          </button>

                    <button
            type="button"
            onClick={handleSubmit}
            style={saveButtonStyle}
          >
            Cihazı Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

const cardStyle = {
  background: "white",
  borderRadius: "14px",
  padding: "25px",
  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
  marginBottom: "20px",
};

const titleStyle = {
  marginTop: 0,
  color: "#0f172a",
  fontSize: "18px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontSize: "13px",
  fontWeight: "600",
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  outline: "none",
  fontSize: "14px",
};

const cancelButtonStyle = {
  background: "white",
  color: "#334155",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  padding: "12px 20px",
  fontWeight: "600",
  cursor: "pointer",
};

const saveButtonStyle = {
  background: "#0f172a",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "12px 22px",
  fontWeight: "600",
  cursor: "pointer",
};