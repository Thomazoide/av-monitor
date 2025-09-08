import { backendURL } from '@/constants/Endpoints';
import { Equipo, Supervisor, Vehiculo } from '@/declarations/payloads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useState } from 'react';

type UserInputsContextType = {
  patente: string;
  rut: string;
  setPatente: (value: string) => void;
  setRut: (value: string) => void;
  loading: boolean;
  error: string | null;
  supervisor?: Partial<Supervisor>;
  vehicle?: Partial<Vehiculo>;
  team?: Equipo;
  signIn: (rut: string, patente: string) => Promise<boolean>;
};

const UserInputsContext = createContext<UserInputsContextType | undefined>(undefined);

export function UserInputsProvider({ children }: { children: ReactNode }) {
  const [patente, setPatente] = useState('');
  const [rut, setRut] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supervisor, setSupervisor] = useState<Partial<Supervisor> | undefined>();
  const [vehicle, setVehicle] = useState<Partial<Vehiculo> | undefined>();
  const [team, setTeam] = useState<Equipo | undefined>();

  async function signIn(rutInput: string, patenteInput: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendURL}equipos/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut: rutInput, patente: patenteInput }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(`Error ${res.status}: ${txt}`);
        setLoading(false);
        return false;
      }
      const data = await res.json();
      if (data?.data) {
        const d: Equipo = data.data;
        setTeam({ id: d.id, nombre: d.nombre, supervisorID: d.supervisorID, vehiculoID: d.vehiculoID });
        if (d.supervisor) {
          setSupervisor({
            id: d.supervisor.id,
            fullName: d.supervisor.fullName,
            rut: d.supervisor.rut,
            email: d.supervisor.email,
            celular: d.supervisor.celular
          });
        }
        if (d.vehiculo) {
          const vehData: Partial<Vehiculo> = {
            id: d.vehiculo.id,
            patente: d.vehiculo.patente?.toUpperCase?.() || d.vehiculo.patente,
            marca: d.vehiculo.marca,
            modelo: d.vehiculo.modelo,
          };
          setVehicle(vehData);
          try { await AsyncStorage.setItem('vehicleInfo', JSON.stringify(vehData)); } catch {}
        }
        setPatente(patenteInput.toUpperCase());
        setRut(rutInput);
        setLoading(false);
        return true;
      }
      setError('Respuesta inválida del servidor');
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
    return false;
  }

  return (
    <UserInputsContext.Provider value={{ patente, rut, setPatente, setRut, loading, error, supervisor, vehicle, team, signIn }}>
      {children}
    </UserInputsContext.Provider>
  );
}

export function useUserInputs() {
  const ctx = useContext(UserInputsContext);
  if (!ctx) throw new Error('useUserInputs must be used within UserInputsProvider');
  return ctx;
}
