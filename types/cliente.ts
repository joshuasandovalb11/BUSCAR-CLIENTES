export interface Sucursal {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  numeroSucursal: string;
  nombreSucursal: string;
}

export interface ClienteResponse {
  message?: string;
  id: string;
  nombre: string;
  latitud?: number;
  longitud?: number;
  vendedorNombre?: string;
  vendedorTelefono?: string | null;
  multipleSucursales?: boolean;
  sucursales?: Sucursal[];
}
