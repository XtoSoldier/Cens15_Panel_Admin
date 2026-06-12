import { useState, useEffect, useRef, useCallback } from "react";

import PropTypes from "prop-types";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

import Icon from "@mui/material/Icon";
import certificadoService from "services/certificadoService";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import { Rnd } from "react-rnd";

const FORMATOS = {
  A4: { label: "A4", widthMm: 210, heightMm: 297 },
  Legal: { label: "Legal", widthMm: 216, heightMm: 356 },
  Oficio: { label: "Oficio", widthMm: 216, heightMm: 330 },
};

const VARIABLES = [
  { label: "Fecha actual", value: "{{fecha_actual}}" },
  { label: "Nombre del alumno", value: "{{nombre_alumno}}" },
  { label: "Nro. de documento", value: "{{numero_documento}}" },
  { label: "Curso", value: "{{curso}}" },
  { label: "División", value: "{{division}}" },
  { label: "Año lectivo", value: "{{anio_lectivo}}" },
  { label: "Orientación", value: "{{orientacion}}" },
  { label: "Institución", value: "{{nombre_institucion}}" },
  { label: "Bloque calificaciones", value: "{{BLOQUE_CALIFICACIONES}}" },
];

const SAMPLE_CALIFICACIONES_HTML = `
  <section class="calificaciones-curso">
    <p><strong>Curso:</strong> 1° F Relaciones Humanas Adultos</p>
    <table class="calificaciones-tabla">
      <thead>
        <tr>
          <th>Asignatura</th>
          <th>1er Cuat.</th>
          <th>2do Cuat.</th>
          <th>Pro. Anual</th>
          <th>Ex.Dic</th>
          <th>Ex.Marzo</th>
          <th>Nota Final</th>
          <th>Situación</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="asignatura">Historia y Geografía</td><td>8</td><td>9</td><td>8.5</td><td>-</td><td>-</td><td>-</td><td>Aprobado</td></tr>
        <tr><td class="asignatura">Relaciones Interpersonales</td><td>10</td><td>10</td><td>10</td><td>-</td><td>-</td><td>-</td><td>Aprobado</td></tr>
        <tr><td class="asignatura">Lengua y Literatura</td><td>10</td><td>10</td><td>10</td><td>-</td><td>-</td><td>-</td><td>Aprobado</td></tr>
      </tbody>
    </table>
  </section>
`;

const INFORME_CALIFICACIONES_TEMPLATE = `
  <style>
    .informe-calificaciones { font-family: Courier New, monospace; color: #111; font-size: 11px; }
    .informe-calificaciones .encabezado { text-align: center; line-height: 1.4; }
    .informe-calificaciones .titulo-institucion { font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }
    .informe-calificaciones .separador { border: 0; border-top: 1px solid #111; margin: 10px 0; }
    .informe-calificaciones .titulo-documento { text-align: center; font-weight: 700; margin: 8px 0 24px; }
    .informe-calificaciones .dato-alumno { margin-bottom: 20px; }
    .informe-calificaciones .calificaciones-curso { margin: 0 0 18px; page-break-inside: avoid; }
    .informe-calificaciones .calificaciones-curso p { margin: 0 0 7px; font-weight: 700; }
    .informe-calificaciones table { width: 100%; border-collapse: collapse; font-size: 9px; }
    .informe-calificaciones th { border-bottom: 1px solid #111; font-weight: 700; padding: 3px 4px; }
    .informe-calificaciones td { padding: 3px 4px; text-align: center; }
    .informe-calificaciones td.asignatura { text-align: left; }
    .informe-calificaciones .pie { margin-top: 55px; display: flex; justify-content: space-between; align-items: flex-end; }
    .informe-calificaciones .firma-bloque { width: 38%; text-align: center; }
    .informe-calificaciones .linea-firma { border-top: 1px solid #111; padding-top: 8px; }
    .informe-calificaciones .leyenda { font-size: 9px; }
  </style>
  <div class="informe-calificaciones">
    <div class="encabezado">
      <div class="titulo-institucion">CENTRO EDUCATIVO DE NIVEL SECUNDARIO N° 15</div>
      <div>CUE 9400086/01</div>
      <div>ANEXO ESC. N°41</div>
    </div>

    <hr class="separador" />

    <div class="titulo-documento">INFORME DE CALIFICACIONES - Fecha de Emisión {{fecha_actual}}</div>

    <div class="dato-alumno"><strong>Alumno:</strong> {{nombre_alumno}}</div>

    {{BLOQUE_CALIFICACIONES}}

    <div class="pie">
      <div class="firma-bloque">
        <div class="linea-firma">Sello del establecimiento</div>
      </div>
      <div class="firma-bloque">
        <div class="linea-firma">Firma y Sello Rector/a</div>
      </div>
    </div>
  </div>
`;

