
export interface Vehiculo {
    id: number;
    patente: string;
    marca: string;
    modelo: string;
    latitud: number;
    longitud: number;
    altitud: number;
    velocidad: number;
    heading: number;
    timestamp: string;
    equipoID: number;
}

export interface Beacon {
    id: number;
    mac: string;
    bateria: string;
}

export interface Empleado {
    id: number;
    fullName: string;
    rut: string;
    email: string;
    celular: string;
    equipoID: number;
    fechaIngreso: string;
}

export interface Supervisor {
    id: number;
    fullName: string;
    rut: string;
    email: string;
    celular: string;
    equipoID: number;
}

export interface Equipo {
    id: number;
    nombre: string;
    supervisorID: number;
    vehiculoID: number;
    supervisor?: Supervisor;
    vehiculo?: Vehiculo;
}

export type Punto = {
    lat: number;
    lng: number;
}

export interface Zona {
    id: number;
    name: string;
    coordinates: Punto[],
    lastVisited: string;
    info: string;
    beaconID: number;
}

export interface Registro {
    id: number;
    fecha: string; //Fecha en formato DD-MM-YYYY
    id_zona: number;
    hora_llegada: string; //Hora en formato HH:mm
    hora_salida: string; // Hora en formato HH:mm
    supervisor_id: number;
}

export interface responsePayload<X> {
    message: string;
    data?: X;
    error: boolean;
}

export interface checkMACReqBody {
    mac: string;
}

export interface SignInPayload {
    rut: string;
    patente: string;
}

export interface Record {
    id: number;
    fecha: string;
    id_zona: number;
    hora_llegada: string;
    hora_salida: string;
    supervisor_id: number;
}

export interface VisitFormData {
    id: number;
    fecha: string;
    zona_id: number | null;
    supervisor_id: number;
    supervisor?: Supervisor | null;
    zona?: Zona | null;
    comentarios: string;
    requiere_corte_cesped: boolean;
    hay_gente_acampando: boolean;
    mobiliario_danado: boolean;
    nivel_de_basura: NIVEL_DE_BASURA;
    foto: string | null;
    orderID: number | null;
}

export enum NIVEL_DE_BASURA {
    BAJO = "BAJO",
    MEDIO = "MEDIO",
    ALTO = "ALTO"
}

export interface SuperForm {
    id: number;
    description: string | null;
    pictureUrl: string;
    workOrderID: number | null;
    workOrder: WorkOrder | null;
    lat: number;
    lng: number;
}

export type WorkOrderType = "Areas verdes" | "Emergencias" | "Obras publicas" | string;

export interface WorkOrder {
    id: number;
    titulo?: string | null;
    descripcion?: string | null;
    estado?: string | null;
    prioridad?: string | null;
    creada_en: string | Date | null;
    completada?: boolean | null;
    completada_en: string | Date | null;
    equipoID: number | null;
    equipo?: Equipo | null;
    visitFormID: number | null;
    visitForm?: VisitFormData | null;
    tipo?: WorkOrderType | null;
    zonaID?: number | null;
    zona?: Zona | null;
    superFormID: number | null;
    superForm: SuperForm | null;
    lat: number | null;
    lng: number | null;
    reference?: string;
}