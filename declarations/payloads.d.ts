
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