const FOOTER_FIRMAS_TEMPLATE = `
  <div style="margin-top: 55px; display: flex; justify-content: space-between; align-items: flex-end; font-family: Courier New, monospace; font-size: 9px;">
    <div style="width: 38%; text-align: center;">
      <div style="border-top: 1px dashed #111; padding-top: 8px;">Sello del establecimiento</div>
    </div>
    <div style="width: 38%; text-align: center;">
      <div style="border-top: 1px dashed #111; padding-top: 8px;">Firma y Sello Rector/a</div>
    </div>
  </div>
`;

const createFooterTextElements = (existingCount = 0, pageHeight = 1131) => [
  {
    id: `txt_sello_${Date.now()}`,
    type: "text",
    text: "Sello del establecimiento",
    x: 95,
    y: pageHeight - 115,
    width: 220,
    height: 42,
    zIndex: existingCount + 1,
  },
  {
    id: `txt_firma_${Date.now()}`,
    type: "text",
    text: "Firma y Sello Rector/a",
    x: 485,
    y: pageHeight - 115,
    width: 220,
    height: 42,
    zIndex: existingCount + 2,
  },
];

const SAMPLE_DATA = {
  "{{fecha_actual}}": "10 de junio de 2026",
  "{{nombre_alumno}}": "García, Juan Martín",
  "{{numero_documento}}": "45.678.901",
  "{{curso}}": "1° A",
  "{{division}}": "1° A",
  "{{anio_lectivo}}": "2026",
  "{{orientacion}}": "Informática",
  "{{nombre_institucion}}": "CENS N° 15",
  "{{BLOQUE_CALIFICACIONES}}": SAMPLE_CALIFICACIONES_HTML,
  "{{bloque_calificaciones}}": SAMPLE_CALIFICACIONES_HTML,
};

const PREVIEW_WIDTH = 800;

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link"],
    ["clean"],
  ],
};

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://localhost:7000/api").replace(
  /\/api\/?$/,
  ""
);

function resolveImgSrc(src) {
  if (!src) return "";
  if (src.startsWith("/")) return `${API_BASE}${src}`;
  return src;
}

function renderPreview(html) {
  if (!html) return "";
  let result = html;
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    result = result.split(key).join(value);
  }
  return result;
}

