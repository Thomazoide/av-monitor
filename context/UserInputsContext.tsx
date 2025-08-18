import React, { createContext, ReactNode, useContext, useState } from 'react';

type UserInputsContextType = {
  patente: string;
  rut: string;
  setPatente: (value: string) => void;
  setRut: (value: string) => void;
};

const UserInputsContext = createContext<UserInputsContextType | undefined>(undefined);

export function UserInputsProvider({ children }: { children: ReactNode }) {
  const [patente, setPatente] = useState('');
  const [rut, setRut] = useState('');

  return (
    <UserInputsContext.Provider value={{ patente, rut, setPatente, setRut }}>
      {children}
    </UserInputsContext.Provider>
  );
}

export function useUserInputs() {
  const ctx = useContext(UserInputsContext);
  if (!ctx) throw new Error('useUserInputs must be used within UserInputsProvider');
  return ctx;
}