function PreviewModal({
  open,
  onClose,
  nombre,
  html,
  formato,
  margenSup,
  margenInf,
  margenIzq,
  margenDer,
  imagenes,
}) {
  const fmt = FORMATOS[formato] || FORMATOS.A4;
  const previewHeight = Math.round(PREVIEW_WIDTH * (fmt.heightMm / fmt.widthMm));
  const pxPerMm = PREVIEW_WIDTH / fmt.widthMm;
  const mTop = margenSup * pxPerMm;
  const mBottom = margenInf * pxPerMm;
  const mLeft = margenIzq * pxPerMm;
  const mRight = margenDer * pxPerMm;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { maxHeight: "90vh" } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Vista previa: {nombre}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            position: "relative",
            width: PREVIEW_WIDTH,
            height: previewHeight,
            margin: "0 auto",
            backgroundColor: "#fff",
            boxShadow: "0 0 8px rgba(0,0,0,0.12)",
            overflow: "hidden",
            fontFamily: "Roboto, Arial, sans-serif",
            fontSize: 12,
            lineHeight: 1.5,
            "& img": { maxWidth: "100%" },
            "& table": { width: "100%", borderCollapse: "collapse" },
            "& th, & td": { border: "1px solid #999", padding: "4px", textAlign: "center" },
            "& th": { backgroundColor: "#f0f0f0" },
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: mTop,
              left: mLeft,
              right: mRight,
              bottom: mBottom,
              overflow: "hidden",
            }}
            dangerouslySetInnerHTML={{
              __html: renderPreview(html) || "<p style='color:#999'>Sin contenido</p>",
            }}
          />
          {(imagenes || []).map((img) => {
            const commonSx = {
              position: "absolute",
              left: img.x,
              top: img.y,
              width: img.width,
              height: img.height,
              zIndex: img.zIndex || 1,
              pointerEvents: "none",
            };

            return img.type === "text" ? (
              <Box
                key={img.id}
                sx={{
                  ...commonSx,
                  borderTop: "1px dashed #111",
                  pt: 1,
                  textAlign: "center",
                  fontFamily: "Courier New, monospace",
                  fontSize: 9,
                }}
              >
                {img.text}
              </Box>
            ) : (
              <Box key={img.id} component="img" src={resolveImgSrc(img.src)} sx={commonSx} alt="" />
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MDButton variant="gradient" color="info" onClick={onClose}>
          Cerrar
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

PreviewModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  nombre: PropTypes.string,
  html: PropTypes.string,
  formato: PropTypes.string,
  margenSup: PropTypes.number,
  margenInf: PropTypes.number,
  margenIzq: PropTypes.number,
  margenDer: PropTypes.number,
  imagenes: PropTypes.array,
};

function DeleteModal({ open, onClose, onConfirm, nombre, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Confirmar eliminación</DialogTitle>
      <DialogContent>
        <MDTypography variant="body2">
          {"\u00BFEst\u00E1 seguro de eliminar la plantilla \u0022"}
          {nombre}
          {"\u0022?"}
        </MDTypography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MDButton variant="outlined" color="dark" onClick={onClose} disabled={loading}>
          Cancelar
        </MDButton>
        <MDButton variant="gradient" color="error" onClick={onConfirm} disabled={loading}>
          {loading ? "Eliminando..." : "Eliminar"}
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

DeleteModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  nombre: PropTypes.string,
  loading: PropTypes.bool,
};

function Certificados() {
  const [certificados, setCertificados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("list");
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    contenidoHtml: "",
    formato: "A4",
    margenSuperior: 20,
    margenInferior: 20,
    margenIzquierdo: 25,
    margenDerecho: 25,
    imagenes: [],
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editorTab, setEditorTab] = useState("edit");

  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, loading: false });
  const [previewListModal, setPreviewListModal] = useState({ open: false, item: null });

  const fileInputRef = useRef(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [history, setHistory] = useState([]);

  const fmt = FORMATOS[formData.formato] || FORMATOS.A4;
  const previewHeight = Math.round(PREVIEW_WIDTH * (fmt.heightMm / fmt.widthMm));

  const fetchData = async () => {
    try {
      const data = await certificadoService.getAll();
      setCertificados(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-24), JSON.stringify(formData)]);
  }, [formData]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      try {
        setFormData(JSON.parse(last));
      } catch {}
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    if (view !== "form") return undefined;

    const handleKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      const isTyping = tagName === "input" || tagName === "textarea" || target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }

      if (event.key === "Escape") {
        setSelectedImageId(null);
        return;
      }

      if (!isTyping && selectedImageId && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        removeImage(selectedImageId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, selectedImageId, undo]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleNew = () => {
    setEditingId(null);
    setFormData({
      nombre: "",
      descripcion: "",
      contenidoHtml: "",
      formato: "A4",
      margenSuperior: 20,
      margenInferior: 20,
      margenIzquierdo: 25,
      margenDerecho: 25,
      imagenes: [],
    });
    setFormError("");
    setEditorTab("edit");
    setView("form");
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    let imagenes = [];
    try {
      imagenes = item.imagenesJson ? JSON.parse(item.imagenesJson) : [];
    } catch {}
    setFormData({
      nombre: item.nombre || "",
      descripcion: item.descripcion || "",
      contenidoHtml: item.contenidoHtml || "",
      formato: item.formato || "A4",
      margenSuperior: item.margenSuperior ?? 20,
      margenInferior: item.margenInferior ?? 20,
      margenIzquierdo: item.margenIzquierdo ?? 25,
      margenDerecho: item.margenDerecho ?? 25,
      imagenes,
    });
    setFormError("");
    setEditorTab("edit");
    setView("form");
  };

  const handleCancel = () => {
    setView("list");
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      setFormError("El nombre de la plantilla es obligatorio.");
      return;
    }
    if (!formData.contenidoHtml.trim()) {
      setFormError("El contenido HTML de la plantilla es obligatorio.");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      const payload = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        contenidoHtml: formData.contenidoHtml,
        formato: formData.formato,
        margenSuperior: formData.margenSuperior,
        margenInferior: formData.margenInferior,
        margenIzquierdo: formData.margenIzquierdo,
        margenDerecho: formData.margenDerecho,
        imagenesJson: JSON.stringify(formData.imagenes),
      };
      if (editingId) {
        await certificadoService.update(editingId, payload);
      } else {
        await certificadoService.create(payload);
      }
      setView("list");
      setEditingId(null);
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHtmlChange = (value) => {
    setFormData((prev) => ({ ...prev, contenidoHtml: value }));
  };

  const insertVariable = (varValue) => {
    setFormData((prev) => ({ ...prev, contenidoHtml: prev.contenidoHtml + varValue }));
  };

  const insertFooterFirmas = () => {
    pushHistory();
    setFormData((prev) => ({
      ...prev,
      contenidoHtml: `${prev.contenidoHtml}${FOOTER_FIRMAS_TEMPLATE}`,
    }));
  };

  const insertMovableFooterFirmas = () => {
    pushHistory();
    setFormData((prev) => ({
      ...prev,
      imagenes: [
        ...prev.imagenes,
        ...createFooterTextElements(prev.imagenes.length, previewHeight),
      ],
    }));
    setEditorTab("preview");
  };

  const useInformeCalificacionesTemplate = () => {
    setFormData((prev) => ({
      ...prev,
      nombre: prev.nombre || "Informe de calificaciones",
      descripcion: prev.descripcion || "Plantilla para informe de calificaciones por alumno",
      contenidoHtml: INFORME_CALIFICACIONES_TEMPLATE,
    }));
  };

  const handleOpenDelete = (item) => {
    setDeleteModal({ open: true, item, loading: false });
  };

  const handleCloseDelete = () => {
    setDeleteModal({ open: false, item: null, loading: false });
  };

  const handleConfirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await certificadoService.delete(deleteModal.item.id);
      handleCloseDelete();
      fetchData();
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handlePreviewList = (item) => {
    let imagenes = [];
    try {
      imagenes = item.imagenesJson ? JSON.parse(item.imagenesJson) : [];
    } catch {}
    setPreviewListModal({
      open: true,
      item: { ...item, imagenes },
    });
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const result = await certificadoService.uploadImage(file);
      pushHistory();
      setFormData((prev) => ({
        ...prev,
        imagenes: [
          ...prev.imagenes,
          {
            id: `img_${Date.now()}`,
            src: result.url,
            x: 50,
            y: 50,
            width: 150,
            height: 150,
            zIndex: prev.imagenes.length + 1,
          },
        ],
      }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setUploadingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (imgId) => {
    pushHistory();
    setFormData((prev) => ({
      ...prev,
      imagenes: prev.imagenes.filter((img) => img.id !== imgId),
    }));
    setSelectedImageId((prev) => (prev === imgId ? null : prev));
  };

  const snap = useCallback(
    (value) => (snapToGrid ? Math.round(value / 5) * 5 : value),
    [snapToGrid]
  );

  const updateImagePos = useCallback(
    (imgId, newX, newY) => {
      pushHistory();
      setFormData((prev) => ({
        ...prev,
        imagenes: prev.imagenes.map((img) =>
          img.id === imgId ? { ...img, x: snap(newX), y: snap(newY) } : img
        ),
      }));
    },
    [snap]
  );

  const updateImageSize = useCallback(
    (imgId, newW, newH, newX, newY) => {
      pushHistory();
      setFormData((prev) => ({
        ...prev,
        imagenes: prev.imagenes.map((img) =>
          img.id === imgId
            ? {
                ...img,
                x: snap(newX ?? img.x),
                y: snap(newY ?? img.y),
                width: snap(newW),
                height: snap(newH),
              }
            : img
        ),
      }));
    },
    [snap]
  );

  const selectedImage = formData.imagenes.find((img) => img.id === selectedImageId) || null;

  const updateSelectedImage = (changes) => {
    if (!selectedImageId) return;
    pushHistory();
    setFormData((prev) => ({
      ...prev,
      imagenes: prev.imagenes.map((img) =>
        img.id === selectedImageId ? { ...img, ...changes } : img
      ),
    }));
  };

  const alignSelectedImage = (alignment) => {
    if (!selectedImage) return;
    const contentLeft = mLeft;
    const contentRight = PREVIEW_WIDTH - mRight;
    const contentTop = mTop;
    const contentBottom = previewHeight - mBottom;
    const contentCenterX = contentLeft + (contentRight - contentLeft - selectedImage.width) / 2;

    if (alignment === "left") updateSelectedImage({ x: snap(contentLeft) });
    if (alignment === "center") updateSelectedImage({ x: snap(contentCenterX) });
    if (alignment === "right") updateSelectedImage({ x: snap(contentRight - selectedImage.width) });
    if (alignment === "bottom")
      updateSelectedImage({ y: snap(contentBottom - selectedImage.height) });
    if (alignment === "footer-left")
      updateSelectedImage({
        x: snap(contentLeft + 45),
        y: snap(contentBottom - selectedImage.height - 45),
      });
    if (alignment === "footer-right")
      updateSelectedImage({
        x: snap(contentRight - selectedImage.width - 45),
        y: snap(contentBottom - selectedImage.height - 45),
      });
    if (alignment === "top") updateSelectedImage({ y: snap(contentTop) });
  };

  const pxPerMm = PREVIEW_WIDTH / fmt.widthMm;
  const mTop = formData.margenSuperior * pxPerMm;
  const mBottom = formData.margenInferior * pxPerMm;
  const mLeft = formData.margenIzquierdo * pxPerMm;
  const mRight = formData.margenDerecho * pxPerMm;

  const columns = [
    { Header: "Nombre", accessor: "nombre", align: "left" },
    { Header: "Formato", accessor: "formato", align: "center" },
    { Header: "Descripción", accessor: "descripcion", align: "left" },
    { Header: "Creado", accessor: "createdAt", align: "center" },
    { Header: "Acciones", accessor: "actions", align: "center" },
  ];

  const rows = certificados.map((item) => ({
    nombre: (
      <MDTypography variant="button" fontWeight="medium">
        {item.nombre}
      </MDTypography>
    ),
    formato: (
      <MDTypography variant="caption" fontWeight="medium">
        {item.formato || "A4"}
      </MDTypography>
    ),
    descripcion: (
      <MDTypography variant="caption" color="text.secondary">
        {item.descripcion || "\u2014"}
      </MDTypography>
    ),
    createdAt: (
      <MDTypography variant="caption">
        {item.createdAt ? new Date(item.createdAt).toLocaleDateString("es-AR") : "\u2014"}
      </MDTypography>
    ),
    actions: (
      <MDBox display="flex" gap={0.5} justifyContent="center">
        <Tooltip title="Editar" arrow>
          <MDButton variant="text" color="dark" size="small" onClick={() => handleEdit(item)}>
            <Icon>edit</Icon>
          </MDButton>
        </Tooltip>
        <Tooltip title="Vista previa" arrow>
          <MDButton
            variant="text"
            color="info"
            size="small"
            onClick={() => handlePreviewList(item)}
          >
            <Icon>visibility</Icon>
          </MDButton>
        </Tooltip>
        <Tooltip title="Eliminar" arrow>
          <MDButton
            variant="text"
            color="error"
            size="small"
            onClick={() => handleOpenDelete(item)}
          >
            <Icon>delete</Icon>
          </MDButton>
        </Tooltip>
      </MDBox>
    ),
  }));

  if (view === "form") {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox pt={6} pb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={7} xl={8}>
              <Card sx={{ mb: 3 }}>
                <MDBox
                  mx={2}
                  mt={-3}
                  py={3}
                  px={2}
                  variant="gradient"
                  bgColor="info"
                  borderRadius="lg"
                  coloredShadow="info"
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <MDTypography variant="h6" color="white">
                    {editingId ? "Editar Plantilla" : "Nueva Plantilla"}
                  </MDTypography>
                  <MDButton variant="outlined" color="white" size="small" onClick={handleCancel}>
                    <Icon sx={{ mr: 0.5 }}>arrow_back</Icon>Volver
                  </MDButton>
                </MDBox>
                <MDBox pt={3} px={3}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <MDInput
                        label="Nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        fullWidth
                        disabled={saving}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <MDInput
                        label="Descripción (opcional)"
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleChange}
                        fullWidth
                        disabled={saving}
                      />
                    </Grid>
                  </Grid>

                  <MDBox mt={3} mb={2} p={2} bgColor="#f8f9fa" borderRadius="md">
                    <MDTypography variant="caption" fontWeight="bold" display="block" mb={1}>
                      Configuración de página
                    </MDTypography>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Formato</InputLabel>
                          <Select
                            name="formato"
                            value={formData.formato}
                            label="Formato"
                            onChange={handleChange}
                            disabled={saving}
                          >
                            {Object.entries(FORMATOS).map(([key, f]) => (
                              <MenuItem key={key} value={key}>
                                {f.label} ({f.widthMm}\u00D7{f.heightMm} mm)
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <MDInput
                          label="Sup. mm"
                          name="margenSuperior"
                          type="number"
                          value={formData.margenSuperior}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, margenSuperior: Number(e.target.value) }))
                          }
                          fullWidth
                          disabled={saving}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <MDInput
                          label="Inf. mm"
                          name="margenInferior"
                          type="number"
                          value={formData.margenInferior}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, margenInferior: Number(e.target.value) }))
                          }
                          fullWidth
                          disabled={saving}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <MDInput
                          label="Izq. mm"
                          name="margenIzquierdo"
                          type="number"
                          value={formData.margenIzquierdo}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, margenIzquierdo: Number(e.target.value) }))
                          }
                          fullWidth
                          disabled={saving}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <MDInput
                          label="Der. mm"
                          name="margenDerecho"
                          type="number"
                          value={formData.margenDerecho}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, margenDerecho: Number(e.target.value) }))
                          }
                          fullWidth
                          disabled={saving}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </MDBox>

                  <MDBox mb={2} p={2} bgColor="#f8f9fa" borderRadius="md">
                    <MDTypography variant="caption" fontWeight="bold" display="block" mb={1}>
                      Imágenes
                    </MDTypography>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleUploadImage}
                    />
                    <MDBox display="flex" flexWrap="wrap" gap={1} mb={1}>
                      {formData.imagenes.map((img) => (
                        <Paper
                          key={img.id}
                          sx={{
                            p: 0.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            border:
                              selectedImageId === img.id
                                ? "1px solid #1F5FAF"
                                : "1px solid transparent",
                          }}
                          onClick={() => setSelectedImageId(img.id)}
                        >
                          {img.type === "text" ? (
                            <Box
                              sx={{
                                width: 80,
                                height: 48,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderTop: "1px dashed #111",
                                fontSize: 10,
                                textAlign: "center",
                              }}
                            >
                              {img.text}
                            </Box>
                          ) : (
                            <Box
                              component="img"
                              src={resolveImgSrc(img.src)}
                              sx={{ width: 48, height: 48, objectFit: "cover", borderRadius: 1 }}
                              alt=""
                            />
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeImage(img.id)}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Paper>
                      ))}
                      <MDButton
                        variant="outlined"
                        color="info"
                        size="small"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={saving || uploadingImg}
                      >
                        {uploadingImg ? "Subiendo..." : "+ Agregar imagen"}
                      </MDButton>
                      <MDButton
                        variant="outlined"
                        color="dark"
                        size="small"
                        onClick={insertMovableFooterFirmas}
                        disabled={saving}
                      >
                        + Pie móvil
                      </MDButton>
                    </MDBox>
                    {formData.imagenes.length > 0 && (
                      <MDTypography variant="caption" color="text.secondary">
                        Arrastre y redimensione las imágenes en la vista previa. Haga clic en una
                        imagen para seleccionarla.
                      </MDTypography>
                    )}
                    {formData.imagenes.length > 0 && (
                      <MDBox mt={2}>
                        <MDBox
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          mb={1}
                        >
                          <MDTypography variant="caption" fontWeight="bold">
                            Herramientas de alineación
                          </MDTypography>
                          <Chip
                            label={snapToGrid ? "Snap 5px activado" : "Snap desactivado"}
                            size="small"
                            color={snapToGrid ? "info" : "default"}
                            variant="outlined"
                            onClick={() => setSnapToGrid((prev) => !prev)}
                            sx={{ cursor: "pointer" }}
                          />
                        </MDBox>
                        <MDTypography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          mb={1}
                        >
                          {selectedImage
                            ? `Seleccionada: ${Math.round(selectedImage.width)}×${Math.round(
                                selectedImage.height
                              )}px en (${Math.round(selectedImage.x)}, ${Math.round(
                                selectedImage.y
                              )})`
                            : "Seleccione una imagen en la vista previa para alinear."}
                        </MDTypography>
                        <MDBox display="flex" flexWrap="wrap" gap={0.75} mb={1}>
                          <MDButton
                            variant="outlined"
                            color="dark"
                            size="small"
                            disabled={!selectedImage}
                            onClick={() => alignSelectedImage("left")}
                          >
                            Izq.
                          </MDButton>
                          <MDButton
                            variant="outlined"
                            color="dark"
                            size="small"
                            disabled={!selectedImage}
                            onClick={() => alignSelectedImage("center")}
                          >
                            Centro
                          </MDButton>
                          <MDButton
                            variant="outlined"
                            color="dark"
                            size="small"
                            disabled={!selectedImage}
                            onClick={() => alignSelectedImage("right")}
                          >
                            Der.
                          </MDButton>
                          <MDButton
                            variant="outlined"
                            color="dark"
                            size="small"
                            disabled={!selectedImage}
                            onClick={() => alignSelectedImage("top")}
                          >
                            Arriba
                          </MDButton>
                          <MDButton
                            variant="outlined"
                            color="dark"
                            size="small"
                            disabled={!selectedImage}
                            onClick={() => alignSelectedImage("bottom")}
                          >
                            Abajo
                          </MDButton>
                          <MDButton
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={!selectedImage}
                            onClick={() => removeImage(selectedImageId)}
                          >
                            Quitar
                          </MDButton>
                          <MDButton
                            variant="outlined"
                            color="dark"
                            size="small"
                            disabled={history.length === 0}
                            onClick={undo}
                          >
                            Deshacer
                          </MDButton>
                        </MDBox>
                        <MDBox display="flex" flexWrap="wrap" gap={0.75} mb={1}>
                          <MDButton
                            variant="outlined"
                            color="info"
                            size="small"
                            disabled={!selectedImage}
                            onClick={() => alignSelectedImage("footer-left")}
                          >
                            Pie izq.
                          </MDButton>
                          <MDButton
                            variant="outlined"
                            color="info"
                            size="small"
                            disabled={!selectedImage}
                            onClick={() => alignSelectedImage("footer-right")}
                          >
                            Pie der.
                          </MDButton>
                        </MDBox>
                        {selectedImage && (
                          <Grid container spacing={1}>
                            {selectedImage.type === "text" && (
                              <Grid item xs={12}>
                                <MDInput
                                  label="Texto"
                                  size="small"
                                  value={selectedImage.text || ""}
                                  onChange={(e) => updateSelectedImage({ text: e.target.value })}
                                  fullWidth
                                />
                              </Grid>
                            )}
                            <Grid item xs={6} sm={3}>
                              <MDInput
                                label="X"
                                type="number"
                                size="small"
                                value={Math.round(selectedImage.x)}
                                onChange={(e) => updateSelectedImage({ x: Number(e.target.value) })}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <MDInput
                                label="Y"
                                type="number"
                                size="small"
                                value={Math.round(selectedImage.y)}
                                onChange={(e) => updateSelectedImage({ y: Number(e.target.value) })}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <MDInput
                                label="Ancho"
                                type="number"
                                size="small"
                                value={Math.round(selectedImage.width)}
                                onChange={(e) =>
                                  updateSelectedImage({ width: Number(e.target.value) })
                                }
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <MDInput
                                label="Alto"
                                type="number"
                                size="small"
                                value={Math.round(selectedImage.height)}
                                onChange={(e) =>
                                  updateSelectedImage({ height: Number(e.target.value) })
                                }
                                fullWidth
                              />
                            </Grid>
                          </Grid>
                        )}
                      </MDBox>
                    )}
                  </MDBox>

                  <MDBox mb={2}>
                    <MDTypography variant="caption" fontWeight="medium" display="block" mb={1}>
                      Variables disponibles (clic para insertar)
                    </MDTypography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {VARIABLES.map((v) => (
                        <Chip
                          key={v.value}
                          label={v.label}
                          size="small"
                          color="info"
                          variant="outlined"
                          onClick={() => insertVariable(v.value)}
                          disabled={saving}
                          sx={{ cursor: "pointer" }}
                        />
                      ))}
                    </Box>
                    <MDBox mt={1}>
                      <MDButton
                        variant="outlined"
                        color="info"
                        size="small"
                        onClick={useInformeCalificacionesTemplate}
                        disabled={saving}
                      >
                        Usar modelo de informe de calificaciones
                      </MDButton>
                      <MDButton
                        variant="outlined"
                        color="dark"
                        size="small"
                        onClick={insertFooterFirmas}
                        disabled={saving}
                        sx={{ ml: 1 }}
                      >
                        Insertar pie de firmas
                      </MDButton>
                    </MDBox>
                  </MDBox>

                  <MDBox mb={2} display="flex" justifyContent="center">
                    <ToggleButtonGroup
                      value={editorTab}
                      exclusive
                      onChange={(e, val) => val && setEditorTab(val)}
                      size="small"
                    >
                      <ToggleButton value="edit">
                        <Icon sx={{ mr: 0.5, fontSize: 18 }}>edit</Icon>Editor
                      </ToggleButton>
                      <ToggleButton value="preview">
                        <Icon sx={{ mr: 0.5, fontSize: 18 }}>visibility</Icon>Vista previa
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </MDBox>

                  <MDBox mb={2}>
                    {editorTab === "preview" ? (
                      <Box sx={{ overflowX: "auto", py: 2 }}>
                        <Box
                          id="cert-preview-canvas"
                          sx={{
                            position: "relative",
                            width: PREVIEW_WIDTH,
                            height: previewHeight,
                            margin: "0 auto",
                            backgroundColor: "#fff",
                            backgroundImage: snapToGrid
                              ? "linear-gradient(rgba(31,95,175,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(31,95,175,0.08) 1px, transparent 1px)"
                              : "none",
                            backgroundSize: snapToGrid ? "20px 20px" : "auto",
                            boxShadow: "0 0 8px rgba(0,0,0,0.12)",
                            overflow: "hidden",
                            fontFamily: "Roboto, Arial, sans-serif",
                            fontSize: 12,
                            lineHeight: 1.5,
                            "& img": { maxWidth: "100%" },
                            "& table": { width: "100%", borderCollapse: "collapse" },
                            "& th, & td": {
                              border: "1px solid #999",
                              padding: "4px",
                              textAlign: "center",
                            },
                            "& th": { backgroundColor: "#f0f0f0" },
                          }}
                        >
                          <Box
                            sx={{
                              position: "absolute",
                              top: mTop,
                              left: mLeft,
                              right: mRight,
                              bottom: mBottom,
                              overflow: "hidden",
                            }}
                            dangerouslySetInnerHTML={{
                              __html:
                                renderPreview(formData.contenidoHtml) ||
                                "<p style='color:#999'>Sin contenido</p>",
                            }}
                          />
                          {formData.imagenes.map((img) => (
                            <Rnd
                              key={img.id}
                              bounds="#cert-preview-canvas"
                              position={{ x: img.x, y: img.y }}
                              size={{ width: img.width, height: img.height }}
                              onDragStop={(e, d) => updateImagePos(img.id, d.x, d.y)}
                              onMouseDown={() => setSelectedImageId(img.id)}
                              onResizeStop={(e, dir, ref, delta, position) => {
                                updateImageSize(
                                  img.id,
                                  parseInt(ref.style.width),
                                  parseInt(ref.style.height),
                                  position.x,
                                  position.y
                                );
                              }}
                              enableResizing={{
                                top: true,
                                right: true,
                                bottom: true,
                                left: true,
                                topRight: true,
                                bottomRight: true,
                                bottomLeft: true,
                                topLeft: true,
                              }}
                              style={{
                                zIndex: img.zIndex || 1,
                                outline:
                                  selectedImageId === img.id
                                    ? "2px solid #1F5FAF"
                                    : "1px dashed rgba(31,95,175,0.35)",
                                backgroundColor:
                                  selectedImageId === img.id
                                    ? "rgba(31,95,175,0.06)"
                                    : "transparent",
                              }}
                            >
                              {img.type === "text" ? (
                                <Box
                                  sx={{
                                    width: "100%",
                                    height: "100%",
                                    borderTop: "1px dashed #111",
                                    pt: 1,
                                    cursor: "move",
                                    textAlign: "center",
                                    fontFamily: "Courier New, monospace",
                                    fontSize: 9,
                                    color: "#111",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "center",
                                  }}
                                >
                                  {img.text}
                                </Box>
                              ) : (
                                <Box
                                  component="img"
                                  src={resolveImgSrc(img.src)}
                                  sx={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                    cursor: "move",
                                  }}
                                  alt=""
                                  draggable={false}
                                />
                              )}
                            </Rnd>
                          ))}
                        </Box>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          "& .quill": {
                            "& .ql-editor": {
                              minHeight: 400,
                              fontSize: 14,
                              fontFamily: "Roboto, sans-serif",
                            },
                            "& .ql-toolbar": {
                              borderRadius: "4px 4px 0 0",
                              borderColor: "#ced4da",
                            },
                            "& .ql-container": {
                              borderRadius: "0 0 4px 4px",
                              borderColor: "#ced4da",
                            },
                          },
                        }}
                      >
                        <ReactQuill
                          theme="snow"
                          value={formData.contenidoHtml}
                          onChange={handleHtmlChange}
                          modules={quillModules}
                          readOnly={saving}
                        />
                      </Box>
                    )}
                  </MDBox>

                  {formError && (
                    <MDBox mb={2}>
                      <MDTypography variant="body2" color="error">
                        {formError}
                      </MDTypography>
                    </MDBox>
                  )}

                  <MDBox display="flex" gap={1} justifyContent="flex-end" pb={3}>
                    <MDButton
                      variant="outlined"
                      color="dark"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancelar
                    </MDButton>
                    <MDButton
                      variant="gradient"
                      color="info"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? "Guardando..." : "Guardar Plantilla"}
                    </MDButton>
                  </MDBox>
                </MDBox>
              </Card>
            </Grid>

            <Grid item xs={12} lg={5} xl={4}>
              <Card>
                <MDBox
                  mx={2}
                  mt={-3}
                  py={3}
                  px={2}
                  variant="gradient"
                  bgColor="info"
                  borderRadius="lg"
                  coloredShadow="info"
                >
                  <MDTypography variant="h6" color="white">
                    Información
                  </MDTypography>
                </MDBox>
                <MDBox p={3}>
                  <MDTypography variant="caption" fontWeight="bold" display="block" mb={1}>
                    Medidas de página
                  </MDTypography>
                  {Object.entries(FORMATOS).map(([key, f]) => (
                    <MDBox key={key} mb={0.5}>
                      <MDTypography
                        variant="caption"
                        color={formData.formato === key ? "info" : "text.secondary"}
                        fontWeight={formData.formato === key ? "bold" : "regular"}
                      >
                        {f.label}: {f.widthMm} × {f.heightMm} mm
                      </MDTypography>
                    </MDBox>
                  ))}
                  <Divider />
                  <MDTypography variant="caption" fontWeight="bold" display="block" mb={1}>
                    Márgenes actuales
                  </MDTypography>
                  <MDTypography variant="caption" display="block">
                    Superior: {formData.margenSuperior} mm
                  </MDTypography>
                  <MDTypography variant="caption" display="block">
                    Inferior: {formData.margenInferior} mm
                  </MDTypography>
                  <MDTypography variant="caption" display="block">
                    Izquierdo: {formData.margenIzquierdo} mm
                  </MDTypography>
                  <MDTypography variant="caption" display="block">
                    Derecho: {formData.margenDerecho} mm
                  </MDTypography>
                  <Divider />
                  <MDTypography variant="caption" fontWeight="bold" display="block" mb={1}>
                    Imágenes
                  </MDTypography>
                  <MDTypography variant="caption" display="block">
                    {formData.imagenes.length} imagen(es) agregada(s)
                  </MDTypography>
                  {formData.imagenes.map((img, i) => (
                    <MDTypography
                      key={img.id}
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      #{i + 1}: {Math.round(img.width)}×{Math.round(img.height)}px en (
                      {Math.round(img.x)},{Math.round(img.y)})
                    </MDTypography>
                  ))}
                </MDBox>
              </Card>
            </Grid>
          </Grid>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <MDTypography variant="h6" color="white">
                  Plantillas de Certificados
                </MDTypography>
                <MDButton variant="outlined" color="white" size="small" onClick={handleNew}>
                  + Nueva Plantilla
                </MDButton>
              </MDBox>
              <MDBox pt={3} px={2}>
                {loading ? (
                  <MDBox display="flex" justifyContent="center" py={6}>
                    <CircularProgress color="info" />
                  </MDBox>
                ) : error ? (
                  <MDBox py={4} textAlign="center">
                    <MDTypography variant="body1" color="error">
                      Error al cargar plantillas: {error}
                    </MDTypography>
                  </MDBox>
                ) : (
                  <DataTable
                    table={{ columns, rows }}
                    isSorted={false}
                    entriesPerPage={{ defaultValue: 10 }}
                    showTotalEntries
                    noEndBorder
                  />
                )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
      <PreviewModal
        open={previewListModal.open}
        onClose={() => setPreviewListModal({ open: false, item: null })}
        nombre={previewListModal.item?.nombre}
        html={previewListModal.item?.contenidoHtml}
        formato={previewListModal.item?.formato}
        margenSup={previewListModal.item?.margenSuperior ?? 20}
        margenInf={previewListModal.item?.margenInferior ?? 20}
        margenIzq={previewListModal.item?.margenIzquierdo ?? 25}
        margenDer={previewListModal.item?.margenDerecho ?? 25}
        imagenes={previewListModal.item?.imagenes}
      />
      <DeleteModal
        open={deleteModal.open}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        nombre={deleteModal.item?.nombre}
        loading={deleteModal.loading}
      />
    </DashboardLayout>
  );
}

export default Certificados;
